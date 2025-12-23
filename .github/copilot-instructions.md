# Screeps TypeScript Bot - AI Agent Instructions

## Project Overview
This is a TypeScript-based AI for [Screeps](https://screeps.com/), a programming MMO game. The bot manages autonomous creeps (units) to harvest resources, build structures, defend territory, and expand across multiple rooms.

## Architecture & Core Systems

### Main Game Loop
- **Entry Point**: [src/main.ts](../src/main.ts) exports a `loop()` function called every game tick
- **Game Manager**: [src/GameManager.ts](../src/GameManager.ts) orchestrates all systems via `tick()` method
- **Execution Order**: Memory cleanup → Spawning → Creep role execution → UI updates → Performance monitoring

### Role-Based Creep System
Creeps are assigned specific roles defined in [src/types.ts](../src/types.ts):
- **harvester**: Stationary energy miners at sources
- **hauler**: Transport energy from harvesters to spawn/extensions/towers
- **builder**: Construct and repair structures
- **upgrader**: Upgrade room controller
- **defender/ranger**: Combat units
- **explorer**: Scout adjacent rooms, transition to other roles

Role behaviors are in `src/role.*.ts` files. Each role has dedicated memory interfaces extending `BaseCreepMemory`.

### Spawn Management (Two-Tier System)
1. **SpawnManager** ([src/spawn.manager.ts](../src/spawn.manager.ts)): Automatic spawning based on room level and creep counts
   - Uses [src/levels.handler.ts](../src/levels.handler.ts) for level-based spawn quotas
   - Implements tiered body templates (EMERGENCY/NORMAL/ADVANCED) via [src/utils/energy-bootstrap.ts](../src/utils/energy-bootstrap.ts)
   - Energy reserve system prevents spawn deadlocks at low energy
   - Container caching reduces FIND_STRUCTURES calls by ~50%

2. **ManualSpawner** ([src/manual.spawner.ts](../src/manual.spawner.ts)): Console-accessible manual spawning API
   - Exported to global scope for in-game console use
   - Functions: `spawnHarvester()`, `spawnHauler()`, `getSpawnStatus()`, etc.
   - Auto-selects optimal body parts based on available energy

### Multi-Room Operations
Configured via [src/config/multi-room.config.ts](../src/config/multi-room.config.ts):
- **Exploration Depth**: Controls how far to search (0=current room, 1=adjacent, 2=two levels out)
- **Safety System**: Rooms evaluated for hostile creeps/structures before sending creeps
- **Resource Discovery**: Caches energy sources across accessible rooms
- **Console Commands**: Runtime toggles in [src/utils/consoleCommands.ts](../src/utils/consoleCommands.ts)
  - `toggleMultiRoom()`, `claimRoom()`, `getRemoteHarvestRooms()`
  - Cache management: `enableCache()`, `cacheStatus()`

### Energy Bootstrap & Recovery
[src/utils/energy-bootstrap.ts](../src/utils/energy-bootstrap.ts) handles early-game stability:
- **Recovery Mode**: Activates when harvesters < 3 or energy critically low
- **Tiered Templates**: Spawns cheapest viable creeps during recovery (200 energy minimum)
- **Reserve Thresholds**: Maintains energy buffer to prevent total depletion
- See [PHASE_1_IMPLEMENTATION.md](../PHASE_1_IMPLEMENTATION.md) for design rationale

## Development Workflow

### Build & Deploy
```bash
# Build TypeScript to bundled JS
npm run build

# Watch and auto-deploy to specific destination (from screeps.json)
npm run watch-main      # Deploy to main branch
npm run watch-pserver   # Deploy to private server
npm run watch-sim       # Deploy to simulation

# Sync to local Screeps client (Windows paths)
npm run sync:dlocal     # User: Dileisa
npm run sync:flocal     # User: owner
```

### Configuration
- **screeps.json**: Server credentials and deploy destinations (copy from [screeps.sample.json](../screeps.sample.json))
- **tsconfig.json**: TypeScript compiler settings
- **rollup.config.js**: Bundles TypeScript and uploads via rollup-plugin-screeps

### Testing
```bash
npm run test-unit       # Run mocha unit tests (test/unit/)
npm run test-integration # Currently disabled (see docs/in-depth/testing.md)
```

## Key Conventions & Patterns

### Memory Structure
```typescript
Memory.creeps[name].role          // CreepRole: "harvester" | "hauler" | ...
Memory.creeps[name].working       // Boolean: working vs. collecting state
Memory.creeps[name].sourceTarget  // Id<Source>: assigned energy source
Memory.rooms[roomName].claimed    // Boolean: manually claimed rooms
Memory.rooms[roomName].unsafe     // Boolean: rooms with hostiles
Memory.multiRoomEnabled           // Boolean: runtime toggle for multi-room
```

### Type Safety
- Use `CreepRoleEnum` from [src/types.ts](../src/types.ts) instead of string literals
- Type guard: `isValidCreepRole(role)` validates role strings
- Creep memory extends typed interfaces (e.g., `HarvesterMemory`, `HaulerMemory`)

### Logger System
[src/utils/Logger.ts](../src/utils/Logger.ts) provides centralized logging:
```typescript
import { logger, debugLog } from "./utils/Logger";
logger.info('Standard message');
logger.warn('Warning message');
debugLog.debug('Only shown when debug enabled'); // Check MULTI_ROOM_CONFIG.debugEnabled
```

### Console Command Pattern
Export functions to global scope in [src/main.ts](../src/main.ts) for in-game console access:
```typescript
// In main.ts
export { spawnHarvester, toggleMultiRoom } from "./manual.spawner";

// In Screeps console
spawnHarvester('Spawn1');
toggleMultiRoom();
```

### UI System
[src/ui/](../src/ui/) exports visual overlay functions:
- `updateVisualOverlay()`: Called each tick by GameManager
- `showCreeps()`, `showRooms()`, `showStats()`: Console-accessible stats
- See [docs/ui/game-stats-ui.md](../docs/ui/game-stats-ui.md)

## Common Pitfalls & Solutions

### Spawn Deadlock Prevention
**Problem**: Room runs out of energy with no harvesters to collect more
**Solution**: Energy reserve system in [src/utils/energy-bootstrap.ts](../src/utils/energy-bootstrap.ts)
- `getEnergyReserveThreshold(level)`: Minimum energy buffer per level
- `canSafelySpawn(spawn, cost)`: Checks if spawning won't deplete reserves
- `isInRecoveryMode()`: Triggers emergency template usage

### Multi-Room CPU Spikes
**Problem**: Multi-room operations cause CPU limit violations
**Solution**: Configuration limits in [src/config/multi-room.config.ts](../src/config/multi-room.config.ts)
- `MAX_MULTI_ROOM_HARVESTERS/HAULERS`: Cap concurrent multi-room creeps
- `SAFETY_CHECK_INTERVAL`: Reduce frequency of expensive room scans
- `EXPLORATION_DEPTH`: Lower to 1 (adjacent only) for CPU savings

### Memory Leaks
**Problem**: Dead creeps/structures leave stale memory
**Solution**: Cleanup in [src/GameManager.ts](../src/GameManager.ts) `cleanUpMemory()`
- Also see [src/utils/memoryHelpers.ts](../src/utils/memoryHelpers.ts) `runConditionalCleanup()`

## Documentation Structure
- **docs/**: Project-specific documentation
  - [ROADMAP.md](../docs/ROADMAP.md): Strategic development plan
  - [CREEP_TYPES_DOCUMENTATION.md](../docs/CREEP_TYPES_DOCUMENTATION.md): Role system details
  - [MANUAL_SPAWNING_DOCUMENTATION.md](../docs/MANUAL_SPAWNING_DOCUMENTATION.md): Spawning API guide
  - [MULTI_ROOM_HARVESTING_IMPLEMENTATION_PLAN.md](../docs/MULTI_ROOM_HARVESTING_IMPLEMENTATION_PLAN.md): Multi-room design
- **docs/screeps_docs/**: Official Screeps TypeScript starter documentation

## Integration Points

### Game API Usage
- Screeps API typings: `@types/screeps` (see [screeps.d.ts](../screeps.d.ts))
- Global objects: `Game`, `Memory`, `RawMemory`
- Common patterns:
  ```typescript
  Game.creeps[name]                    // Access creeps
  Game.rooms[roomName].find(FIND_*)    // Find objects
  Game.spawns[spawnName].spawnCreep()  // Spawn units
  ```

### Error Handling
- Source maps enabled via [src/utils/ErrorMapper.ts](../src/utils/ErrorMapper.ts)
- Wrap loop in ErrorMapper.wrapLoop() for stack traces (currently disabled)

## When Adding Features

1. **New Creep Role**:
   - Add to `CreepRole` union and `CreepRoleEnum` in [src/types.ts](../src/types.ts)
   - Create memory interface extending `BaseCreepMemory`
   - Implement `role.*.ts` file with behavior logic
   - Add to [src/GameManager.ts](../src/GameManager.ts) `runCreep()` switch
   - Update [src/levels.handler.ts](../src/levels.handler.ts) spawn quotas

2. **New Console Command**:
   - Implement in [src/utils/consoleCommands.ts](../src/utils/consoleCommands.ts)
   - Export from [src/main.ts](../src/main.ts)
   - Add global type declaration

3. **New Config Option**:
   - Add to [src/config/multi-room.config.ts](../src/config/multi-room.config.ts)
   - Export as const or in `MULTI_ROOM_CONFIG` object
   - Document in relevant markdown files

## Quick Reference

**Node Version**: 10.x or 12.x (legacy requirement, use nvm)
There's a `.nvmrc` file for convenience.
**Package Manager**: npm or yarn
**Bundler**: Rollup with rollup-plugin-screeps
**Test Framework**: Mocha + Chai + Sinon
but currently not adding tests
