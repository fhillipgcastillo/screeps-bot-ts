# Implementation Strategy: Tiga's Screeps Bot Approach

**Last Updated:** December 29, 2025
**Status:** Phase 1-4 Complete | Phase 5 Testing
## Overview

This document tracks the strategic improvements to align the current Screeps bot with Tiga's proven strategy. The goal is to implement a more efficient and predictable creep management system focused on queue-based hauler coordination and stationary harvester efficiency.

---

## Strategic Framework

### Core Principles from Tiga's Analysis

1. **Stationary Harvesters**: Harvesters move to their assigned source and harvest until full, then automatically drop energy when carry capacity is reached (no manual dropping).
2. **Queue-Based Hauler System**: Haulers wait for energy to accumulate (50+ energy threshold) before moving, forming an implicit queue per source.
3. **Flexible Team Composition**: Team sizes scale dynamically based on room needs, but maintain the per-source team concept.
4. **Spawn Sequence**: Follow Tiga's proven sequence: 1 Harvester → 1 Hauler → double both roles (repeat as needed).
5. **State Visibility**: Centralized logging of creep state transitions for debugging and optimization.

---

## Implementation Plan

### Phase 1: Spawn Management (In Progress)
**Goal:** Implement Tiga's spawn sequence for early game progression

**Changes:**
- [x] Modify `spawn.manager.ts` to prioritize Tiga's sequence
  - Step 1: Spawn 1 stationary harvester if count < 1
  - Step 2: Spawn 1 hauler if harvesters >= 1 and hauler count < 1
  - Step 3: Double both roles when conditions met
  - Step 4: Scale up based on room needs (flexible targets)
- [x] Track spawn history in memory to ensure sequence adherence

**Files:** `src/spawn.manager.ts`

---

### Phase 2: Hauler Queue System
**Goal:** Implement 50+ energy accumulation threshold and queue-based behavior

**Changes:**
- [x] Update `role.hauler.ts` to:
  - Track source-specific dropped energy accumulation
  - Wait at source location until 50+ energy is available
  - Implement queue position tracking per source
  - Pick up energy in order (first hauler in queue gets energy first)
  - Rotate queue: once a hauler picks up, move to back of queue
- [x] Add memory structure: `Memory.sources[sourceId].queue`
  - Queue order: [creepId1, creepId2, creepId3, ...]
  - Accumulator: total dropped energy at source

**Files:** `src/role.hauler.ts`

**Implementation Details:**
- Added `ENERGY_THRESHOLD = 50` constant
- `checkQueueAndWait()` method checks energy threshold and queue position
- Haulers only proceed if position = 0 and `accumulation >= required energy`
- Queue auto-updates every `QUEUE_UPDATE_INTERVAL` ticks, removing dead creeps

---

### Phase 3: Per-Source Team Tracking
**Goal:** Group harvesters and haulers by source for coordinated management

**Changes:**
- [x] Add memory structure: `Memory.sources[sourceId].team`
  - `harvesters`: [creepId1, creepId2]
  - `haulers`: [creepId1, creepId2, creepId3, creepId4]
  - `maxHaulers`: flexible limit per source
- [x] Update `role.harvester_stationary.ts` to:
  - Assign to source and track in team memory on first run
  - Maintain source assignment (stationary behavior)
  - Auto-drop when at carry capacity (no manual drop calls)
- [x] Update `spawn.manager.ts` to:
  - Assign new harvesters to sources with lowest harvester count
  - Assign new haulers to sources with lowest hauler count

**Files:** `src/role.harvester_stationary.ts`, `src/spawn.manager.ts`

**Implementation Details:**
- New method `assignCreepToSourceTeam()` in SpawnManager
- Harvester assignment logic: finds source with minimum harvesters
- Hauler assignment logic: finds source with minimum haulers
- Team data automatically initialized in Memory.sources

---

### Phase 4: State Change Logging
**Goal:** Add visibility into creep state transitions and queue behavior

**Changes:**
- [x] Create `src/utils/logger/StateLogger.ts`
  - Track creep state changes (role state transitions)
  - Log hauler queue position changes
  - Log source team assignments
  - Optional: output logs to console or memory for analysis
- [x] Integrate StateLogger into role classes
  - Call `StateLogger.logStateChange()` when creep state changes
  - Call `StateLogger.logQueuePosition()` when hauler queue changes

**Files:** `src/utils/logger/StateLogger.ts` (new), `src/utils/logger/index.ts`

**Implementation Details:**
- StateLogger provides static methods for state tracking
- Methods include: `logStateChange()`, `logQueuePosition()`, `logTeamAssignment()`, `logSourceAccumulation()`, `logSpawnSequence()`
- Debug mode toggle for performance optimization
- Memory snapshot utility for analysis

---

### Phase 5: Harvester Auto-Drop Refinement
**Goal:** Ensure harvesters drop energy naturally at capacity

**Changes:**
- [x] Update `role.harvester_stationary.ts`:
  - Remove manual drop logic (drop 5 when store > 5)
  - Rely on automatic drop when `creep.store.getFreeCapacity() === 0`
  - Harvest continues until capacity reached
  - Energy drops at source location for hauler pickup

**Files:** `src/role.harvester_stationary.ts`

**Implementation Details:**
- Changed run() to check `getFreeCapacity() === 0` instead of `energy > 5`
- Simplified dropEnergy() to drop all energy (RESOURCE_ENERGY)
- Harvesters now drop full capacity when at max, providing larger energy batches for queue system

---

## Memory Structure

### Current Target Structure

```javascript
Memory = {
  creeps: {
    [creepName]: {
      role: 'harvester' | 'hauler' | 'upgrader' | 'builder',
      state: 'harvesting' | 'delivering' | ...,
      sourceId: roomSourceId,  // for harvesters
      team: sourceId            // for both harvesters and haulers
    }
  },

  sources: {
    [sourceId]: {
      team: {
        harvesters: [creepId1, creepId2],
        haulers: [creepId1, creepId2, creepId3, creepId4],
        maxHaulers: 4
      },
      queue: {
        order: [creepId1, creepId2],        // Queue order
        accumulation: 0                     // Total dropped energy at source
      }
    }
  },

  spawn: {
    sequence: 'harvester' | 'hauler',      // Current phase
    requests: [...]
  }
}
```

---

## Implementation Checklist

- [x] **Phase 1**: Tiga's spawn sequence
- [x] **Phase 2**: Hauler queue system with 50+ threshold
- [x] **Phase 3**: Per-source team tracking and assignment
- [x] **Phase 4**: State change logging utility
- [x] **Phase 5**: Harvester auto-drop verification
- [ ] **Integration Testing**: Verify creep behavior matches expected strategy
- [ ] **Debugging**: Use state logs to validate queue ordering and team assignments
- [ ] **Optimization**: Monitor energy throughput and adjust queue thresholds if needed

---

## Code Changes Summary

### 1. spawn.manager.ts
- Implemented Tiga's spawn sequence (1H → 1U → 2H → 2U pattern)
- Added `assignCreepToSourceTeam()` method for per-source team tracking
- Harvesters and haulers automatically assigned to sources with lowest team member count

### 2. role.hauler.ts
- Added queue system constants: `ENERGY_THRESHOLD = 50`, `QUEUE_UPDATE_INTERVAL = 5`
- Implemented `checkQueueAndWait()` method for queue-based energy accumulation logic
- Haulers check queue position and energy threshold before proceeding with pickup
- Queue position displayed via creep.say() for visual debugging

### 3. role.harvester_stationary.ts
- Refactored `run()` method to check `getFreeCapacity() === 0` for auto-drop
- Simplified drop behavior: drop full capacity instead of 5 energy increments
- Harvesters now provide larger energy batches for queue-based hauler pickup

### 4. utils/logger/StateLogger.ts (NEW)
- Created comprehensive state logging utility
- Methods: `logStateChange()`, `logQueuePosition()`, `logTeamAssignment()`, `logSourceAccumulation()`, `logSpawnSequence()`
- Debug mode toggle for performance optimization
- Memory snapshot utility for analysis

### 5. utils/logger/index.ts
- Exported StateLogger for use across the codebase

---

## Expected Outcomes

1. **Efficient Energy Harvesting**: Harvesters drop energy automatically; haulers pick up in coordinated queues.
2. **Predictable Hauler Behavior**: Haulers wait and rotate turns, reducing wasted movement.
3. **Scalable Structure**: Flexible team sizes allow growth while maintaining per-source organization.
4. **Early Game Clarity**: Tiga's spawn sequence ensures optimal initial progression.
5. **Visibility**: State logging provides insights into system behavior and bottlenecks.

---

## Notes & Decisions

- **Clarification 1**: Team composition is flexible (scales dynamically) rather than fixed 2:4 ratios.
- **Clarification 2**: Use Tiga's spawn sequence (1 harvester → 1 hauler → double both).
- **Clarification 3**: Harvesters are stationary, move to source, harvest, and auto-drop at capacity.

---

## Implementation Status

**✅ COMPLETE** - All 5 phases implemented and compiled successfully!

### Files Modified:
1. **src/spawn.manager.ts** - Tiga's spawn sequence + per-source team assignment
2. **src/role.hauler.ts** - Queue system with 50+ energy threshold
3. **src/role.harvester_stationary.ts** - Auto-drop at capacity refinement
4. **src/utils/logger/StateLogger.ts** - NEW state logging utility
5. **src/utils/logger/index.ts** - Exported StateLogger
6. **src/types.ts** - Added Memory.sources type definitions

### Key Features Implemented:
- ✅ **Tiga's Spawn Sequence**: 1 Harvester → 1 Hauler → Double both (flexible scaling)
- ✅ **Hauler Queue System**: 50+ energy threshold with per-source queue tracking
- ✅ **Per-Source Team Assignment**: Harvesters and haulers grouped and tracked by source
- ✅ **State Logging**: Comprehensive logging utilities for debugging and optimization
- ✅ **Stationary Harvester Logic**: Auto-drop at full capacity for consistent energy batches

### Testing Recommendations:
1. Deploy and monitor early game (Level 1-2)
2. Watch harvester drop patterns (should be full capacity drops)
3. Monitor hauler queue positions via creep.say() debug output
4. Check Memory.sources structure in game console: `JSON.stringify(Memory.sources)`
5. Enable StateLogger debug mode to track state transitions

### Next Steps:
1. Test on actual Screeps server
2. Monitor energy throughput and hauler efficiency
3. Adjust `ENERGY_THRESHOLD` (currently 50) based on performance
4. Consider implementing load balancing for harvester distribution
5. Add metrics tracking for queue wait times and energy loss

---

## Future Improvements

- [ ] Load balancing: Ensure harvesters are balanced across sources
- [ ] Dynamic hauler count based on source distance and drop rate
- [ ] Hauler efficiency metrics: track pickup wait times and energy throughput
- [ ] Early game defense: add ranger/defender spawning logic
