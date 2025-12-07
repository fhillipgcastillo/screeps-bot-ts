# Plan B: Prepare Phase 3 Task Queue Architecture

## Overview

Phase 3 is the architectural foundation for phases 3–5. It requires refactoring `GameManager` from **reactive** (spawn → execute per tick) to **queue-driven** (plan → queue → execute). This is a major architectural change that must be done carefully to maintain existing functionality.

**Current Architecture (Reactive):**
```
tick() → spawn → execute all creeps
```

**New Architecture (Queue-Driven):**
```
tick() → planPhase() → queuePhase() → executePhase()
```

**Impact:**
- Enables persistent task tracking (for forecasting, visibility)
- Allows dynamic priority adjustment (Phase 4)
- Foundation for strategy switching (Phase 4)
- Enables squad coordination (Phase 5)

## Problem Statement

**Current Limitations:**
- All decisions are synchronous (spawn now, execute now)
- No task persistence; no way to know what spawns are pending
- No way to adjust priorities dynamically
- Difficult to forecast or visualize pending work
- Reactive: creeps decide what to do each tick; no planning

**Desired State:**
- Tasks queue up with priority and status tracking
- UI shows pending spawns with ETAs
- Dynamic modifiers can boost priority (e.g., room danger)
- Forecasting: "next 5 spawns will take X ticks"
- Planning layer separates from execution layer

**Why This Matters:**
- Phase 4 strategy switching will change task priorities dynamically
- Phase 5 squads need coordinated task execution
- Visibility: operators can see what bot plans to do next

## Implementation Approach

### Stage 1: Create Task Queue Infrastructure

**Goal:** Build the queue system without changing GameManager yet.

#### Step 1.1: Create Task Interfaces

**File:** `src/types.ts`

**Add to end of file:**
```typescript
// ============================================================================
// TASK QUEUE TYPES
// ============================================================================

/**
 * Task status enum
 */
export enum TaskStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

/**
 * Task priority enum (base priority, before dynamic modifiers)
 */
export enum TaskPriority {
  CRITICAL = 4,
  HIGH = 3,
  NORMAL = 2,
  LOW = 1,
}

/**
 * Task types
 */
export enum TaskType {
  SPAWN = "SPAWN",
  BUILD = "BUILD",
  HAUL = "HAUL",
  UPGRADE = "UPGRADE",
  SCOUT = "SCOUT",
  DEFEND = "DEFEND",
}

/**
 * Base task interface
 */
export interface BaseTask {
  id: string; // Unique identifier (uuid or Game.time-based)
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: number; // Game.time
  startedAt?: number;
  completedAt?: number;
  failureReason?: string;
}

/**
 * Spawn task interface
 */
export interface SpawnTask extends BaseTask {
  type: TaskType.SPAWN;
  data: {
    role: CreepRole;
    body: BodyPartConstant[];
    spawnName: string;
    energyRequired: number;
    retryCount: number;
  };
}

/**
 * Build task interface
 */
export interface BuildTask extends BaseTask {
  type: TaskType.BUILD;
  data: {
    constructionSiteId: Id<ConstructionSite>;
    priority: "wall" | "rampart" | "extension" | "road" | "storage";
    targetEnergy: number; // Target energy to spend
  };
}

/**
 * Haul task interface
 */
export interface HaulTask extends BaseTask {
  type: TaskType.HAUL;
  data: {
    resourceId: Id<Resource | Structure | Tombstone | Ruin>;
    destinationId: Id<Structure>;
    amount: number;
    resourceType: ResourceConstant;
  };
}

/**
 * Upgrade task interface
 */
export interface UpgradeTask extends BaseTask {
  type: TaskType.UPGRADE;
  data: {
    controllerId: Id<StructureController>;
    targetLevel: number;
    targetEnergy: number;
  };
}

/**
 * Task priority modifier
 */
export interface TaskPriorityModifier {
  reason: string; // "high room danger", "container full", etc.
  modifier: number; // -1, 0, +1, +2, etc.
}

/**
 * Union type for all task types
 */
export type Task = SpawnTask | BuildTask | HaulTask | UpgradeTask;

/**
 * Task queue configuration
 */
export interface TaskQueueConfig {
  maxQueueSize: number; // Hard limit on queue size
  priorityBuckets: Map<TaskPriority, Task[]>; // Tasks grouped by priority
  maxRetries: number; // Max retries before failing task
  taskTimeout: number; // Ticks before task auto-fails
}
```

#### Step 1.2: Create Task Queue Service

**File:** `src/utils/taskQueue.ts` (NEW)

**Purpose:**
- Manage task queue with priority buckets
- Track task status and execution
- Apply dynamic priority modifiers
- Provide queue statistics for UI

**Implementation:**
```typescript
import { Task, TaskStatus, TaskPriority, TaskType, TaskPriorityModifier, TaskQueueConfig } from "../types";
import { logger, debugLog } from "./Logger";

/**
 * Task queue service
 * Manages persistent task queue with priority-based execution
 */
export class TaskQueue {
  private queue: Map<string, Task> = new Map();
  private priorityBuckets: Map<TaskPriority, string[]> = new Map();
  private config: TaskQueueConfig;

  constructor(config?: Partial<TaskQueueConfig>) {
    this.config = {
      maxQueueSize: config?.maxQueueSize ?? 100,
      priorityBuckets: new Map(),
      maxRetries: config?.maxRetries ?? 3,
      taskTimeout: config?.taskTimeout ?? 500,
    };

    // Initialize priority buckets
    for (const priority in TaskPriority) {
      if (typeof priority === "string") {
        this.priorityBuckets.set(TaskPriority[priority as keyof typeof TaskPriority], []);
      }
    }
  }

  /**
   * Enqueue a task
   */
  public enqueue(task: Task): boolean {
    if (this.queue.size >= this.config.maxQueueSize) {
      logger.warn(`Task queue full (${this.queue.size}/${this.config.maxQueueSize}); dropping low-priority task`);
      return false;
    }

    this.queue.set(task.id, task);
    this.priorityBuckets.get(task.priority)!.push(task.id);

    debugLog.debug(`Task ${task.id} (${task.type}) enqueued with priority ${task.priority}`);
    return true;
  }

  /**
   * Dequeue next highest-priority task
   */
  public dequeue(): Task | null {
    // Start with CRITICAL, work down to LOW
    for (let p = TaskPriority.CRITICAL; p >= TaskPriority.LOW; p--) {
      const bucket = this.priorityBuckets.get(p);
      if (bucket && bucket.length > 0) {
        const taskId = bucket.shift()!;
        const task = this.queue.get(taskId);

        if (task) {
          task.status = TaskStatus.IN_PROGRESS;
          task.startedAt = Game.time;
          return task;
        }
      }
    }

    return null;
  }

  /**
   * Mark task as completed
   */
  public completeTask(taskId: string): void {
    const task = this.queue.get(taskId);
    if (task) {
      task.status = TaskStatus.COMPLETED;
      task.completedAt = Game.time;
      this.queue.delete(taskId);
      debugLog.debug(`Task ${taskId} completed`);
    }
  }

  /**
   * Mark task as failed
   */
  public failTask(taskId: string, reason: string): void {
    const task = this.queue.get(taskId);
    if (task) {
      task.status = TaskStatus.FAILED;
      task.failureReason = reason;
      task.completedAt = Game.time;

      // Retry logic: requeue if retries < max
      if ((task.data as any).retryCount < this.config.maxRetries) {
        (task.data as any).retryCount++;
        task.status = TaskStatus.PENDING;
        task.startedAt = undefined;
        this.priorityBuckets.get(task.priority)!.push(taskId);
        logger.warn(`Task ${taskId} failed: ${reason}; retry ${(task.data as any).retryCount}/${this.config.maxRetries}`);
      } else {
        this.queue.delete(taskId);
        logger.error(`Task ${taskId} failed permanently: ${reason}`);
      }
    }
  }

  /**
   * Cancel a task
   */
  public cancelTask(taskId: string): void {
    const task = this.queue.get(taskId);
    if (task) {
      task.status = TaskStatus.CANCELLED;
      task.completedAt = Game.time;
      this.queue.delete(taskId);
      debugLog.debug(`Task ${taskId} cancelled`);
    }
  }

  /**
   * Get all pending tasks
   */
  public getPendingTasks(): Task[] {
    return Array.from(this.queue.values()).filter(t => t.status === TaskStatus.PENDING);
  }

  /**
   * Get queue statistics
   */
  public getStats(): {
    totalTasks: number;
    byStatus: Record<TaskStatus, number>;
    byType: Record<TaskType, number>;
    byPriority: Record<TaskPriority, number>;
    oldestTask?: { id: string; age: number };
  } {
    const stats = {
      totalTasks: this.queue.size,
      byStatus: {} as Record<TaskStatus, number>,
      byType: {} as Record<TaskType, number>,
      byPriority: {} as Record<TaskPriority, number>,
    };

    for (const task of this.queue.values()) {
      stats.byStatus[task.status] = (stats.byStatus[task.status] ?? 0) + 1;
      stats.byType[task.type] = (stats.byType[task.type] ?? 0) + 1;
      stats.byPriority[task.priority] = (stats.byPriority[task.priority] ?? 0) + 1;
    }

    // Find oldest task
    let oldestTask: Task | undefined;
    for (const task of this.queue.values()) {
      if (!oldestTask || task.createdAt < oldestTask.createdAt) {
        oldestTask = task;
      }
    }

    if (oldestTask) {
      stats.oldestTask = {
        id: oldestTask.id,
        age: Game.time - oldestTask.createdAt,
      };
    }

    return stats;
  }

  /**
   * Apply dynamic priority modifier
   * Boosts priority of tasks matching criteria
   */
  public applyDynamicModifier(predicate: (task: Task) => boolean, modifier: number): void {
    for (const task of this.queue.values()) {
      if (predicate(task)) {
        const oldPriority = task.priority;
        task.priority = Math.max(TaskPriority.CRITICAL, Math.min(TaskPriority.LOW, task.priority + modifier)) as TaskPriority;

        if (task.priority !== oldPriority) {
          // Remove from old bucket, add to new
          const oldBucket = this.priorityBuckets.get(oldPriority)!;
          const idx = oldBucket.indexOf(task.id);
          if (idx >= 0) oldBucket.splice(idx, 1);

          this.priorityBuckets.get(task.priority)!.push(task.id);
          debugLog.debug(`Task ${task.id} priority boosted: ${oldPriority} → ${task.priority}`);
        }
      }
    }
  }

  /**
   * Clear all tasks (use cautiously!)
   */
  public clear(): void {
    this.queue.clear();
    for (const bucket of this.priorityBuckets.values()) {
      bucket.length = 0;
    }
    logger.warn("Task queue cleared");
  }
}

// Singleton instance
let instance: TaskQueue | null = null;

/**
 * Get or create task queue singleton
 */
export function getTaskQueue(config?: Partial<TaskQueueConfig>): TaskQueue {
  if (!instance) {
    instance = new TaskQueue(config);
  }
  return instance;
}

/**
 * Reset task queue (for testing)
 */
export function resetTaskQueue(): void {
  instance = null;
}
```

### Stage 2: Add Task Memory Structures

**File:** `src/types.ts`

**Add to BaseCreepMemory:**
```typescript
export interface BaseCreepMemory {
  role: CreepRole;
  room: string;
  working: boolean;

  // Task queue integration
  currentTaskId?: string; // ID of current task being executed
  assignedTaskIds?: string[]; // Tasks assigned to this creep

  // ... existing properties ...
}
```

**Add to global Memory interface (if exists):**
```typescript
declare global {
  interface Memory {
    tasks?: Record<string, Task>;
    taskQueue?: {
      stats: {
        totalTasks: number;
        byStatus: Record<TaskStatus, number>;
      };
      lastUpdated: number;
    };
  }
}
```

### Stage 3: Refactor GameManager for Queue-Driven Execution

**File:** `src/GameManager.ts`

**Current tick() method:**
```typescript
public tick(): void {
  if (this.isPaused) return;

  logger.debug(`Current game tick is ${Game.time}`);
  this.syncActiveCreeps();
  this.cleanUpMemory();

  this.spawnManager.run();

  for (let name in Object.values(Game.spawns)) {
    const spawn = Game.spawns[name];
    for (var creepName in this.activeCreeps) {
      var creep = this.activeCreeps[creepName];
      this.runCreep(creep, spawn);
    }
  }

  updateVisualOverlay();
  // ... rest
}
```

**New tick() with three phases:**
```typescript
public tick(): void {
  logger.debug(`Current game tick is ${Game.time}`);

  // Phase 1: Planning - analyze game state, queue tasks
  this.planPhase();

  // Phase 2: Queueing - dequeue and prepare tasks
  this.queuePhase();

  // Phase 3: Execution - run creeps, execute on-queue tasks
  this.executePhase();

  updateVisualOverlay();

  // Monitor multi-room performance
  if (MULTI_ROOM_CONFIG.enabled) {
    logPerformanceStats();
  }
}

/**
 * Plan phase: analyze game state and queue tasks
 */
private planPhase(): void {
  this.syncActiveCreeps();
  this.cleanUpMemory();

  // Analyze room state and queue spawn tasks
  for (const spawnName in Game.spawns) {
    const spawn = Game.spawns[spawnName];
    this.queueSpawnsForRoom(spawn);
  }

  // Apply dynamic priority modifiers based on game state
  this.applyDynamicPriorityModifiers();
}

/**
 * Queue phase: dequeue tasks and dispatch
 */
private queuePhase(): void {
  const queue = getTaskQueue();

  // Process up to N tasks per tick
  for (let i = 0; i < 5; i++) {
    const task = queue.dequeue();
    if (!task) break;

    this.executeTask(task);
  }
}

/**
 * Execute phase: run creeps
 */
private executePhase(): void {
  for (let name in Object.values(Game.spawns)) {
    const spawn = Game.spawns[name];
    for (var creepName in this.activeCreeps) {
      var creep = this.activeCreeps[creepName];
      this.runCreep(creep, spawn);
    }
  }

  this.handleSafeMode();
}

/**
 * Queue spawns for a specific room
 */
private queueSpawnsForRoom(spawn: StructureSpawn): void {
  const queue = getTaskQueue();

  if (this.spawnManager.isSpawningPaused()) {
    return; // Don't queue spawns if paused
  }

  // Use existing spawn logic but enqueue instead of execute
  const context = this.spawnManager.createSpawnContext(spawn, this.spawnManager.getGlobalCreepCounts());

  if (context.enoughCreeps) {
    return; // Don't spawn more creeps
  }

  // Determine what to spawn and create task
  const roleToSpawn = this.determineRoleToSpawn(context);
  if (roleToSpawn) {
    const template = selectBestTemplate(context);
    const task: SpawnTask = {
      id: `spawn-${Game.time}-${Math.random()}`,
      type: TaskType.SPAWN,
      priority: this.getSpawnPriority(roleToSpawn),
      status: TaskStatus.PENDING,
      createdAt: Game.time,
      data: {
        role: roleToSpawn,
        body: template.body,
        spawnName: spawn.name,
        energyRequired: template.cost,
        retryCount: 0,
      },
    };

    queue.enqueue(task);
  }
}

/**
 * Execute a queued task
 */
private executeTask(task: Task): void {
  const queue = getTaskQueue();

  try {
    switch (task.type) {
      case TaskType.SPAWN:
        this.executeSpawnTask(task as SpawnTask, queue);
        break;
      case TaskType.BUILD:
        this.executeBuildTask(task as BuildTask, queue);
        break;
      // ... other task types
      default:
        queue.cancelTask(task.id);
    }
  } catch (e) {
    logger.error(`Error executing task ${task.id}: ${e}`);
    queue.failTask(task.id, String(e));
  }
}

/**
 * Execute spawn task
 */
private executeSpawnTask(task: SpawnTask, queue: TaskQueue): void {
  const spawn = Game.spawns[task.data.spawnName];

  if (!spawn) {
    queue.failTask(task.id, "Spawn not found");
    return;
  }

  if (spawn.room.energyAvailable < task.data.energyRequired) {
    queue.failTask(task.id, "Insufficient energy");
    return;
  }

  const result = this.spawnManager.spawnCreep(spawn, task.data.body, `${task.data.role}-`, task.data.role);

  if (result === OK) {
    queue.completeTask(task.id);
  } else {
    queue.failTask(task.id, `Spawn failed: ${result}`);
  }
}

/**
 * Apply dynamic priority modifiers based on game state
 */
private applyDynamicPriorityModifiers(): void {
  const queue = getTaskQueue();

  // Boost spawn priority if room danger is high
  for (const room of Object.values(Game.rooms)) {
    const danger = room.find(FIND_HOSTILE_CREEPS).length;
    if (danger > 0) {
      queue.applyDynamicModifier(
        (task) => task.type === TaskType.SPAWN && task.data.role === "defender",
        1 // +1 priority
      );
    }
  }

  // Boost haul priority if containers are full
  for (const room of Object.values(Game.rooms)) {
    const containers = room.find(FIND_STRUCTURES, { filter: s => s.structureType === STRUCTURE_CONTAINER });
    const avgFill = containers.reduce((sum, c) => sum + (c as StructureContainer).store.getUsedCapacity(), 0) / containers.length;

    if (avgFill > 0.8) {
      queue.applyDynamicModifier(
        (task) => task.type === TaskType.HAUL,
        1 // +1 priority
      );
    }
  }

  // Boost upgrade priority if controller decay approaching
  for (const room of Object.values(Game.rooms)) {
    if (room.controller && room.controller.my && room.controller.ticksToDowngrade < 10000) {
      queue.applyDynamicModifier(
        (task) => task.type === TaskType.UPGRADE,
        1 // +1 priority
      );
    }
  }
}

/**
 * Get spawn priority for a role
 */
private getSpawnPriority(role: CreepRole): TaskPriority {
  switch (role) {
    case "defender":
      return TaskPriority.CRITICAL;
    case "harvester":
      return TaskPriority.HIGH;
    case "hauler":
      return TaskPriority.HIGH;
    case "builder":
      return TaskPriority.NORMAL;
    case "upgrader":
      return TaskPriority.NORMAL;
    default:
      return TaskPriority.LOW;
  }
}

/**
 * Determine which role to spawn next
 */
private determineRoleToSpawn(context: SpawnContext): CreepRole | null {
  // Use existing spawn manager logic
  // This would move the role determination out of spawn manager
  // and into a public method for reuse
  return null; // Placeholder
}
```

### Stage 4: Update UI for Queue Visibility

**File:** `src/ui/GameStatsUI.ts`

**Add new display:**
```typescript
/**
 * Show task queue status
 */
function showTaskQueue(): string {
  const queue = getTaskQueue();
  const stats = queue.getStats();

  const output = [
    "\n=== Task Queue ===",
    `Total Tasks: ${stats.totalTasks}`,
    `Status:`,
    `  Pending: ${stats.byStatus[TaskStatus.PENDING] ?? 0}`,
    `  In Progress: ${stats.byStatus[TaskStatus.IN_PROGRESS] ?? 0}`,
    `  Completed: ${stats.byStatus[TaskStatus.COMPLETED] ?? 0}`,
    `  Failed: ${stats.byStatus[TaskStatus.FAILED] ?? 0}`,
  ];

  const byType = stats.byType;
  if (Object.keys(byType).length > 0) {
    output.push(`By Type:`);
    for (const type in byType) {
      output.push(`  ${type}: ${byType[type as TaskType]}`);
    }
  }

  if (stats.oldestTask) {
    output.push(`Oldest Task: ${stats.oldestTask.id} (${stats.oldestTask.age} ticks)`);
  }

  return output.join("\n");
}

// Add to getStats() export
export function getStats(): string {
  return [
    showCreepStatus(),
    showRoomStatus(),
    showTaskQueue(),
    showVisualStatus(),
  ].join("\n");
}
```

### Stage 5: Memory Persistence for Tasks

**Add helper functions to persist tasks:**
```typescript
/**
 * Save active tasks to memory (for debugging/visibility)
 */
export function persistTasksToMemory(): void {
  const queue = getTaskQueue();
  const stats = queue.getStats();

  if (!Memory.taskQueue) {
    Memory.taskQueue = {};
  }

  Memory.taskQueue.stats = {
    totalTasks: stats.totalTasks,
    byStatus: stats.byStatus,
  };
  Memory.taskQueue.lastUpdated = Game.time;
}

/**
 * Clear expired tasks from memory
 */
export function cleanupTaskMemory(): void {
  if (!Memory.tasks) return;

  for (const taskId in Memory.tasks) {
    const task = Memory.tasks[taskId];
    if (Game.time - task.createdAt > 10000) {
      delete Memory.tasks[taskId];
    }
  }
}
```

## Affected Files Summary

| File | Type | Stage | Change | Complexity |
|------|------|-------|--------|-----------|
| `src/types.ts` | Edit | 1,2 | Add Task interfaces, enums | Medium |
| `src/utils/taskQueue.ts` | NEW | 1 | Task queue service | High |
| `src/GameManager.ts` | Edit | 3 | Refactor tick() into 3 phases | High |
| `src/ui/GameStatsUI.ts` | Edit | 4 | Add queue visualization | Low |

## Testing Strategy

### Unit Tests
1. **Queue operations** — enqueue, dequeue, complete, fail, cancel
2. **Priority ordering** — verify dequeue respects priority
3. **Dynamic modifiers** — verify priority boost works
4. **Task creation** — spawn, build, haul tasks created correctly

### Integration Tests
1. **Full tick cycle** — plan → queue → execute phases work together
2. **Queue persistence** — tasks survive across ticks
3. **Spawn flow** — task → spawn → creep integration works
4. **Dynamic modifiers** — room danger boosts defender priority, etc.

### Manual Testing (Console)
```javascript
// Get queue stats
getStats();

// Check queue is working
const queue = getTaskQueue();
queue.getPendingTasks();

// Monitor task completion
// Watch for spawns happening through queue instead of synchronously
```

## Acceptance Criteria

- [ ] Task interfaces defined and type-safe
- [ ] TaskQueue service creates, manages, and completes tasks
- [ ] GameManager split into plan/queue/execute phases
- [ ] Spawn logic routed through queue (no more direct spawning)
- [ ] Priority ordering works (CRITICAL → HIGH → NORMAL → LOW)
- [ ] Dynamic modifiers boost priority correctly
- [ ] UI shows queue status with statistics
- [ ] No existing Phase 1/2 functionality broken
- [ ] Tasks persist across ticks
- [ ] Queue stats updated every tick

## Implementation Notes

### Design Decisions

1. **Queue as Service** — TaskQueue is injectable singleton (no dependency injection framework needed)
2. **Task Persistence** — Tasks in queue are ephemeral (reset each tick); can add persistence later if needed
3. **Three-Phase Tick** — Separates concerns: planning, queuing, execution
4. **Dynamic Modifiers** — Applied once per tick after planning; affects priority buckets

### Backward Compatibility

- Existing spawn logic continues to work (wrapped in queue)
- Existing creep roles unchanged
- UI improvements additive (doesn't break existing displays)

### Performance Considerations

1. **Queue traversal** — O(priority levels) per dequeue = O(5) = O(1)
2. **Priority bucket** — O(1) insertion/removal within bucket
3. **Dynamic modifiers** — O(queue size) but only once per tick; acceptable

## Rollout Strategy

**Phase 3 is multi-phase implementation:**

1. **3.1 (1 week)** — Build queue infrastructure (no GameManager changes yet)
   - Create TaskQueue service
   - Add Task interfaces
   - Write unit tests
   - No breaking changes

2. **3.2 (1 week)** — Integrate queue into GameManager
   - Refactor tick() into 3 phases
   - Route spawning through queue
   - Add queue display in UI
   - Extensive testing before merging

3. **3.3 (optional)** — Add persistence and advanced features
   - Save tasks to memory
   - Task history logging
   - Advanced visualization

## Related Work

- **Unblocks**: Phase 4 (strategy switching uses task priorities)
- **Unblocks**: Phase 5 (squad coordination uses task queue)
- **Complements**: Phase 1/2 (improves visibility into pending work)

## Time Estimate

- Stage 1–2 (queue + types): 2–3 hours
- Stage 3 (GameManager refactor): 3–4 hours
- Stage 4 (UI updates): 1 hour
- Testing: 2–3 hours
- **Total: ~8–11 hours**

## Notes

This is a significant architectural change. Recommend:
- Creating feature branch
- Extensive testing before merging to main
- Clear documentation of new tick flow
- Pair with a reviewer to catch issues

After Phase 3, Phases 4 and 5 become straightforward:
- Phase 4 just changes task priorities based on strategy
- Phase 5 just assigns tasks to squad members

This is the critical foundation that enables the rest of the roadmap.
