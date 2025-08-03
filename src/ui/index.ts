import { GameStatsUI, getGameStatsUI, UIDisplayOptions } from "./GameStatsUI";
import { debugLog } from "../utils/Logger";

// Re-export the main UI class and types
export { GameStatsUI, getGameStatsUI, UIDisplayOptions };
export type { GameStatistics, RoomStats } from "./GameStatsUI";

/**
 * Global convenience functions for easy console access
 */

/**
 * Display creep statistics in the console
 * Usage: showCreeps() or showCreeps({ compact: true, showEmptyRoles: true })
 */
export function showCreeps(options?: UIDisplayOptions): void {
  const ui = getGameStatsUI();
  const output = ui.displayCreepStats(options);
  console.log(output);
}

/**
 * Display room statistics in the console
 * Usage: showRooms()
 */
export function showRooms(options?: UIDisplayOptions): void {
  const ui = getGameStatsUI();
  const output = ui.displayRoomStats(options);
  console.log(output);
}

/**
 * Display comprehensive game overview
 * Usage: showStats()
 */
export function showStats(options?: UIDisplayOptions): void {
  const ui = getGameStatsUI();
  const output = ui.displayGameOverview(options);
  console.log(output);
}

/**
 * Display creep stats as visual overlay in a room
 * Usage: showVisual() or showVisual('W1N1', 5, 5)
 */
export function showVisual(roomName?: string, x?: number, y?: number): void {
  const ui = getGameStatsUI();
  const targetRoom = roomName || Object.keys(Game.rooms)[0];

  if (!targetRoom) {
    debugLog.warn("No rooms available for visual display");
    return;
  }

  ui.displayVisualOverlay(targetRoom, x, y);
}

/**
 * Get raw game statistics data
 * Usage: const stats = getStats()
 */
export function getStats() {
  const ui = getGameStatsUI();
  return ui.getGameStatistics();
}

/**
 * Quick creep count display - compact format
 * Usage: creeps()
 */
export function creeps(): void {
  showCreeps({
    compact: true,
    showHeader: false,
    showEmptyRoles: false,
    colorize: true
  });
}

/**
 * Quick room status display
 * Usage: rooms()
 */
export function rooms(): void {
  showRooms({
    showHeader: false,
    colorize: true
  });
}

/**
 * Toggle visual overlay on/off for all rooms
 * Usage: toggleVisual()
 */
let visualEnabled = false;
export function toggleVisual(): void {
  visualEnabled = !visualEnabled;
  debugLog.info(`Visual overlay ${visualEnabled ? 'enabled' : 'disabled'}`);

  if (!visualEnabled) {
    // Clear visuals by not drawing anything
    return;
  }

  // Enable visuals for all rooms
  for (const roomName of Object.keys(Game.rooms)) {
    showVisual(roomName);
  }
}

/**
 * Auto-update visual overlay every tick (call this from main loop)
 */
export function updateVisualOverlay(): void {
  if (!visualEnabled) return;

  for (const roomName of Object.keys(Game.rooms)) {
    showVisual(roomName);
  }
}

/**
 * Display help information for UI commands
 */
export function helpUI(): void {
  const helpText = `
<span style='color:#00ffff'>=== Game Stats UI Help ===</span>

<span style='color:#ffff00'>Basic Commands:</span>
  <span style='color:#66ff66'>showCreeps()</span>     - Show detailed creep statistics
  <span style='color:#66ff66'>showRooms()</span>      - Show room information
  <span style='color:#66ff66'>showStats()</span>      - Show complete game overview
  <span style='color:#66ff66'>creeps()</span>         - Quick creep count (compact)
  <span style='color:#66ff66'>rooms()</span>          - Quick room status

<span style='color:#ffff00'>Visual Commands:</span>
  <span style='color:#66ff66'>showVisual()</span>     - Show stats overlay in first room
  <span style='color:#66ff66'>showVisual('W1N1')</span> - Show overlay in specific room
  <span style='color:#66ff66'>toggleVisual()</span>   - Toggle auto-overlay on/off

<span style='color:#ffff00'>Data Access:</span>
  <span style='color:#66ff66'>getStats()</span>       - Get raw statistics object

<span style='color:#ffff00'>Debug Logging:</span>
  <span style='color:#66ff66'>enableDebug()</span>    - Enable debug console output
  <span style='color:#66ff66'>disableDebug()</span>   - Disable debug console output
  <span style='color:#66ff66'>toggleDebug()</span>    - Toggle debug mode on/off
  <span style='color:#66ff66'>isDebugEnabled()</span> - Check if debug mode is active

<span style='color:#ffff00'>Options (for showCreeps, showRooms, showStats):</span>
  { compact: true }        - Compact display format
  { showEmptyRoles: true } - Show roles with 0 creeps
  { colorize: false }      - Disable colors
  { showHeader: false }    - Hide section headers

<span style='color:#ffff00'>Examples:</span>
  showCreeps({ compact: true, showEmptyRoles: true })
  showStats({ colorize: false })
  showVisual('W1N1', 10, 5)
`;

  console.log(helpText);
}
