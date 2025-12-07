# Plan A: Complete Phase 2 Multi-Room Integration

## Overview

Phase 2 is currently **70% complete**. The core multi-room infrastructure is working:
- ✅ Room safety checks with threat detection
- ✅ Harvester room transitions with profitability scoring
- ✅ Hauler multi-room support
- ✅ Source profitability evaluation
- ✅ Adjacent room auto-discovery

**Missing (30% remaining):**
- ❌ Room claiming strategy (opportunistic claiming)
- ❌ Dynamic room list management
- ❌ Claiming prerequisites and validation
- ❌ Runtime room discovery list updates
- ❌ Console commands for room management

This plan adds the claiming infrastructure and completes Phase 2 to enable autonomous expansion.

## Problem Statement

**Current State:**
- Harvesters can migrate to adjacent rooms
- Room safety prevents entry to hostile rooms
- But: no mechanism to claim controller-less rooms or expand strategically

**Desired State:**
- Bot discovers adjacent rooms with viable energy sources
- Evaluates rooms for safety (no hostile creeps, manageable structures)
- Claims rooms opportunistically when safe (when energy sources deplete in current room)
- Maintains dynamic list of: discovered, claimed, unsafe rooms
- Console commands allow manual control and debugging

**Impact:**
- Without claiming, bot can only "visit" adjacent rooms; cannot fully expand
- Multi-room becomes true expansion strategy instead of temporary harvesting
- Enables Phase 5 squad coordination across multiple claimed territories

## Implementation Approach

### 1. Create Room Claiming Utility

**File:** `src/utils/roomClaiming.ts` (NEW)

**Purpose:**
- Centralize room claiming decision logic
- Calculate room safety scores
- Validate claiming prerequisites
- Track claiming state

**Interface Design:**
```typescript
export interface RoomClaimingState {
  roomName: string;
  claimStatus: "unclaimed" | "claimed" | "unsafe" | "pending";
  safetyScore: number; // 0-100, higher = safer
  lastEvaluated: number; // Game.time
  claimedBy?: string; // Room that claimed it
  reasons?: string[]; // Why it's unsafe/unclaimed
}

export interface ClaimingCriteria {
  minSafetyScore: number; // Default: 50
  maxHostileCreeps: number; // Default: 0
  maxHostileStructures: number; // Default: 1
  maxEnergyDecayRate: number; // Default: 0.8 (80%)
  minSourceCount: number; // Default: 1
  minAverageSourceEnergy: number; // Default: 500
}

export interface ClaimDecision {
  canClaim: boolean;
  safetyScore: number;
  reasons: string[]; // Explanation of decision
}
```

**Key Functions:**
```typescript
/**
 * Calculate a room's safety score for claiming
 * Returns 0-100 score; higher = safer to claim
 */
export function calculateRoomSafetyScore(roomName: string): number {
  // Factors:
  // - Hostile creeps present: -50 points
  // - Hostile structures: -20 per structure
  // - Room owner (unclaimed rooms better): +10
  // - Reserved room: -30
  // - Recently attacked: -20
  // Returns 0-100, clamped
}

/**
 * Evaluate if we should claim this room
 */
export function shouldClaimRoom(
  roomName: string,
  criteria: ClaimingCriteria,
  homeRoom: string
): ClaimDecision {
  // Check:
  // 1. Safety score >= minSafetyScore
  // 2. Hostile creeps <= maxHostileCreeps
  // 3. Hostile structures <= maxHostileStructures
  // 4. Source count >= minSourceCount
  // 5. Average source energy >= minAverageSourceEnergy
  // 6. Energy decay rate <= maxEnergyDecayRate
  // Returns decision with reasons
}

/**
 * Actually claim a room (set memory flag)
 */
export function claimRoom(roomName: string, claimingRoom: string): void {
  if (!Memory.rooms) Memory.rooms = {};
  if (!Memory.rooms[roomName]) Memory.rooms[roomName] = {};
  Memory.rooms[roomName].claimed = true;
  Memory.rooms[roomName].claimedBy = claimingRoom;
  Memory.rooms[roomName].claimedAt = Game.time;
}

/**
 * Mark room as unsafe (don't attempt to claim)
 */
export function markRoomUnsafe(roomName: string, reason: string): void {
  if (!Memory.rooms) Memory.rooms = {};
  if (!Memory.rooms[roomName]) Memory.rooms[roomName] = {};
  Memory.rooms[roomName].unsafe = true;
  Memory.rooms[roomName].unsafeReason = reason;
  Memory.rooms[roomName].unsafeUntil = Game.time + 1000; // 1000 tick TTL
}

/**
 * Get all claimed rooms
 */
export function getClaimedRooms(): string[] {
  if (!Memory.rooms) return [];
  return Object.keys(Memory.rooms).filter(r => Memory.rooms[r].claimed);
}

/**
 * Get all discovered (non-claimed) rooms
 */
export function getDiscoveredRooms(): string[] {
  if (!Memory.rooms) return [];
  return Object.keys(Memory.rooms).filter(r => !Memory.rooms[r].claimed && !Memory.rooms[r].unsafe);
}
```

### 2. Integrate Claiming Logic into Harvester

**File:** `src/role.harvester_stationary.ts`

**Current Code (relevant sections):**
- `findNewTarget()` — Uses `getResourcesInNewRoom()` for room discovery
- `shouldMoveToNewRoom()` — Uses profitability scoring to decide migration

**Changes:**
- After profitability check, evaluate discovered room for claiming
- If safe and meets criteria, attempt claim
- Update harvester memory with claimed room info

**New Logic in Harvester:**
```typescript
private shouldMoveToNewRoom(creep: Creep): boolean {
  const lastCheck = creep.memory.multiRoom?.lastProfitabilityCheck ?? 0;

  // Check profitability every 50 ticks
  if (Game.time - lastCheck < 50) {
    return false;
  }

  // Check if current source is still profitable
  const currentRoom = creep.memory.multiRoom?.targetRoom || creep.room.name;
  const profitability = getSourceProfitability(currentRoom);

  if (profitability < PROFITABILITY_THRESHOLD) {
    // Current room depleted; look for new room
    const adjacentRooms = Game.map.describeExits(currentRoom);

    for (const direction in adjacentRooms) {
      const newRoom = adjacentRooms[direction];

      // Check if room is safe
      if (!canEnterRoom(newRoom)) continue;

      // Evaluate room for claiming
      const claimingCriteria = getClaimingCriteria(creep.room);
      const decision = shouldClaimRoom(newRoom, claimingCriteria, creep.room.name);

      if (decision.canClaim) {
        // Attempt to claim this room
        claimRoom(newRoom, creep.room.name);
        creep.memory.multiRoom!.targetRoom = newRoom;
        logger.info(`Harvester ${creep.name} will claim ${newRoom}`);
        return true;
      }

      // Even if can't claim yet, discover it
      if (!Memory.rooms[newRoom]) {
        Memory.rooms[newRoom] = { discovered: true, discoveredAt: Game.time };
      }
    }
  }

  return false;
}
```

### 3. Update Multi-Room Configuration

**File:** `src/config/multi-room.config.ts`

**Current Code (relevant sections):**
```typescript
export const MULTI_ROOM_CONFIG = {
  enabled: true,
  debugEnabled: true,
  maxCpuUsage: 15,
  // ... other settings
};
```

**Changes:**
- Add claiming thresholds and criteria
- Make criteria configurable per level

**New Configuration:**
```typescript
export const MULTI_ROOM_CONFIG = {
  // ... existing settings

  // Room claiming configuration
  claiming: {
    enabled: true,
    criteria: {
      minSafetyScore: 50,       // 0-100
      maxHostileCreeps: 0,      // 0 = room must be empty
      maxHostileStructures: 1,  // Allow 1 (usually road/rampart)
      maxEnergyDecayRate: 0.8,  // 80% decay tolerance
      minSourceCount: 1,        // Need at least 1 source
      minAverageSourceEnergy: 500, // Minimum avg source energy
    },

    // Level-based claiming (different thresholds per level)
    levelCriteria: {
      1: {
        minSafetyScore: 60,
        maxHostileCreeps: 0,
        maxHostileStructures: 0,
      },
      2: {
        minSafetyScore: 50,
        maxHostileCreeps: 0,
        maxHostileStructures: 1,
      },
      3: {
        minSafetyScore: 40,
        maxHostileCreeps: 1,
        maxHostileStructures: 2,
      },
    },

    // Time-based room reevaluation
    reevaluationInterval: 5000, // Ticks between safety re-checks
    unsafeRoomTTL: 1000,        // How long to mark room unsafe
    claimingMaxDistance: 3,     // Max rooms away to consider claiming
  },
};

/**
 * Get claiming criteria for current level
 */
export function getClaimingCriteria(room: Room): ClaimingCriteria {
  const level = room.controller?.level ?? 1;
  const levelCriteria = MULTI_ROOM_CONFIG.claiming.levelCriteria[level];

  return levelCriteria || MULTI_ROOM_CONFIG.claiming.criteria;
}
```

### 4. Build Dynamic Room List Management

**File:** `src/GameManager.ts`

**Current Code (relevant sections):**
- `initializeMultiRoomSystem()` — Sets up multi-room config
- `cleanUpMultiRoomMemory()` — Cleans stale references

**Changes:**
- Add method to discover new rooms
- Add method to update room list
- Call every 100 ticks to refresh room state

**New Methods:**
```typescript
/**
 * Update room discovery and claiming state
 * Called periodically to refresh multi-room awareness
 */
private updateRoomDiscoveryList(): void {
  if (!MULTI_ROOM_CONFIG.enabled || !MULTI_ROOM_CONFIG.claiming.enabled) {
    return;
  }

  if (!Memory.rooms) Memory.rooms = {};

  // For each claimed room, discover adjacent rooms
  const claimedRooms = Object.keys(Memory.rooms).filter(r => Memory.rooms[r].claimed);

  for (const claimedRoom of claimedRooms) {
    const adjacentExits = Game.map.describeExits(claimedRoom);

    for (const direction in adjacentExits) {
      const adjacentRoom = adjacentExits[direction];

      // Skip if already tracked
      if (Memory.rooms[adjacentRoom]) continue;

      // Register as discovered
      Memory.rooms[adjacentRoom] = {
        discovered: true,
        discoveredAt: Game.time,
        discoveredFrom: claimedRoom,
      };
    }
  }

  // Re-evaluate unsafe rooms periodically
  for (const roomName in Memory.rooms) {
    const roomData = Memory.rooms[roomName];

    if (roomData.unsafe && roomData.unsafeUntil) {
      if (Game.time > roomData.unsafeUntil) {
        // Re-enable for evaluation
        roomData.unsafe = false;
        roomData.unsafeReason = undefined;
        logger.debug(`Re-enabling room evaluation for ${roomName}`);
      }
    }
  }
}

/**
 * Sync room discovery list to GameManager state
 */
public getRoomState(): {
  claimed: string[];
  discovered: string[];
  unsafe: string[];
} {
  if (!Memory.rooms) Memory.rooms = {};

  const claimed = Object.keys(Memory.rooms).filter(r => Memory.rooms[r].claimed);
  const discovered = Object.keys(Memory.rooms).filter(r => Memory.rooms[r].discovered && !Memory.rooms[r].claimed && !Memory.rooms[r].unsafe);
  const unsafe = Object.keys(Memory.rooms).filter(r => Memory.rooms[r].unsafe);

  return { claimed, discovered, unsafe };
}
```

**Update `tick()` method:**
```typescript
public tick(): void {
  // ... existing code ...

  // Update room discovery list every 100 ticks
  if (MULTI_ROOM_CONFIG.enabled && Game.time % 100 === 0) {
    this.updateRoomDiscoveryList();
  }

  // ... rest of tick ...
}
```

### 5. Add Console Commands for Room Management

**File:** `src/utils/consoleCommands.ts`

**Current Code:**
- `toggleMultiRoom()`, `enableMultiRoom()`, `disableMultiRoom()`, `getMultiRoomStatus()`

**Changes:**
- Add room claiming commands
- Add room list inspection commands

**New Commands:**
```typescript
/**
 * Manually claim a specific room
 */
export function claimRoom(roomName: string): string {
  const room = Game.rooms[roomName];

  if (!room) {
    return `Error: Room ${roomName} not visible`;
  }

  if (room.controller && room.controller.owner) {
    return `Error: Room ${roomName} is already owned`;
  }

  const homeRoom = Object.keys(Game.rooms).find(r => Game.rooms[r].controller?.my);
  if (!homeRoom) {
    return "Error: No home room found";
  }

  const criteria = getClaimingCriteria(Game.rooms[homeRoom]);
  const decision = shouldClaimRoom(roomName, criteria, homeRoom);

  if (!decision.canClaim) {
    return `Cannot claim ${roomName}: ${decision.reasons.join(", ")}`;
  }

  claimRoom(roomName, homeRoom);
  return `Claimed ${roomName} for ${homeRoom}`;
}

/**
 * Get all claimable rooms (meet criteria but not yet claimed)
 */
export function getClaimableRooms(): string[] {
  const homeRoom = Object.keys(Game.rooms).find(r => Game.rooms[r].controller?.my);
  if (!homeRoom) return [];

  const criteria = getClaimingCriteria(Game.rooms[homeRoom]);
  const discovered = getDiscoveredRooms();

  return discovered.filter(room => {
    const decision = shouldClaimRoom(room, criteria, homeRoom);
    return decision.canClaim;
  });
}

/**
 * Get all claimed rooms
 */
export function getClaimedRooms(): string[] {
  return Object.keys(Memory.rooms || {}).filter(r => Memory.rooms[r].claimed);
}

/**
 * Get all discovered but unclaimed rooms
 */
export function getDiscoveredRooms(): string[] {
  return Object.keys(Memory.rooms || {}).filter(
    r => Memory.rooms[r].discovered && !Memory.rooms[r].claimed && !Memory.rooms[r].unsafe
  );
}

/**
 * Get room state summary
 */
export function getRoomStatus(): string {
  const claimed = getClaimedRooms();
  const discovered = getDiscoveredRooms();
  const unsafe = Object.keys(Memory.rooms || {}).filter(r => Memory.rooms[r].unsafe);

  return `
Room Status:
  Claimed: ${claimed.join(", ") || "none"}
  Discovered: ${discovered.join(", ") || "none"}
  Unsafe: ${unsafe.join(", ") || "none"}

Claimable: ${getClaimableRooms().join(", ") || "none"}
`;
}

/**
 * Mark a room as unsafe (won't attempt to claim)
 */
export function markRoomUnsafe(roomName: string, reason: string = "manual"): string {
  markRoomUnsafe(roomName, reason);
  return `Marked ${roomName} as unsafe`;
}

/**
 * Clear unsafe status from a room (allow re-evaluation)
 */
export function allowRoomEvaluation(roomName: string): string {
  if (!Memory.rooms || !Memory.rooms[roomName]) {
    return `Error: Room ${roomName} not tracked`;
  }

  Memory.rooms[roomName].unsafe = false;
  Memory.rooms[roomName].unsafeReason = undefined;
  return `Re-enabled evaluation for ${roomName}`;
}

/**
 * Get detailed room state (debug info)
 */
export function debugRoomState(roomName?: string): string {
  if (!Memory.rooms) return "No room data tracked";

  if (roomName) {
    const data = Memory.rooms[roomName];
    return data ? JSON.stringify(data, null, 2) : `No data for ${roomName}`;
  }

  return JSON.stringify(Memory.rooms, null, 2);
}
```

### 6. Export Commands to Global

**File:** `src/main.ts`

**Changes:**
- Export new room commands to global
- Add to module exports

**Code (add after multi-room console commands):**
```typescript
// Room claiming commands
global.claimRoom = claimRoom;
global.getClaimableRooms = getClaimableRooms;
global.getClaimedRooms = getClaimedRooms;
global.getDiscoveredRooms = getDiscoveredRooms;
global.getRoomStatus = getRoomStatus;
global.markRoomUnsafe = markRoomUnsafe;
global.allowRoomEvaluation = allowRoomEvaluation;
global.debugRoomState = debugRoomState;

// Add to exports
export {
  // ... existing exports ...
  claimRoom,
  getClaimableRooms,
  getClaimedRooms,
  getDiscoveredRooms,
  getRoomStatus,
  markRoomUnsafe,
  allowRoomEvaluation,
  debugRoomState,
};
```

### 7. Update UI Display

**File:** `src/ui/GameStatsUI.ts`

**Changes:**
- Add room state section to stats display
- Show claimed, discovered, and unsafe rooms
- Show claimable rooms count

**New Display:**
```typescript
/**
 * Show room claiming state
 */
function showRoomClaimingStatus(): string {
  const roomState = getRoomState();

  const output = [
    "\n=== Room State ===",
    `Claimed: ${roomState.claimed.join(", ") || "none"}`,
    `Discovered: ${roomState.discovered.length} rooms`,
    `Unsafe: ${roomState.unsafe.length} rooms`,
  ];

  const claimable = getClaimableRooms();
  if (claimable.length > 0) {
    output.push(`Claimable: ${claimable.join(", ")}`);
  }

  return output.join("\n");
}

// Add to main stats output
// Include in getStats() function
```

## Affected Files Summary

| File | Type | Change | Complexity |
|------|------|--------|-----------|
| `src/utils/roomClaiming.ts` | NEW | Room claiming logic, safety scoring, criteria | High |
| `src/role.harvester_stationary.ts` | Edit | Integrate claiming into profitability check | Medium |
| `src/config/multi-room.config.ts` | Edit | Add claiming configuration and criteria | Low |
| `src/GameManager.ts` | Edit | Add room discovery list update method | Low |
| `src/utils/consoleCommands.ts` | Edit | Add room management commands | Medium |
| `src/main.ts` | Edit | Export room commands to global | Low |
| `src/ui/GameStatsUI.ts` | Edit | Display room state in stats | Low |

## Testing Strategy

### Unit Tests
1. **Safety score calculation** — Test formula with various room states
2. **Claiming decision logic** — Test shouldClaimRoom() with various criteria
3. **Room state management** — Test claiming, discovering, marking unsafe

### Integration Tests
1. **Room claiming workflow** — Discover → evaluate → claim → use
2. **Profitability-triggered claiming** — Source depletes → room claim triggered
3. **Unsafe room handling** — Mark unsafe → harvester skips → re-evaluates after TTL

### Manual Testing (Console)
```javascript
// Test 1: Claim a specific room manually
claimRoom("W5N6");
getRoomStatus();

// Test 2: Get claimable rooms
getClaimableRooms();

// Test 3: Mark room unsafe
markRoomUnsafe("W5N8", "hostile creeps");
getRoomStatus();

// Test 4: Debug room state
debugRoomState("W5N6");

// Test 5: Allow re-evaluation
allowRoomEvaluation("W5N8");
getRoomStatus();
```

## Acceptance Criteria

- [ ] Harvesters can claim adjacent rooms that meet safety criteria
- [ ] Room safety score calculation works correctly
- [ ] Claiming occurs automatically when source profitability depletes
- [ ] Dynamic room list updated every 100 ticks
- [ ] Console commands work: `claimRoom()`, `getClaimableRooms()`, `getRoomStatus()`, etc.
- [ ] UI shows room state (claimed, discovered, unsafe)
- [ ] Unsafe rooms are re-evaluated after TTL expires
- [ ] Manual claiming via console works
- [ ] Level-based criteria applied correctly
- [ ] No regressions in Phase 1 or Phase 2 existing functionality

## Constraints & Considerations

### Prerequisites Assumption
- **No auto-building assumption** — Bot will not auto-build spawns in claimed rooms; only claims unclaimed rooms with existing infrastructure or raw resources
- **Simple claiming** — Only set memory flag; actual controller claiming via builder creeps can come later
- **No conflicts** — Assume single bot; don't handle multi-bot claiming conflicts

### Edge Cases
- Claimed room becomes unsafe later (hostile creeps move in) — Handled by re-evaluation, can abandon via manual command
- Distance calculation — Use `Game.map.findRoute()` cost as distance metric
- Room transitions slow — Room claiming happens gradually as sources deplete; not immediate

## Related Work

- **Complements**: Phase 2 room safety (uses existing threat detection)
- **Enables**: Phase 5 squads (multiple territories for defensive placement)
- **Requires**: Phase 1 spawning (need good spawn timing to use claimed rooms)

## Time Estimate

- Implementation: 3–4 hours
- Testing: 1–2 hours
- Integration: 1 hour
- **Total: ~5–7 hours**

## Phased Rollout

1. **Phase 2a (1–2 hours)** — Create roomClaiming.ts utility + integrate into harvester
2. **Phase 2b (1 hour)** — Add config criteria and level-based logic
3. **Phase 2c (1–2 hours)** — Console commands and global exports
4. **Phase 2d (1 hour)** — UI updates and documentation

Can be done incrementally; Phase 2a gives immediate value (rooms start getting claimed).

## Notes

After this plan completes, Phase 2 is **100% done** and bot can:
- ✅ Discover adjacent rooms autonomously
- ✅ Evaluate rooms for safety
- ✅ Claim safe rooms opportunistically
- ✅ Maintain dynamic room list
- ✅ Use console commands for manual control

This prepares Phase 5 for multi-room squad coordination and Phase 3 for task queue architecture that can span multiple claimed territories.
