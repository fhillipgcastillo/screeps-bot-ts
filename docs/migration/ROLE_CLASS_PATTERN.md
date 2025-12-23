# Role Class Pattern Blueprint

**Purpose**: Define the standardized class-based architecture for all role implementations
**Last Updated**: December 23, 2025
**Status**: Draft

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Base Class Hierarchy](#base-class-hierarchy)
3. [Standard Class Structure](#standard-class-structure)
4. [Memory Integration Patterns](#memory-integration-patterns)
5. [State Management](#state-management)
6. [Multi-Room Support](#multi-room-support)
7. [Example Implementations](#example-implementations)
8. [Migration Patterns](#migration-patterns)

---

## Architecture Overview

### Design Principles

1. **Inheritance**: All roles extend `CreepBrain` or `SmartCreep` from `types.ts`
2. **Encapsulation**: Internal logic hidden in private methods, public interface minimal
3. **Type Safety**: Leverage TypeScript for compile-time checks, no `any` types
4. **Memory Management**: Typed memory interfaces from `types.ts` (HarvesterMemory, etc.)
5. **Testability**: Public methods testable, private methods isolated

### Class Hierarchy

```
CreepBrain (abstract)
  └── SmartCreep (concrete)
        ├── Harvester
        ├── Hauler
        ├── Builder
        ├── Upgrader
        ├── Defender (new)
        ├── Ranger (new)
        └── Explorer (new)
```

---

## Base Class Hierarchy

### CreepBrain (from types.ts)

Abstract base class defining the contract for all creep AI:

```typescript
export abstract class CreepBrain {
  public creep: Creep;
  public memory: BaseCreepMemory;
  public state: eCreepState = "IDLE";

  constructor(creep: Creep) {
    this.creep = creep;
    this.memory = creep.memory as BaseCreepMemory;
  }

  abstract run(): void;
  abstract setRole(role: CreepRole): void;
  abstract getRole(): CreepRole;
  abstract handleTask(): void;
  abstract setState(state: eCreepState): void;

  // Optional specialized methods
  harvest?(): void;
  build?(): void;
  upgrade?(): void;
  idle?(): void;
  hauler?(): void;
}
```

### SmartCreep (from types.ts)

Concrete implementation with task dispatch logic:

```typescript
export class SmartCreep extends CreepBrain {
  run(): void {
    this.handleTask();
  }

  public setRole(role: CreepRole): void {
    this.memory.role = role;
  }

  public getRole(): CreepRole {
    return this.memory.role;
  }

  handleTask(): void {
    switch (this.state) {
      case CreepStateEnum.HARVESTING:
        this.harvest && this.harvest();
        break;
      case CreepStateEnum.HAULING:
        this.hauler && this.hauler();
        break;
      case CreepStateEnum.BUILDING:
        this.build && this.build();
        break;
      case CreepStateEnum.UPGRADING:
        this.upgrade && this.upgrade();
        break;
      // ... other states
    }
  }

  setState(state: eCreepState): void {
    this.state = state;
  }
}
```

---

## Standard Class Structure

### Template for Simple Roles

```typescript
import { SmartCreep } from "./types";
import { CreepRoleEnum } from "./types";
import { debugLog } from "./utils/Logger";

/**
 * RoleName Creep Implementation
 *
 * Responsibilities:
 * - Primary task (e.g., attack hostile creeps)
 * - Secondary task (e.g., patrol if no targets)
 *
 * State Transitions:
 * - IDLE → ATTACKING (when hostile found)
 * - ATTACKING → IDLE (when no hostiles)
 */
class RoleNameCreep extends SmartCreep {
  /**
   * Constructor - initializes role and state
   */
  constructor(creep: Creep) {
    super(creep);
    this.setRole(CreepRoleEnum.ROLE_NAME);
    this.setState("IDLE"); // or appropriate default state
  }

  /**
   * Main execution loop - called every tick
   */
  public run(): void {
    this.validateMemory();
    this.determineState();
    this.handleTask();
  }

  /**
   * Validate and initialize memory structure
   * @private
   */
  private validateMemory(): void {
    // Ensure required memory fields exist
    if (!this.memory.room) {
      this.memory.room = this.creep.room.name;
    }
  }

  /**
   * Determine current state based on creep conditions
   * @private
   */
  private determineState(): void {
    // State transition logic
    // e.g., if (this.hasTarget()) this.setState("ATTACKING");
  }

  /**
   * Execute primary action for this role
   * Overrides SmartCreep optional method
   */
  public primaryAction(): void {
    // Implementation of main role behavior
  }

  // Additional private helper methods as needed
}

/**
 * Factory function for creating role instances
 * Maintains compatibility with current GameManager pattern
 */
export default {
  run: (creep: Creep): void => {
    const roleInstance = new RoleNameCreep(creep);
    roleInstance.run();
  }
};
```

### Template for Complex Roles (Multi-Room)

```typescript
import { SmartCreep } from "./types";
import { CreepRoleEnum, HarvesterMemory } from "./types";
import { MULTI_ROOM_CONFIG } from "./config/multi-room.config";
import { debugLog } from "./utils/Logger";

/**
 * Advanced RoleName with Multi-Room Support
 *
 * Features:
 * - Multi-room operation with safety checks
 * - Room transition management
 * - Profitability assessment
 * - Distribution-first targeting
 */
class AdvancedRoleCreep extends SmartCreep {
  // Typed memory accessor
  declare memory: HarvesterMemory;

  constructor(creep: Creep) {
    super(creep);
    this.setRole(CreepRoleEnum.ROLE_NAME);
    this.initializeMultiRoomMemory();
  }

  /**
   * Main execution loop
   */
  public run(): void {
    this.validateMemory();
    this.updateMultiRoomState();
    this.determineState();
    this.handleTask();
  }

  /**
   * Initialize multi-room memory structure
   * @private
   */
  private initializeMultiRoomMemory(): void {
    if (!this.memory.multiRoom) {
      this.memory.multiRoom = {
        enabled: MULTI_ROOM_CONFIG.enabled,
        homeRoom: this.creep.room.name,
        isMultiRoom: false,
        failureCount: 0
      };
    }
  }

  /**
   * Update multi-room operational state
   * @private
   */
  private updateMultiRoomState(): void {
    // Check profitability, handle transitions, etc.
  }

  /**
   * Determine if multi-room operation is appropriate
   * @private
   */
  private shouldUseMultiRoom(): boolean {
    // Decision logic based on config, room state, etc.
    return false; // placeholder
  }

  /**
   * Handle room transition logic
   * @private
   */
  private handleRoomTransition(): void {
    // Pathfinding, timeout tracking, etc.
  }

  // Additional multi-room methods...
}

export default {
  run: (creep: Creep): void => {
    const roleInstance = new AdvancedRoleCreep(creep);
    roleInstance.run();
  }
};
```

---

## Memory Integration Patterns

### Type-Safe Memory Access

```typescript
class HarvesterCreep extends SmartCreep {
  // Override memory type for compile-time safety
  declare memory: HarvesterMemory;

  /**
   * Safe getter for source target
   */
  private getSourceTarget(): Source | null {
    if (!this.memory.sourceTarget) {
      return null;
    }

    const source = Game.getObjectById(this.memory.sourceTarget);
    if (!source) {
      // Target destroyed, clear stale reference
      delete this.memory.sourceTarget;
      return null;
    }

    return source;
  }

  /**
   * Safe setter for source target
   */
  private setSourceTarget(source: Source | null): void {
    if (source) {
      this.memory.sourceTarget = source.id;
    } else {
      delete this.memory.sourceTarget;
    }
  }
}
```

### Memory Validation

```typescript
/**
 * Validate memory structure on every run
 * @private
 */
private validateMemory(): void {
  // Ensure base fields
  if (!this.memory.role) {
    this.memory.role = CreepRoleEnum.HARVESTER;
  }
  if (!this.memory.room) {
    this.memory.room = this.creep.room.name;
  }

  // Initialize role-specific fields
  if (this.memory.working === undefined) {
    this.memory.working = false;
  }

  // Validate object references
  if (this.memory.sourceTarget) {
    const target = Game.getObjectById(this.memory.sourceTarget);
    if (!target) {
      delete this.memory.sourceTarget;
      debugLog.warn(`Cleared stale sourceTarget for ${this.creep.name}`);
    }
  }
}
```

---

## State Management

### State Enum Usage

```typescript
import { CreepStateEnum } from "./types";

class BuilderCreep extends SmartCreep {
  private determineState(): void {
    const isEmpty = this.creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0;
    const isFull = this.creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0;

    if (isEmpty && this.state === CreepStateEnum.BUILDING) {
      this.setState(CreepStateEnum.HARVESTING);
      this.memory.working = false;
    } else if (isFull && this.state === CreepStateEnum.HARVESTING) {
      this.setState(CreepStateEnum.BUILDING);
      this.memory.working = true;
    }
  }
}
```

### State-Based Method Dispatch

```typescript
public override handleTask(): void {
  switch (this.state) {
    case CreepStateEnum.HARVESTING:
      this.collectEnergy();
      break;
    case CreepStateEnum.BUILDING:
      this.constructStructure();
      break;
    case CreepStateEnum.IDLE:
      this.idle();
      break;
    default:
      debugLog.warn(`Unknown state: ${this.state} for ${this.creep.name}`);
  }
}

private collectEnergy(): void {
  // Implementation
}

private constructStructure(): void {
  // Implementation
}

private idle(): void {
  // Default idle behavior
}
```

---

## Multi-Room Support

### Multi-Room Memory Pattern

```typescript
interface MultiRoomMemory {
  enabled: boolean;
  homeRoom: string;
  targetRoom?: string;
  isMultiRoom: boolean;
  roomTransitionStartTick?: number;
  failureCount: number;
  lastMultiRoomAttempt?: number;
  lastProfitabilityCheck?: number;
}
```

### Room Transition Handling

```typescript
private handleRoomTransition(): void {
  const targetRoom = this.memory.multiRoom?.targetRoom;

  if (!targetRoom) {
    return;
  }

  // Check timeout
  const startTick = this.memory.multiRoom?.roomTransitionStartTick;
  if (startTick && Game.time - startTick > MULTI_ROOM_CONFIG.roomTransitionTimeout) {
    debugLog.warn(`Room transition timeout for ${this.creep.name}`);
    this.cleanupMultiRoomState();
    return;
  }

  // Navigate to target room
  if (this.creep.room.name !== targetRoom) {
    const exitDir = this.creep.room.findExitTo(targetRoom);
    if (exitDir === ERR_NO_PATH || exitDir === ERR_INVALID_ARGS) {
      debugLog.error(`No path to ${targetRoom} from ${this.creep.room.name}`);
      this.cleanupMultiRoomState();
      return;
    }

    const exit = this.creep.pos.findClosestByPath(exitDir as ExitConstant);
    if (exit) {
      this.creep.moveTo(exit, { visualizePathStyle: { stroke: '#ffaa00' } });
    }
  } else {
    // Arrived at target room
    delete this.memory.multiRoom.roomTransitionStartTick;
    debugLog.debug(`${this.creep.name} arrived at ${targetRoom}`);
  }
}
```

---

## Example Implementations

### Simple Role: Defender

```typescript
import { SmartCreep } from "./types";
import { CreepRoleEnum, DefenderMemory } from "./types";
import { debugLog } from "./utils/Logger";

/**
 * Defender Role - Protects room from hostile creeps
 */
class DefenderCreep extends SmartCreep {
  declare memory: DefenderMemory;

  constructor(creep: Creep) {
    super(creep);
    this.setRole(CreepRoleEnum.DEFENDER);
  }

  public run(): void {
    const target = this.findHostileTarget();

    if (target) {
      this.engageTarget(target);
    } else {
      this.patrol();
    }
  }

  /**
   * Find the closest hostile creep or structure
   * @private
   */
  private findHostileTarget(): Creep | Structure | null {
    const hostileCreep = this.creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS);
    if (hostileCreep) {
      return hostileCreep;
    }

    const hostileStructure = this.creep.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES);
    return hostileStructure;
  }

  /**
   * Engage and attack a hostile target
   * @private
   */
  private engageTarget(target: Creep | Structure): void {
    const attackResult = this.creep.attack(target);

    if (attackResult === ERR_NOT_IN_RANGE) {
      this.creep.moveTo(target, {
        visualizePathStyle: { stroke: '#ff0000' }
      });
    } else if (attackResult !== OK) {
      debugLog.warn(`Attack failed for ${this.creep.name}: ${attackResult}`);
    }
  }

  /**
   * Patrol behavior when no targets
   * @private
   */
  private patrol(): void {
    // Simple patrol to room controller
    const controller = this.creep.room.controller;
    if (controller) {
      this.creep.moveTo(controller, {
        visualizePathStyle: { stroke: '#00ff00' }
      });
    }
  }
}

export default {
  run: (creep: Creep): void => {
    const defender = new DefenderCreep(creep);
    defender.run();
  }
};
```

### Moderate Role: Builder

```typescript
import { SmartCreep } from "./types";
import { CreepRoleEnum, BuilderMemory } from "./types";
import { debugLog } from "./utils/Logger";
import { getCachedContainers } from "./utils/energy-bootstrap";
import { assignResourceTarget } from "./utils/resource-assignment";

/**
 * Builder Role - Constructs structures and repairs
 */
class BuilderCreep extends SmartCreep {
  declare memory: BuilderMemory;

  constructor(creep: Creep) {
    super(creep);
    this.setRole(CreepRoleEnum.BUILDER);
    this.setState("IDLE");
  }

  public run(): void {
    this.validateMemory();
    this.updateWorkingState();
    this.handleTask();
  }

  private validateMemory(): void {
    if (this.memory.working === undefined) {
      this.memory.working = false;
    }
  }

  private updateWorkingState(): void {
    const isEmpty = this.creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0;
    const isFull = this.creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0;

    if (isEmpty && this.memory.working) {
      this.memory.working = false;
      this.setState("IDLE");
    } else if (isFull && !this.memory.working) {
      this.memory.working = true;
    }
  }

  public override handleTask(): void {
    if (this.memory.working) {
      this.buildOrRepair();
    } else {
      this.collectEnergy();
    }
  }

  /**
   * Build construction sites or repair structures
   * @private
   */
  private buildOrRepair(): void {
    const constructionSite = this.findConstructionSite();

    if (constructionSite) {
      const buildResult = this.creep.build(constructionSite);

      if (buildResult === ERR_NOT_IN_RANGE) {
        this.creep.moveTo(constructionSite, {
          visualizePathStyle: { stroke: '#ffffff' }
        });
      }
    } else {
      // No construction sites, repair damaged structures
      this.repairStructures();
    }
  }

  /**
   * Find highest priority construction site
   * Priority: Spawn > Extension > Tower > Storage > Road > Other
   * @private
   */
  private findConstructionSite(): ConstructionSite | null {
    const level = this.creep.room.controller?.level || 1;
    const priorities: StructureConstant[] = [
      STRUCTURE_SPAWN,
      STRUCTURE_EXTENSION,
      STRUCTURE_TOWER,
      STRUCTURE_STORAGE,
      STRUCTURE_ROAD,
      STRUCTURE_CONTAINER
    ];

    for (const structureType of priorities) {
      const sites = this.creep.room.find(FIND_CONSTRUCTION_SITES, {
        filter: (site) => site.structureType === structureType
      });

      if (sites.length > 0) {
        return this.creep.pos.findClosestByPath(sites);
      }
    }

    // Fallback: any construction site
    const allSites = this.creep.room.find(FIND_CONSTRUCTION_SITES);
    return this.creep.pos.findClosestByPath(allSites);
  }

  /**
   * Repair damaged structures
   * @private
   */
  private repairStructures(): void {
    const damagedStructure = this.creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: (structure) => {
        return structure.hits < structure.hitsMax &&
               structure.structureType !== STRUCTURE_WALL &&
               structure.structureType !== STRUCTURE_RAMPART;
      }
    });

    if (damagedStructure) {
      const repairResult = this.creep.repair(damagedStructure);

      if (repairResult === ERR_NOT_IN_RANGE) {
        this.creep.moveTo(damagedStructure, {
          visualizePathStyle: { stroke: '#00ff00' }
        });
      }
    }
  }

  /**
   * Collect energy from containers or spawn
   * @private
   */
  private collectEnergy(): void {
    const target = assignResourceTarget(this.creep, 'builder');

    if (target) {
      const withdrawResult = this.creep.withdraw(target as any, RESOURCE_ENERGY);

      if (withdrawResult === ERR_NOT_IN_RANGE) {
        this.creep.moveTo(target, {
          visualizePathStyle: { stroke: '#ffaa00' }
        });
      }
    }
  }
}

export default {
  run: (creep: Creep): void => {
    const builder = new BuilderCreep(creep);
    builder.run();
  }
};
```

---

## Migration Patterns

### From Object to Class

**Before (Object Pattern):**
```typescript
const roleHarvester = {
  run: function(creep: Creep) {
    // logic here
  },

  harvest: function(creep: Creep) {
    // harvest logic
  }
};

export default roleHarvester;
```

**After (Class Pattern):**
```typescript
class HarvesterCreep extends SmartCreep {
  constructor(creep: Creep) {
    super(creep);
    this.setRole(CreepRoleEnum.HARVESTER);
  }

  public run(): void {
    this.harvest();
  }

  private harvest(): void {
    // harvest logic (now has access to this.creep, this.memory)
  }
}

export default {
  run: (creep: Creep): void => {
    const harvester = new HarvesterCreep(creep);
    harvester.run();
  }
};
```

### Handling Named Function Exports

**Before (Explorer Pattern):**
```typescript
export function runExplorer(creep: Creep) {
  // logic here
}
```

**After (Standardized):**
```typescript
class ExplorerCreep extends SmartCreep {
  // implementation
}

export default {
  run: (creep: Creep): void => {
    const explorer = new ExplorerCreep(creep);
    explorer.run();
  }
};

// Optional: maintain backward compatibility
export function runExplorer(creep: Creep) {
  const explorer = new ExplorerCreep(creep);
  explorer.run();
}
```

---

## Best Practices

### 1. Encapsulation
- Keep helper methods `private`
- Only expose `run()` publicly through default export
- Use typed memory accessors

### 2. Type Safety
- Declare memory type: `declare memory: HarvesterMemory`
- Avoid `any` types
- Use enums for states and roles

### 3. Performance
- Avoid repeated `find()` calls (cache results)
- Use pathfinding sparingly
- Clear stale memory references

### 4. Error Handling
- Validate memory on every run
- Check return codes from actions
- Log warnings for unexpected states

### 5. Testability
- Keep methods focused (single responsibility)
- Avoid side effects in getters
- Make state transitions explicit

---

## Anti-Patterns to Avoid

❌ **Hardcoded References**
```typescript
// BAD
const spawn = Game.spawns['Spawn1'];
```

✅ **Dynamic Resolution**
```typescript
// GOOD
const spawn = this.creep.room.find(FIND_MY_SPAWNS)[0];
```

❌ **Commented-Out Code**
```typescript
// BAD - don't leave large blocks commented
// if (droppedEnergy) {
//   // 100 lines of old logic
// }
```

✅ **Clean Removal**
```typescript
// GOOD - remove old code, use version control
```

❌ **Type Mismatches**
```typescript
// BAD
const roleUpgrader: RoleHauler = { ... }; // Wrong type!
```

✅ **Correct Typing**
```typescript
// GOOD
class UpgraderCreep extends SmartCreep { ... }
```

---

## Testing Checklist

- [ ] Constructor initializes role and state correctly
- [ ] `run()` method executes without errors
- [ ] State transitions work as expected
- [ ] Memory validation prevents corruption
- [ ] Stale object references are cleaned up
- [ ] Multi-room logic handles transitions
- [ ] Performance impact is minimal
- [ ] GameManager integration works

---

## Related Documentation

- [types.ts](../../src/types.ts) - Base class definitions
- [ROLE_MIGRATION_TRACKER.md](ROLE_MIGRATION_TRACKER.md) - Migration status
- [memoryHelpers.ts](../../src/utils/memoryHelpers.ts) - Memory management utilities

---

**Next Steps**: Review this blueprint, then begin Tier 1 migrations (defender, ranger, upgrader)
