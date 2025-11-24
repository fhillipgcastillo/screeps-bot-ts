# Multi-Room Resource Harvesting Implementation Plan

## Overview
This document outlines the comprehensive implementation plan for extending the Screeps bot's harvesting and hauling capabilities from single-room operations to multi-room resource collection. The implementation will enable creeps to safely and efficiently harvest resources from adjacent rooms while maintaining backward compatibility with existing single-room operations.

## Core Requirements
1. **Multi-room Harvesting**: Extend harvesters to consider resource nodes in adjacent rooms (1 level away: up, down, left, right) if accessible via exit points
2. **Multi-room Hauling**: Extend haulers to collect energy from nearby rooms and transport it back to the main room
3. **Safety First**: Prioritize rooms without hostile creeps/structures and completely avoid hostile rooms
4. **Resource Distribution**: Implement logic to prevent overcrowding by ensuring each harvester targets a different nearby resource node
5. **Hauler Optimization**: Haulers should cycle between different resource sources, prioritizing closer sources first
6. **Configurable Expansion**: Design the system with a configurable parameter for exploration depth (0 = current room only, 1 = adjacent rooms, etc.)

## Current Architecture Analysis

### Existing Harvesting System
- **Single-room focused**: Harvesters only scan `creep.room.find(FIND_SOURCES)`
- **Target persistence**: Uses `creep.memory.sourceTarget` for consistent targeting
- **Anti-crowding logic**: Has `getNextClosestTarget` and `memorizedPrevTargets` functions
- **Stationary approach**: Harvesters drop energy for haulers to collect

### Existing Hauling System
- **Resource collection**: Focuses on dropped resources, tombstones, and ruins
- **Room-limited**: Only searches within `creep.room`
- **Target management**: Uses `creep.memory.resourceTarget` for persistence
- **Transfer logic**: Delivers to spawns, extensions, and containers

### Existing Multi-Room Foundation
- **Explorer role**: Provides room navigation utilities (`getExitRoomNames`, `findRoomExits`)
- **Room status checking**: Comments show `Game.map.getRoomStatus(roomName)` usage
- **Exit pathfinding**: Logic for finding and navigating to room exits

## Implementation Tasks

### Task 1: Analyze Current Architecture and Dependencies ✅ COMPLETE
**Status**: COMPLETE
**Description**: Examine existing harvester and hauler implementations, room management utilities, and explorer functionality to understand current patterns and identify integration points for multi-room expansion.

**Key Findings**:
- Strong foundation with explorer role providing room navigation utilities
- Harvester and hauler roles have good target management and anti-crowding logic
- Memory system supports target persistence with `sourceTarget` and `resourceTarget`
- Room safety checking exists in comments: `Game.map.getRoomStatus(roomName)`

### Task 2: Create Multi-Room Configuration System
**Estimated Time**: 20 minutes
**Description**: Design and implement a configurable system for managing multi-room exploration depth, room safety assessment, and resource prioritization settings.

**Implementation Details**:
- Create `src/config/multi-room.config.ts` with:
  - `EXPLORATION_DEPTH` parameter (0=current room, 1=adjacent, 2=two levels out)
  - `SAFETY_CHECK_INTERVAL` for periodic room status validation
  - `MAX_MULTI_ROOM_HARVESTERS` and `MAX_MULTI_ROOM_HAULERS` limits
  - `PRIORITY_ROOM_TYPES` configuration (owned, reserved, neutral)
  - `ENABLE_MULTI_ROOM` feature flag for easy toggle

**Files to Create**:
- `src/config/multi-room.config.ts`

**Dependencies**: None

### Task 3: Implement Room Safety and Accessibility Assessment
**Estimated Time**: 20 minutes
**Description**: Create utilities to evaluate room safety (hostile presence), accessibility (exit validation), and resource availability before allowing creeps to enter adjacent rooms.

**Implementation Details**:
- Create `src/utils/room-safety.ts` with functions:
  - `isRoomSafe(roomName: string): boolean` - Check for hostile creeps/structures
  - `isRoomAccessible(fromRoom: string, toRoom: string): boolean` - Validate exit paths
  - `getRoomResourceValue(roomName: string): number` - Assess resource availability
  - `updateRoomSafetyCache()` - Periodic safety status updates
  - `getRoomStatus(roomName: string)` - Wrapper for Game.map.getRoomStatus

**Files to Create**:
- `src/utils/room-safety.ts`

**Dependencies**: Task 2 (Configuration System)

### Task 4: Extend Resource Discovery for Multi-Room Operations
**Estimated Time**: 20 minutes
**Description**: Enhance existing findResources functions to scan adjacent rooms and identify available energy sources while respecting safety and accessibility constraints.

**Implementation Details**:
- Create `src/utils/multi-room-resources.ts`:
  - `findMultiRoomSources(homeRoom: string, depth: number): Source[]`
  - `getAdjacentRoomSources(roomName: string): Source[]`
  - `prioritizeSourcesByDistance(sources: Source[], homeRoom: string): Source[]`
  - `filterSafeRoomSources(sources: Source[]): Source[]`
- Extend existing resource finding functions to include adjacent room scanning
- Implement caching mechanism for discovered sources

**Files to Create**:
- `src/utils/multi-room-resources.ts`

**Files to Modify**:
- `src/role.harvester_stationary.ts` (extend existing findResources logic)

**Dependencies**: Task 2, Task 3

### Task 5: Implement Multi-Room Harvester Logic
**Estimated Time**: 20 minutes
**Description**: Extend harvester role to target and harvest from energy sources in adjacent rooms, including pathfinding, room transitions, and target persistence across rooms.

**Implementation Details**:
- Extend `src/role.harvester_stationary.ts`:
  - Add `findMultiRoomTarget()` function
  - Implement room transition logic in `harvest()` function
  - Update `storeNewHarvestTarget()` to consider adjacent rooms
  - Add memory fields: `targetRoom`, `homeRoom`, `isMultiRoom`
  - Handle room boundary crossing and pathfinding
  - Implement fallback to single-room operation if multi-room fails

**Files to Modify**:
- `src/role.harvester_stationary.ts`
- `src/types.ts` (extend HarvesterMemory interface)

**Dependencies**: Task 2, Task 3, Task 4

### Task 6: Implement Multi-Room Hauler Logic
**Estimated Time**: 20 minutes
**Description**: Extend hauler role to collect energy from adjacent rooms and transport it back to the main room, with optimized routing and source prioritization.

**Implementation Details**:
- Extend `src/role.hauler.ts`:
  - Add `findMultiRoomResources()` function
  - Implement return-to-home logic after collection
  - Add source cycling between rooms
  - Update memory with `collectionRoom`, `returnPath`
  - Prioritize closer sources first, then expand to farther ones
  - Handle room transitions and pathfinding optimization

**Files to Modify**:
- `src/role.hauler.ts`
- `src/types.ts` (extend HaulerMemory interface)

**Dependencies**: Task 2, Task 3, Task 4

### Task 7: Implement Resource Distribution and Anti-Crowding System
**Estimated Time**: 20 minutes
**Description**: Create logic to ensure harvesters target different resource nodes and haulers cycle between sources efficiently to prevent overcrowding and maximize efficiency.

**Implementation Details**:
- Create `src/utils/resource-distribution.ts`:
  - `assignUniqueTargets(creeps: Creep[], sources: Source[]): void`
  - `getAvailableTargets(sources: Source[], excludeIds: string[]): Source[]`
  - `optimizeHaulerRoutes(haulers: Creep[], sources: Source[]): void`
  - `redistributeOvercrowdedSources()` - Move creeps from crowded sources
  - `calculateOptimalCreepDistribution()` - Balance creeps across sources

**Files to Create**:
- `src/utils/resource-distribution.ts`

**Files to Modify**:
- `src/role.harvester_stationary.ts` (integrate distribution logic)
- `src/role.hauler.ts` (integrate route optimization)

**Dependencies**: Task 5, Task 6

### Task 8: Update Memory Management for Multi-Room Operations
**Estimated Time**: 20 minutes
**Description**: Extend creep memory interfaces and management to support multi-room target tracking, room transitions, and persistent state across room boundaries.

**Implementation Details**:
- Extend `src/types.ts` memory interfaces:
  - Add `multiRoom` properties to `HarvesterMemory` and `HaulerMemory`
  - Include `targetRoom`, `homeRoom`, `roomPath`, `lastRoomTransition`
  - Add `multiRoomEnabled`, `explorationDepth`, `safetyCheckTick`
- Update memory cleanup functions to handle multi-room state
- Implement memory migration for existing creeps
- Add memory validation and error recovery

**Files to Modify**:
- `src/types.ts`
- `src/GameManager.ts` (memory cleanup functions)

**Dependencies**: Task 5, Task 6

### Task 9: Integration Testing and Performance Optimization
**Estimated Time**: 20 minutes
**Description**: Test the complete multi-room system, optimize performance, handle edge cases, and ensure seamless integration with existing single-room operations.

**Implementation Details**:
- Create test scenarios for multi-room operations
- Implement performance monitoring for CPU usage
- Add fallback mechanisms for single-room operation
- Optimize pathfinding and room transition logic
- Handle edge cases (room visibility, creep death during transition)
- Add debugging and logging for multi-room operations
- Performance benchmarking and optimization

**Files to Create**:
- `src/utils/multi-room-debug.ts` (debugging utilities)

**Files to Modify**:
- All previously modified files (performance optimizations)
- `src/GameManager.ts` (integration and monitoring)

**Dependencies**: All previous tasks

## Key Integration Points

1. **Leverage Existing Explorer Logic**: The `getExitRoomNames()` and `findRoomExits()` functions provide a solid foundation
2. **Extend Current Target Management**: Build upon existing `sourceTarget` and `resourceTarget` memory patterns
3. **Maintain Backward Compatibility**: Ensure single-room operations continue working seamlessly
4. **Use Existing Safety Patterns**: Build upon the tower defense and hostile detection logic

## Implementation Priority

1. **Start with Configuration and Safety** (Tasks 2-3): Establish the foundation
2. **Extend Resource Discovery** (Task 4): Enable multi-room source detection
3. **Implement Harvester Logic** (Task 5): Core harvesting functionality
4. **Implement Hauler Logic** (Task 6): Resource collection and transport
5. **Add Distribution Logic** (Task 7): Prevent overcrowding and optimize efficiency
6. **Update Memory Management** (Task 8): Support persistent multi-room state
7. **Test and Optimize** (Task 9): Ensure reliability and performance

## Success Criteria

- [ ] Harvesters can successfully target and harvest from adjacent room sources
- [ ] Haulers can collect energy from adjacent rooms and return to home room
- [ ] No overcrowding on resource nodes (max 1-2 creeps per source)
- [ ] System respects safety constraints (avoids hostile rooms)
- [ ] Performance impact is minimal (CPU usage increase < 10%)
- [ ] Backward compatibility maintained (single-room operations unaffected)
- [ ] Configurable exploration depth works correctly
- [ ] System gracefully handles edge cases and failures

## Notes

- All tasks are designed to be completed in approximately 20 minutes each
- Each task builds upon previous tasks in a logical progression
- The implementation maintains existing architecture patterns
- Safety and backward compatibility are prioritized throughout
- The system is designed to be easily extensible for future enhancements
