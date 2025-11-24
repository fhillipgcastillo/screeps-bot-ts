# Game Statistics UI (GameStatsUI)

Comprehensive documentation for the Game Statistics UI system included in `/src/ui/*`.

This document covers architecture, API reference, usage examples, configuration options, visual overlay behavior, integration points with the Screeps game loop, debugging integration and best practices.

## Technical overview

### Purpose
The Game Statistics UI provides a developer-facing interface to inspect the current Screeps world state (creep counts, room energy, spawns, etc.) and to render that information both as text (console-friendly) and as an in-game visual overlay drawn into room visuals.

### System architecture

ASCII diagram (high-level):

```
+-----------------------+        +----------------+
| Screeps Game Loop     | <----> | GameStatsUI    |
| (Game, Game.rooms,    |        | (singleton)    |
|  Game.time, creeps)   |        +----------------+
+-----------------------+               ^   ^
                                        |   |
                                        |   +---> Visual Overlay (room.visual)
                                        +-------> Console/Text Output
```

Key points:
- `GameStatsUI` is a singleton (access via `getGameStatsUI()` or `GameStatsUI.getInstance()`).
- It reads game state directly (via global `Game`, `Game.rooms`) and a helper `getCurrentCreepCounts()` from `manual.spawner` to determine creep role counts.
- It caches computed statistics for the duration of a single tick to avoid repeated expensive computations.

### Key components
- `GameStatsUI` (class) — core implementation that exposes public methods to fetch statistics, format them for console output, and render visual overlays.
- `UIDisplayOptions` (interface) — options object used to customize console output formatting.
- `getGameStatsUI()` — convenience factory that returns the singleton instance.
- `index.ts` (in `/src/ui`) — convenience global functions that wrap `GameStatsUI` methods for easy console access (e.g., `showCreeps()`, `showStats()`, `toggleVisual()`).

### Dependencies
- `Game` global (Screeps runtime)
- `manual.spawner` helper (exports `getCurrentCreepCounts()`)
- `Logger` (in `/src/utils/Logger.ts`) for debug logging integration via `debugLog` helper

## API Reference

All public methods presented here are available on the `GameStatsUI` singleton. Use `import { GameStatsUI, getGameStatsUI } from 'src/ui/GameStatsUI'` or the helpers exported from `src/ui/index.ts`.

### Types

- `UIDisplayOptions`

  | Property | Type | Default | Description |
  |---|---:|---:|---|
  | `showHeader` | boolean | `true` | Whether to include a header line in text outputs |
  | `showTotal` | boolean | `true` | Show total creep count (text outputs) |
  | `showEmptyRoles` | boolean | `false` | Include roles with zero creeps in output |
  | `colorize` | boolean | `true` | Use HTML span color tags suitable for Screeps console rendering |
  | `compact` | boolean | `false` | Use compact single-line role output in some displays |

- `RoomStats`

  | Field | Type | Description |
  |---|---:|---|
  | `name` | string | Room name (e.g. 'W1N1') |
  | `energyAvailable` | number | Current energy in room |
  | `energyCapacity` | number | Total energy capacity of room |
  | `controllerLevel` | number? | Controller level (if present) |
  | `spawns` | number | Number of owned spawns in the room |

- `GameStatistics`

  | Field | Type | Description |
  |---|---:|---|
  | `creepCounts` | Record<string, number> | Map of creep role => count (uses project's `CreepRole` type) |
  | `totalCreeps` | number | Sum of all creep counts |
  | `roomStats` | RoomStats[] | Array of room summaries |
  | `gameTime` | number | Current `Game.time` when stats were gathered |

### Methods

All methods below are instance methods on `GameStatsUI`. Prefer calling via `getGameStatsUI()` or through the convenience exports in `/src/ui/index.ts`.

- `public static getInstance(): GameStatsUI`
  - Returns the singleton `GameStatsUI` instance.

- `public getGameStatistics(): GameStatistics`
  - Description: Gathers and returns a snapshot of current game statistics. Caches results for the current tick so repeated calls within the same tick are cheap.
  - Parameters: none
  - Returns: `GameStatistics`
  - Example:

```ts
import { getGameStatsUI } from '../src/ui/GameStatsUI';

const stats = getGameStatsUI().getGameStatistics();
console.log(stats.creepCounts);
```

- `public displayCreepStats(options?: UIDisplayOptions): string`
  - Description: Returns a formatted string summarizing creep role counts.
  - Parameters:
    - `options` — partial `UIDisplayOptions` to customize output
  - Returns: formatted `string` suitable for console output
  - Example:

```ts
const ui = getGameStatsUI();
const output = ui.displayCreepStats({ compact: true, showEmptyRoles: true });
console.log(output); // prints colored HTML spans in Screeps console
```

- `public displayRoomStats(options?: UIDisplayOptions): string`
  - Description: Returns a formatted string with room energy, controller and spawn counts.
  - Parameters: `options` — partial `UIDisplayOptions`
  - Returns: `string`

Example:

```ts
console.log(getGameStatsUI().displayRoomStats({ colorize: false }));
```

- `public displayGameOverview(options?: UIDisplayOptions): string`
  - Description: High-level combined overview (creeps + rooms). By default it includes a header with the current tick.
  - Parameters: `options` — partial `UIDisplayOptions`
  - Returns: `string`

Example:

```ts
const summary = getGameStatsUI().displayGameOverview();
console.log(summary);
```

- `public displayVisualOverlay(roomName: string, x?: number, y?: number): void`
  - Description: Draws a small textual overlay into the specified room's `RoomVisual` at coordinates `(x,y)`. Useful for in-world status displays.
  - Parameters:
    - `roomName` — string, required — the target room to draw in
    - `x` — number, optional — x coordinate (default `1`)
    - `y` — number, optional — y coordinate (default `1`)
  - Returns: `void`
  - Behavior details:
    - Skips rendering if the room is not visible (i.e., `Game.rooms[roomName]` is falsy).
    - Renders a title (`Creep Stats`) and non-zero role counts followed by total.
    - Uses `visual.text()` with configured colors and font sizes.

Example:

```ts
// Draw overlay in room 'W1N1' at x=2, y=2
getGameStatsUI().displayVisualOverlay('W1N1', 2, 2);
```

### Convenience wrapper functions (from `src/ui/index.ts`)

The module `/src/ui/index.ts` exports a set of global helper functions intended for quick console access. These make it convenient to call UI functions from the Screeps console or to wire into your main loop.

| Function | Signature | Description |
|---|---|---|
| `showCreeps` | `showCreeps(options?: UIDisplayOptions): void` | Logs creep stats to console using `displayCreepStats` |
| `showRooms` | `showRooms(options?: UIDisplayOptions): void` | Logs room stats to console using `displayRoomStats` |
| `showStats` | `showStats(options?: UIDisplayOptions): void` | Logs game overview using `displayGameOverview` |
| `showVisual` | `showVisual(roomName?: string, x?: number, y?: number): void` | Draws visual overlay in specified room or first visible room |
| `getStats` | `getStats(): GameStatistics` | Returns raw `GameStatistics` object from `getGameStatistics()` |
| `creeps` | `creeps(): void` | Quick compact creep summary (preconfigured options) |
| `rooms` | `rooms(): void` | Quick room status summary (preconfigured options) |
| `toggleVisual` | `toggleVisual(): void` | Toggles auto visual drawing (global state in module) |
| `updateVisualOverlay` | `updateVisualOverlay(): void` | When visual is toggled on, call this every tick in your main loop to refresh visuals |
| `helpUI` | `helpUI(): void` | Prints a help string listing all helper functions and options |

Example usage from Screeps console:

```txt
> showCreeps({ compact: true })
> showVisual('W1N1', 5, 5)
> toggleVisual()
```

## User Guide

### Setup

1. Import the helper module in your main file or call functions from the Screeps console.

```ts
import * as UI from './src/ui';

// or import specific helpers
import { showStats, toggleVisual } from './src/ui';
```

2. To enable debug logging (affects `debugLog` output only), configure the logger at startup:

```ts
import { debugLog } from './src/utils/Logger';

debugLog.setDebug(true);
debugLog.setPrefix('UI');
```

3. Optionally enable auto-update of visuals from your game loop (call `updateVisualOverlay()` each tick):

```ts
import { updateVisualOverlay, toggleVisual } from './src/ui';

// in your main loop
if (Game.time % 1 === 0) {
  updateVisualOverlay();
}

// toggle visuals on during development
toggleVisual();
```

### Common use cases

- Quick console summary of creeps:

```ts
creeps(); // calls showCreeps with compact options
```

- Show full game overview:

```ts
showStats();
```

- Draw visual overlay for a specific room:

```ts
showVisual('W2N3', 2, 4);
```

- Periodically refresh visuals (recommended in dev only):

```ts
// in main
updateVisualOverlay();
```

### Configuration options summary

| Option | Type | Default | Notes |
|---|---:|---:|---|
| `showHeader` | boolean | `true` | Controls header inclusion in text outputs |
| `showTotal` | boolean | `true` | Controls displaying total creep count |
| `showEmptyRoles` | boolean | `false` | Toggle printing roles with 0 count |
| `colorize` | boolean | `true` | Uses HTML span color tags for console coloring |
| `compact` | boolean | `false` | Compact text layouts (shorter, single-line summaries) |

### Troubleshooting

- No visuals appear:
  - Verify the room is visible (Game.rooms[roomName] must be truthy).
  - Ensure visuals are being requested each tick or `displayVisualOverlay` was invoked while the room was visible.

- Console output shows HTML tags literally in some environments:
  - Some console renderers may not interpret HTML spans. Set `colorize: false` to disable color tags.

- Stats appear stale or do not update within tick:
  - `GameStatsUI` caches statistics for the current tick. The cache is reset when `Game.time` advances. If you need repeated fresh reads within the same tick, call `getGameStatistics()` but be aware it intentionally caches to avoid unnecessary work.

### Performance considerations

- The UI pulls room data and calls `getCurrentCreepCounts()` (from `manual.spawner`). If you have a large number of rooms, rendering visuals for all rooms each tick may be expensive. Consider limiting visual updates to debug ticks or to only rooms of interest.
- `displayVisualOverlay()` uses `RoomVisual.text()` which is cheap per call, but many calls per tick across many rooms can affect CPU. Batch or throttle visual updates if needed.

## Integration Guide

### Incorporating into existing code

1. Import helpers in your `main.ts` or manager modules and call the wrapper functions from the console or the main loop.

```ts
import { showStats, updateVisualOverlay, toggleVisual } from './src/ui';

// example main loop snippet
export function loop() {
  // ... your existing logic

  // optionally update visuals every tick
  updateVisualOverlay();
}
```

2. For one-off overlays, call `showVisual(roomName, x, y)` from console or code.

### Event handling and lifecycle

- The UI does not register hooks or events. It is intended to be called directly from your main loop or console commands.
- Because the UI accesses live `Game` objects, it should only be called during the Screeps game loop (i.e., not in code executed outside the Screeps runtime).

### Memory management

- `GameStatsUI` contains minimal internal state:
  - `lastUpdateTick` — number, used for simple tick-level caching
  - `cachedStats` — `GameStatistics | null`, cached snapshot for the current tick

- This cache is intentionally short-lived (per-tick) and safe to keep in-memory since Screeps environment resets global variables per shard tick.

### Visual rendering lifecycle

- `displayVisualOverlay()` writes to `room.visual` which persists for the tick and is erased/updated by the Screeps engine automatically each tick.
- To maintain a persistent-looking overlay across ticks you must call `displayVisualOverlay()` each tick (for the room when visible).

## Debug logging integration

- Use the project's `Logger` via `debugLog` (from `src/utils/Logger.ts`). The UI itself uses `debugLog` (see `/src/ui/index.ts`) to report certain state transitions (e.g., toggling visuals).
- Enable debug logging at startup to see info/warn/debug logs produced by UI wrappers:

```ts
import { debugLog } from './src/utils/Logger';
debugLog.setDebug(true);
debugLog.setPrefix('GameStatsUI');
```

Table: Logger functions available

| Function | Description |
|---|---|
| `debugLog.debug(msg, ...args)` | Debug-level message (shown only when debug is enabled) |
| `debugLog.info(msg, ...args)` | Informational messages (shown only when debug is enabled) |
| `debugLog.warn(msg, ...args)` | Warnings (shown only when debug is enabled) |
| `debugLog.error(msg, ...args)` | Errors (always shown) |
| `debugLog.force(msg, ...args)` | Force log regardless of debug mode |
| `debugLog.setDebug(boolean)` | Enable/disable debug mode |

## Best practices

- Use the UI for development and operator-level visibility; avoid rendering visuals for all rooms every tick in production unless necessary.
- Keep `colorize: false` for logs intended to be consumed by automated tooling or outside environments that don't render HTML tags.
- Prefer `getGameStatistics()` when you need programmatic access to stats for decision making (not just display). This returns structured data you can use in logic.
- When calling `displayVisualOverlay()` from the main loop, guard the call with visibility checks to avoid unnecessary no-op work:

```ts
if (Game.rooms[roomName]) {
  getGameStatsUI().displayVisualOverlay(roomName, 1, 1);
}
```

## Examples

Console examples:

```txt
> showCreeps()
> showCreeps({ compact: true, showEmptyRoles: true })
> showRooms({ colorize: false })
> showVisual('W1N1')
> toggleVisual()
> getStats()
```

Programmatic example (main loop integration):

```ts
import { updateVisualOverlay, getStats } from './src/ui';

export function loop() {
  // ... game logic

  // debug-only visuals
  if (Memory.debug && Game.time % 5 === 0) {
    updateVisualOverlay();
  }

  // use stats for decisions
  const stats = getStats();
  if (stats.totalCreeps < 5) {
    // spawn more harvester logic
  }
}
```

## Appendix: Quick reference

- Get UI instance:

```ts
import { getGameStatsUI } from './src/ui/GameStatsUI';
```

- Helper module exports:

```ts
import * as UI from './src/ui';
// UI.showStats(), UI.toggleVisual(), UI.helpUI(), etc.
```

---

If you want, I can also:
- Add brief unit tests for `GameStatsUI` formatting functions.
- Add a short README snippet to the root README referencing this file.

End of GameStatsUI documentation.
