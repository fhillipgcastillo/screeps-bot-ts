# Manual Spawning System Documentation

## Overview

The Manual Spawning System provides public functions that enable manual control over creep spawning in your Screeps TypeScript bot. This system works alongside your existing automatic spawning logic and allows you to manually trigger the spawning of specific creep types when needed.

## Key Features

- **Generic spawning function**: `spawnCreep(creepType)` for any creep type
- **Specific convenience functions**: `spawnBuilder()`, `spawnUpgrader()`, `spawnHauler()`, etc.
- **Automatic body configuration**: Selects optimal body parts based on available energy
- **Spawn availability checking**: Validates spawn status and energy levels
- **Integration with existing system**: Works with your current SpawnManager and type system
- **Detailed status reporting**: Returns comprehensive spawn results and status information

## Quick Start

### Console Usage

From the Screeps console, you can use these functions directly:

```javascript
// Import the main module to access functions
const main = require('main');

// Spawn specific creep types
main.spawnHarvester();
main.spawnBuilder();
main.spawnUpgrader();
main.spawnHauler();

// Generic spawning
main.spawnCreep('harvester');
main.spawnCreep('builder', 'Spawn1'); // Use specific spawn

// Check spawn status
main.getSpawnStatus('Spawn1');
main.getAllSpawnStatuses();

// Check current creep counts
main.getCurrentCreepCounts();

// Preview what body would be used
main.getBodyPreview('harvester');
```

### TypeScript Usage

In your TypeScript code:

```typescript
import {
  spawnHarvester,
  spawnBuilder,
  getSpawnStatus,
  ManualSpawner
} from './manual.spawner';

// Use convenience functions
const result = spawnHarvester();
if (result.success) {
  console.log(`Spawned ${result.creepName} with ${result.energyCost} energy`);
}

// Use the class directly
const spawner = new ManualSpawner();
const builderResult = spawner.spawnBuilder('Spawn1');

// Access through GameManager
const gm = global.gm; // Your GameManager instance
const status = gm.manualSpawner.getSpawnStatus('Spawn1');
```

## API Reference

### Core Functions

#### `spawnCreep(creepType, spawnName?, customBody?, customName?)`

Generic function to spawn any creep type.

**Parameters:**
- `creepType: CreepRole` - The type of creep to spawn ('harvester', 'builder', etc.)
- `spawnName?: string` - Optional specific spawn to use (auto-selects best if not provided)
- `customBody?: BodyPartConstant[]` - Optional custom body configuration
- `customName?: string` - Optional custom name for the creep

**Returns:** `SpawnResult` object with success status, error codes, and spawn details

**Example:**
```typescript
const result = spawnCreep('harvester', 'Spawn1');
if (result.success) {
  console.log(`Successfully spawned ${result.creepName}`);
} else {
  console.log(`Failed: ${result.message}`);
}
```

### Convenience Functions

All convenience functions accept optional `spawnName` and `customBody` parameters:

- `spawnHarvester(spawnName?, customBody?)` - Spawn a harvester
- `spawnHauler(spawnName?, customBody?)` - Spawn a hauler
- `spawnBuilder(spawnName?, customBody?)` - Spawn a builder
- `spawnUpgrader(spawnName?, customBody?)` - Spawn an upgrader
- `spawnDefender(spawnName?, customBody?)` - Spawn a defender
- `spawnRanger(spawnName?, customBody?)` - Spawn a ranger
- `spawnExplorer(spawnName?, customBody?, nextRole?)` - Spawn an explorer

### Status and Information Functions

#### `getSpawnStatus(spawnName)`

Get detailed status of a specific spawn.

**Returns:**
```typescript
{
  available: boolean;           // Is spawn free to use
  spawning: boolean;           // Is spawn currently spawning
  currentSpawningCreep?: string; // Name of creep being spawned
  energyAvailable: number;     // Current energy in room
  energyCapacity: number;      // Maximum energy capacity
  queueLength: number;         // Spawn queue length (always 0 or 1)
}
```

#### `getAllSpawnStatuses()`

Get status of all spawns in the game.

#### `getCurrentCreepCounts()`

Get current count of creeps by role.

**Returns:**
```typescript
{
  harvester: number;
  hauler: number;
  builder: number;
  upgrader: number;
  defender: number;
  ranger: number;
  explorer: number;
}
```

#### `needsMoreCreeps(role, roomName?)`

Check if more creeps of a specific type are needed based on room level requirements.

#### `getBodyPreview(role, availableEnergy?, energyCapacity?)`

Preview what body configuration would be used for a creep type.

**Returns:**
```typescript
{
  body: BodyPartConstant[];    // Body parts that would be used
  cost: number;                // Energy cost
  tier: string;                // Configuration tier (emergency/basic/advanced/optimal)
}
```

## Body Configurations

The system automatically selects optimal body configurations based on available energy:

### Harvester Bodies
- **Emergency (250)**: `[WORK, WORK, MOVE]`
- **Basic (300)**: `[WORK, WORK, MOVE, MOVE]`
- **Advanced (350)**: `[WORK, WORK, WORK, MOVE]`
- **Optimal (500)**: `[WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE]`

### Hauler Bodies
- **Emergency (150)**: `[CARRY, MOVE, MOVE]`
- **Basic (300)**: `[CARRY, CARRY, CARRY, MOVE, MOVE, MOVE]`
- **Advanced (350)**: `[CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE]`
- **Optimal (450)**: `[CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE]`

### Builder Bodies
- **Emergency (250)**: `[WORK, CARRY, MOVE, MOVE]`
- **Basic (300)**: `[WORK, WORK, CARRY, MOVE]`
- **Advanced (400)**: `[WORK, CARRY, WORK, CARRY, MOVE, MOVE]`
- **Optimal (500)**: `[WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE]`

### Upgrader Bodies
- **Emergency (250)**: `[WORK, CARRY, MOVE, MOVE]`
- **Basic (300)**: `[WORK, WORK, CARRY, MOVE]`
- **Advanced (450)**: `[WORK, CARRY, CARRY, WORK, WORK, MOVE]`
- **Optimal (500)**: `[WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE]`

### Combat Bodies
- **Defender Emergency (110)**: `[TOUGH, ATTACK, MOVE]`
- **Ranger Emergency (210)**: `[TOUGH, RANGED_ATTACK, MOVE]`

## Integration with Existing System

The manual spawning system is designed to work alongside your existing automatic spawning logic:

1. **No Conflicts**: Manual spawning checks spawn availability and won't interfere with automatic spawning
2. **Shared Configuration**: Uses the same body configurations and naming conventions as your SpawnManager
3. **Type Safety**: Fully integrated with your existing CreepRole type system
4. **Memory Compatibility**: Creates creeps with the same memory structure as automatic spawning

## Error Handling

All spawning functions return detailed error information:

```typescript
interface SpawnResult {
  success: boolean;
  code: ScreepsReturnCode;
  message: string;
  creepName?: string;
  energyCost?: number;
  bodyParts?: BodyPartConstant[];
}
```

Common error scenarios:
- Spawn not found or busy
- Insufficient energy
- Invalid creep type
- Room capacity limits

## Best Practices

1. **Check Status First**: Use `getSpawnStatus()` to verify spawn availability
2. **Monitor Energy**: Check energy levels before attempting expensive spawns
3. **Use Convenience Functions**: Prefer `spawnHarvester()` over `spawnCreep('harvester')`
4. **Handle Errors**: Always check the `success` field in spawn results
5. **Consider Room Needs**: Use `needsMoreCreeps()` to avoid over-spawning

## Examples

### Basic Spawning
```typescript
// Spawn a harvester using the best available spawn
const result = spawnHarvester();
console.log(result.message);
```

### Advanced Spawning with Custom Configuration
```typescript
// Spawn a custom builder with specific body
const customBody = [WORK, WORK, CARRY, CARRY, MOVE, MOVE];
const result = spawnBuilder('Spawn1', customBody);

if (result.success) {
  console.log(`Spawned custom builder: ${result.creepName}`);
  console.log(`Energy cost: ${result.energyCost}`);
} else {
  console.log(`Failed to spawn: ${result.message}`);
}
```

### Checking Room Status Before Spawning
```typescript
// Check if we need more builders before spawning
if (needsMoreCreeps('builder')) {
  const status = getSpawnStatus('Spawn1');
  if (status && status.available && status.energyAvailable >= 300) {
    const result = spawnBuilder('Spawn1');
    console.log(`Builder spawn result: ${result.message}`);
  }
}
```

## Game Pause/Resume Functionality

The GameManager now includes pause/resume functionality for debugging and temporary control:

### Console Usage
```javascript
const main = require('main');

// Pause the entire game loop
main.pauseGame();

// Resume the game loop
main.resumeGame();

// Toggle pause state
main.togglePause();

// Check if game is paused
main.isGamePaused(); // returns true/false
```

### Direct GameManager Usage
```typescript
const gm = global.gm; // Your GameManager instance

gm.pauseGame();     // Pause all bot operations
gm.resumeGame();    // Resume all bot operations
gm.togglePause();   // Toggle pause state
gm.isGamePaused();  // Check current state
```

When paused, the bot will stop all operations including:
- Creep AI execution
- Automatic spawning
- Memory cleanup
- All game logic

This is useful for:
- Debugging specific game states
- Temporarily stopping bot operations
- Testing manual spawning without interference
- Analyzing room conditions without changes
