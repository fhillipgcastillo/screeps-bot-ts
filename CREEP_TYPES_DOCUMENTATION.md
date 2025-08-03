# Creep Role Type System Documentation

## Overview
This document describes the new type-safe creep role system implemented for the Screeps codebase. The system replaces generic `string` types with proper TypeScript union types and enums, providing better type safety and IDE support.

## Key Components

### 1. CreepRole Union Type
```typescript
export type CreepRole = 
    | "harvester"
    | "hauler" 
    | "builder"
    | "upgrader"
    | "defender"
    | "ranger"
    | "explorer";
```

### 2. CreepRoleEnum
```typescript
export enum CreepRoleEnum {
    HARVESTER = "harvester",
    HAULER = "hauler",
    BUILDER = "builder", 
    UPGRADER = "upgrader",
    DEFENDER = "defender",
    RANGER = "ranger",
    EXPLORER = "explorer"
}
```

### 3. Role-Specific Memory Interfaces

#### Base Interface
```typescript
export interface BaseCreepMemory {
    role: CreepRole;
    room: string;
    working: boolean;
    // Common properties...
}
```

#### Role-Specific Interfaces
- `HarvesterMemory`: Includes `sourceTargetId`, `lastStep`
- `HaulerMemory`: Uses common transfering/haulering flags
- `BuilderMemory`: Includes `buildTarget`, `prevBuildTarget`
- `UpgraderMemory`: Uses common upgrading flag
- `DefenderMemory`: Base memory for combat units
- `RangerMemory`: Base memory for ranged combat units
- `ExplorerMemory`: Includes `nextRole` for role transitions

## Enhanced Global CreepMemory Interface

The global `CreepMemory` interface in `screeps.d.ts` now extends `BaseCreepMemory` and includes:

```typescript
interface CreepMemory extends BaseCreepMemory {
    role: CreepRole;  // Type-safe role instead of string
    
    // All role-specific properties are included
    sourceTargetId?: Id<Source>;     // For harvesters
    buildTarget?: Id<ConstructionSite>; // For builders
    nextRole?: CreepRole;            // For explorers
    // ... and more
}
```

## Type Safety Features

### 1. Type Guards
```typescript
export function isValidCreepRole(role: string): role is CreepRole {
    return (Object.values(CreepRoleEnum) as string[]).includes(role);
}
```

### 2. Type-Safe Utility Functions
```typescript
// Get creeps by role with full type safety
export function getCreepsByRole<T extends CreepRole>(role: T): Creep[]

// Get counts by role
export function getCreepCountsByRole(): Record<CreepRole, number>
```

### 3. Enhanced SpawnManager
The `SpawnManager` class now uses:
- Type-safe role parameters: `spawnCreep(..., role: CreepRole)`
- Enum values instead of string literals: `CreepRoleEnum.HARVESTER`
- Type-safe creep filtering: `getCreepsByRole(CreepRoleEnum.HARVESTER)`

### 4. Enhanced GameManager
The `GameManager` class now includes:
- Role validation: `isValidCreepRole(creep.memory.role)`
- Enum-based switch statements for better maintainability
- Compile-time checking of role assignments

## Usage Examples

### Spawning Creeps
```typescript
// Old way (error-prone)
spawn.spawnCreep(body, name, { memory: { role: 'harvster' } }); // Typo!

// New way (type-safe)
spawnManager.spawnCreep(spawn, body, 'Harvester', CreepRoleEnum.HARVESTER);
```

### Role Checking
```typescript
// Old way
if (creep.memory.role === 'harvester') { ... }

// New way (type-safe)
if (creep.memory.role === CreepRoleEnum.HARVESTER) { ... }
```

### Getting Creeps by Role
```typescript
// Old way
const harvesters = _.filter(Game.creeps, c => c.memory.role === 'harvester');

// New way (type-safe)
const harvesters = getCreepsByRole(CreepRoleEnum.HARVESTER);
```

## Benefits

### 1. Compile-Time Error Detection
- Typos in role names are caught at compile time
- Invalid role assignments are prevented
- Missing role cases in switch statements are detected

### 2. Better IDE Support
- Autocomplete for role names
- IntelliSense for role-specific memory properties
- Refactoring support across the entire codebase

### 3. Maintainability
- Centralized role definitions
- Easy to add new roles
- Clear documentation of role-specific properties

### 4. Runtime Safety
- Type guards prevent invalid role assignments
- Validation functions ensure data integrity
- Better error messages for debugging

## Migration Guide

### For Existing Code
1. Replace string literals with enum values:
   ```typescript
   // Before
   creep.memory.role = 'harvester';
   
   // After
   creep.memory.role = CreepRoleEnum.HARVESTER;
   ```

2. Use type-safe utility functions:
   ```typescript
   // Before
   _.filter(Game.creeps, c => c.memory.role === 'harvester')
   
   // After
   getCreepsByRole(CreepRoleEnum.HARVESTER)
   ```

### For New Code
1. Always use `CreepRoleEnum` values
2. Leverage role-specific memory interfaces
3. Use type guards for validation
4. Take advantage of IDE autocomplete

## Files Modified
- `src/types.ts`: Core type definitions and utility functions
- `screeps.d.ts`: Enhanced global CreepMemory interface
- `src/spawn.manager.ts`: Type-safe spawning logic
- `src/GameManager.ts`: Type-safe role handling

The new type system maintains full backward compatibility while providing significant improvements in type safety, maintainability, and developer experience.
