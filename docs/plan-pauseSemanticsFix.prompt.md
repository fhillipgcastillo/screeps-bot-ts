# Plan C: Fix Pause Semantics (Phase 1 Issue)

## Overview

Pause logic currently stops the entire tick loop (spawning + creep execution). Per ROADMAP Phase 4 design decisions, pause should stop **only spawn queue** while active creeps continue work. This separation allows manual task injection while the bot operates.

## Problem Statement

**Current Behavior:**
- `GameManager.tick()` has early return when `isPaused` is true
- Entire game loop halts: no spawning, no creep movement, no building
- Creeps freeze mid-action

**Expected Behavior (Per ROADMAP):**
- Pause state affects only spawn queue processing
- Active creeps continue movement, hauling, building, upgrading
- Allows console commands to inject manual tasks while bot works
- Clean separation: pause = planning layer only, not execution layer

**Impact:**
- Phase 4 cannot implement proper strategy switching without this
- Current implementation violates ROADMAP design decision #4
- Console pause is too blunt a tool for debugging/intervention

## Implementation Approach

### 1. Refactor GameManager Pause Semantics

**File:** `src/GameManager.ts`

**Current Code (lines 60–68):**
```typescript
public tick(): void {
  // Check if game is paused - return early if so
  if (this.isPaused) {
    return;
  }

  logger.debug(`Current game tick is ${Game.time}`);
  this.syncActiveCreeps();
  // ... rest of tick
}
```

**Change:**
- Remove early return for pause
- Instead, pass pause state to spawn manager
- Let creep execution continue regardless

**New Logic:**
```typescript
public tick(): void {
  // Don't pause creep execution - only spawn queue can be paused
  logger.debug(`Current game tick is ${Game.time}`);
  this.syncActiveCreeps();
  this.cleanUpMemory();

  // Spawn manager checks its own pause flag
  this.spawnManager.run();

  // Creeps execute regardless of pause state
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

### 2. Add Spawn-Specific Pause State to SpawnManager

**File:** `src/spawn.manager.ts`

**Current Code:**
```typescript
export class SpawnManager {
  private autoSpawnEnabled: boolean = true;
  // ... methods using autoSpawnEnabled
}
```

**Changes:**
- Add `private spawnPaused: boolean = false` property
- Update `run()` method to check both `autoSpawnEnabled` AND `!spawnPaused`
- Add methods: `pauseSpawning()`, `resumeSpawning()`, `isSpawningPaused()`

**New Methods:**
```typescript
/**
 * Pause spawning (active creeps continue work)
 */
public pauseSpawning(): void {
  this.spawnPaused = true;
  debugLog.force("⏸️ Spawning paused - active creeps continue");
}

/**
 * Resume spawning
 */
public resumeSpawning(): void {
  this.spawnPaused = false;
  debugLog.force("▶️ Spawning resumed");
}

/**
 * Check if spawning is currently paused
 */
public isSpawningPaused(): boolean {
  return this.spawnPaused;
}

/**
 * Main entry point for spawn management
 */
public run(): void {
  // Check both conditions: auto-spawn enabled AND not paused
  if (!this.autoSpawnEnabled || this.spawnPaused) {
    return;
  }
  // ... rest of spawn logic
}
```

### 3. Refactor GameManager Pause Methods

**File:** `src/GameManager.ts`

**Current Methods (lines 250–277):**
```typescript
public pauseGame(): void {
  this.isPaused = true;
  logger.force("🛑 Game paused - bot operations stopped");
}

public resumeGame(): void {
  this.isPaused = false;
  logger.force("▶️ Game resumed - bot operations continuing");
}

public togglePause(): void {
  this.isPaused = !this.isPaused;
  // ...
}
```

**Changes:**
- Rename `isPaused` to `isSpawnPaused` for clarity (or keep both for backward compat)
- Update methods to delegate to `spawnManager` instead of managing pause directly
- Rename methods for clarity: `pauseSpawning()`, `resumeSpawning()`, `toggleSpawning()`

**New Methods:**
```typescript
/**
 * Pause spawning only (active creeps continue work)
 */
public pauseSpawning(): void {
  this.spawnManager.pauseSpawning();
}

/**
 * Resume spawning
 */
public resumeSpawning(): void {
  this.spawnManager.resumeSpawning();
}

/**
 * Toggle spawning pause state
 */
public toggleSpawning(): void {
  if (this.spawnManager.isSpawningPaused()) {
    this.spawnManager.resumeSpawning();
  } else {
    this.spawnManager.pauseSpawning();
  }
}

/**
 * Check if spawning is paused
 */
public isSpawningPaused(): boolean {
  return this.spawnManager.isSpawningPaused();
}

// Keep legacy methods for backward compatibility (optional)
public pauseGame(): void {
  this.pauseSpawning();
}

public resumeGame(): void {
  this.resumeSpawning();
}

public togglePause(): void {
  this.toggleSpawning();
}

public isGamePaused(): boolean {
  return this.isSpawningPaused();
}
```

### 4. Export Pause/Resume Commands to Global

**File:** `src/main.ts`

**Current Code (lines 97–106):**
```typescript
global.enableDebug = () => gm.enableDebug();
global.disableDebug = () => gm.disableDebug();
global.toggleDebug = () => gm.toggleDebug();
global.isDebugEnabled = () => gm.isDebugEnabled();
```

**Changes:**
- Add pause/resume commands to global scope
- Export from main for console access

**New Commands:**
```typescript
// Pause/resume spawning - active creeps continue work
global.pauseSpawning = () => gm.pauseSpawning();
global.resumeSpawning = () => gm.resumeSpawning();
global.toggleSpawning = () => gm.toggleSpawning();
global.isSpawningPaused = () => gm.isSpawningPaused();

// Legacy names for backward compatibility (optional)
global.pauseGame = () => gm.pauseGame();
global.resumeGame = () => gm.resumeGame();
global.togglePause = () => gm.togglePause();
global.isGamePaused = () => gm.isGamePaused();
```

**Also add to exports (lines 104–105):**
```typescript
export const pauseSpawning = () => gm.pauseSpawning();
export const resumeSpawning = () => gm.resumeSpawning();
export const toggleSpawning = () => gm.toggleSpawning();
export const isSpawningPaused = () => gm.isSpawningPaused();
```

### 5. Update UI Display

**File:** `src/ui/GameStatsUI.ts`

**Changes:**
- Add spawning pause state display in stats
- Show indicator when spawning is paused but creeps executing

**Example Output:**
```
=== Game Status ===
Tick: 12345
Spawning: ⏸️ PAUSED (creeps active)
...
```

**Implementation:**
```typescript
// In stats display method
const spawnState = gm.isSpawningPaused()
  ? "⏸️ PAUSED (creeps active)"
  : "▶️ ACTIVE";

console.log(`Spawning: ${spawnState}`);
```

### 6. Update Documentation

**File:** `docs/MANUAL_SPAWNING_DOCUMENTATION.md`

**Changes:**
- Correct the pause semantics section
- Remove incorrect statement that creeps freeze
- Add clear explanation of new pause behavior

**Replace Section (lines 271–298):**

**From:**
```markdown
When paused, the bot will stop all operations including:
- Creep AI execution
- Automatic spawning
- Memory cleanup
- All game logic
```

**To:**
```markdown
When spawning is paused (⏸️), the bot will:
- ✅ STOP: Automatic spawning of new creeps
- ✅ STOP: Spawn queue processing
- ✅ CONTINUE: Active creep execution (movement, building, hauling, etc.)
- ✅ CONTINUE: Memory cleanup and utility functions

This allows you to:
- Inject manual tasks via console while bot works
- Prevent spawn queue from interfering
- Debug room state without bot respawning dead creeps
- Test manual spawning without interference
```

**Add New Console Usage Section:**
```markdown
### Console Usage Examples

```javascript
// Pause spawning (creeps keep working)
pauseSpawning();

// Resume spawning
resumeSpawning();

// Check if spawning is paused
isSpawningPaused(); // returns true/false

// Toggle pause state
toggleSpawning();

// Example: manually spawn while paused
pauseSpawning();
spawnHarvester();
spawnBuilder();
resumeSpawning(); // Resume automatic spawning
```
```

## Affected Files Summary

| File | Change | Complexity |
|------|--------|-----------|
| `src/GameManager.ts` | Remove early pause return; delegate to SpawnManager; add new methods | Medium |
| `src/spawn.manager.ts` | Add `spawnPaused` flag; update `run()` check; add pause methods | Medium |
| `src/main.ts` | Export pause commands to global; add to module exports | Low |
| `src/ui/GameStatsUI.ts` | Display pause state in stats | Low |
| `docs/MANUAL_SPAWNING_DOCUMENTATION.md` | Correct pause semantics documentation | Low |

## Testing Strategy

### Unit Tests
1. **Pause spawning doesn't affect creep execution** — Set pause, verify creeps still move
2. **Spawn queue skips when paused** — Set pause, verify no creeps spawn this tick
3. **Resume allows spawning** — Pause → resume → verify spawning resumes
4. **Auto-spawn toggle independent** — Pause spawning; toggle auto-spawn; verify pause still active

### Integration Tests
1. **Pause + manual spawn** — Pause spawning, manually spawn creep, verify it runs
2. **Creep decay continues during pause** — Pause for 100 ticks, verify creep energy decays normally
3. **Memory cleanup during pause** — Pause, verify memory cleanup still runs

### Manual Testing (Console)
```javascript
// Test 1: Pause then verify creeps execute
pauseSpawning();
// Observe: creeps continue moving, hauling, etc.

// Test 2: Verify no new spawns
// Observe: new creeps don't spawn while paused

// Test 3: Manual spawn while paused
pauseSpawning();
spawnHarvester();
// Observe: new harvester spawns despite pause

// Test 4: Resume spawning
resumeSpawning();
// Observe: automatic spawning resumes
```

## Acceptance Criteria

- [ ] `pauseSpawning()` stops spawn queue processing
- [ ] `pauseSpawning()` does NOT freeze active creeps
- [ ] Creeps continue movement, building, hauling while spawning paused
- [ ] `resumeSpawning()` allows automatic spawning to resume
- [ ] Console commands (`pauseSpawning`, `resumeSpawning`, etc.) work from game console
- [ ] UI shows spawning pause state clearly
- [ ] Documentation accurately describes pause behavior
- [ ] No existing tests broken; new tests pass
- [ ] Backward compatibility maintained (legacy `pauseGame()` still works)

## Backward Compatibility Notes

Keep legacy methods as wrappers:
- `pauseGame()` → calls `pauseSpawning()`
- `resumeGame()` → calls `resumeSpawning()`
- `togglePause()` → calls `toggleSpawning()`
- `isGamePaused()` → calls `isSpawningPaused()`

This allows existing scripts/references to continue working.

## Related Work

- **Unblocks**: Phase 4 strategy switching (requires correct pause semantics)
- **Complements**: Phase 3 task queue (pause will affect queue processing, not execution)
- **Alternative**: Could implement full game pause separately later if needed; this is spawn-pause-only

## Time Estimate

- Implementation: 1–2 hours
- Testing: 30 minutes
- Documentation: 30 minutes
- **Total: ~2–2.5 hours**

## Notes

This fix is critical for Phase 4 console control to work correctly. The current implementation violates ROADMAP Design Decision #4. After this fix, Phase 4 strategy switching can properly distinguish between spawn queue changes and game execution changes.
