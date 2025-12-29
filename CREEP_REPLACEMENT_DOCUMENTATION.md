# Creep Replacement and Suicide System

## Overview

This system automatically manages creep lifecycle by:
1. Detecting when creeps are about to die (< 30 TTL)
2. Requesting replacement creeps with the same body composition
3. Spawning replacements as a priority
4. Having the dying creep suicide after the replacement finishes spawning

## How It Works

### 1. Detection Phase
When a creep's `ticksToLive` drops below **30 ticks**, the system automatically detects it in the `GameManager.handleDyingCreeps()` method.

### 2. Replacement Request
The system:
- Extracts the dying creep's body parts
- Creates a replacement request with the same role and body composition
- Marks the creep's memory with `replacementRequested: true`
- Adds the request to a priority queue in `SpawnManager`

### 3. Priority Spawning
The `SpawnManager.handleSpawning()` method:
- **Prioritizes replacement requests over normal spawning**
- Attempts to spawn the replacement creep when energy is available
- Uses the exact same body composition as the dying creep
- Marks the dying creep's memory with `replacementSpawned: true` and stores the replacement's name

### 4. Suicide Phase
Once the replacement creep:
- Has been spawned
- Is no longer in the spawning state
The dying creep automatically calls `suicide()` to free up the creep slot immediately

## Memory Properties

Three new properties were added to `BaseCreepMemory`:

```typescript
replacementRequested?: boolean;    // Marks that a replacement has been requested
replacementSpawned?: boolean;      // Marks that the replacement has finished spawning
replacementName?: string;          // Name of the replacement creep
```

## Implementation Details

### SpawnManager Changes

**New Properties:**
- `DYING_THRESHOLD = 30` - TTL threshold for requesting replacements
- `replacementRequests: ReplacementRequest[]` - Queue of pending replacement requests

**New Methods:**
- `requestReplacement(creep: Creep)` - Adds a creep to the replacement queue
- `handleReplacementSpawning(spawn: StructureSpawn)` - Processes replacement spawn requests

**Modified Methods:**
- `handleSpawning()` - Now checks replacement queue first before normal spawning logic

### GameManager Changes

**New Methods:**
- `handleDyingCreeps()` - Checks all creeps for low TTL and manages the replacement/suicide cycle

**Modified Methods:**
- `tick()` - Now calls `handleDyingCreeps()` before memory cleanup

## Benefits

1. **Continuous Population**: Maintains consistent creep numbers without gaps
2. **Resource Efficiency**: Dying creeps suicide immediately after replacement spawns, freeing the slot
3. **Body Preservation**: Replacements have the exact same body composition as the original
4. **Priority System**: Replacements are prioritized over new creep spawning
5. **Energy Optimization**: Only spawns replacements when energy is available

## Example Flow

```
Tick 1470: Harvester123 has 30 TTL
  → Replacement requested
  → Added to spawn queue

Tick 1475: Energy available
  → Spawn begins: Harvester1475
  → Harvester123.memory.replacementSpawned = true
  → Harvester123.memory.replacementName = "Harvester1475"

Tick 1478: Harvester1475 finishes spawning
  → Harvester123.suicide() is called
  → Harvester1475 takes over the role

Result: Only 2 ticks of overlap instead of waiting 30 ticks for natural death
```

## Configuration

The dying threshold can be adjusted by modifying:
```typescript
private static readonly DYING_THRESHOLD = 30;
```

A higher value gives more time for spawning but increases overlap. A lower value reduces overlap but risks not spawning in time.

## Logging

The system logs the following events (visible with debug logging enabled):
- `Replacement requested for dying [role]: [name]`
- `Spawning replacement [role]: [newName] for [oldName]`
- `[oldName] suiciding - replacement [newName] has spawned`

## Future Enhancements

Potential improvements:
- Adjust dying threshold based on spawn queue length
- Handle cases where replacement fails multiple times
- Priority levels for different creep roles
- Memory-based body configurations instead of copying from dying creep
