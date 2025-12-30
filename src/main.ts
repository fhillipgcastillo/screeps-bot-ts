import { GameManager } from "GameManager";
import { debugLog } from "./utils/logger";
import { BotSettingsManager } from "./utils/BotSettingsManager";

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
// every 20 ticks, reset creeps action memory
// export const loop = ErrorMapper.wrapLoop(() => {
const gm =  new GameManager()
export const loop = () => {
  gm.tick();

  // Generate a pixel when CPU bucket is maxed out
  // This will convert your excess CPU to a resource called pixels. You can use pixels to unlock cosmetics. Alternatively, you can stockpile them and sell them later on.
  if (Game.cpu.generatePixel && Game.cpu.bucket >= 10000) {
    Game.cpu.generatePixel();
  }
};

// ============================================================================
// GLOBAL BOT SETTINGS CONSOLE COMMANDS
// ============================================================================
// Usage in game console:
// bot.setMaxHarvesters(3)          - Set default max harvesters to 3
// bot.setSourceMaxHarvesters('sourceId', 4)  - Set max harvesters for specific source
// bot.resetSourceMaxHarvesters('sourceId')   - Reset specific source to default
// bot.getSettings()                - Display current bot settings

(global as any).bot = {
  setMaxHarvesters: (count: number): string => {
    return BotSettingsManager.setDefaultMaxHarvesters(count);
  },

  setSourceMaxHarvesters: (sourceId: string, count: number): string => {
    return BotSettingsManager.setSourceMaxHarvesters(sourceId, count);
  },

  resetSourceMaxHarvesters: (sourceId: string): string => {
    return BotSettingsManager.resetSourceMaxHarvesters(sourceId);
  },

  getSettings: (): string => {
    return BotSettingsManager.getSettings();
  }
};


import {
  spawnCreep,
  spawnHarvester,
  spawnHauler,
  spawnBuilder,
  spawnUpgrader,
  spawnDefender,
  spawnRanger,
  spawnExplorer,
  getSpawnStatus,
  getAllSpawnStatuses,
  getCurrentCreepCounts,
  needsMoreCreeps,
  getBodyPreview,
  getManualSpawner
} from "./manual.spawner";

import {
  showCreeps,
  showRooms,
  showStats,
  showVisual,
  getStats,
  creeps,
  rooms,
  toggleVisual,
  updateVisualOverlay,
  helpUI,
  getGameStatsUI
} from "./ui";

// Re-export for external use
export {
  spawnCreep,
  spawnHarvester,
  spawnHauler,
  spawnBuilder,
  spawnUpgrader,
  spawnDefender,
  spawnRanger,
  spawnExplorer,
  getSpawnStatus,
  getAllSpawnStatuses,
  getCurrentCreepCounts,
  needsMoreCreeps,
  getBodyPreview,
  getManualSpawner,
  // UI functions
  showCreeps,
  showRooms,
  showStats,
  showVisual,
  getStats,
  creeps,
  rooms,
  toggleVisual,
  updateVisualOverlay,
  helpUI,
  getGameStatsUI
};

// Export debug functions for external use
export const enableDebug = () => gm.enableDebug();
export const disableDebug = () => gm.disableDebug();
export const toggleDebug = () => gm.toggleDebug();
export const isDebugEnabled = () => gm.isDebugEnabled();

global.gm = gm;

// Assign debug functions to global for console access
global.enableDebug = () => gm.enableDebug();
global.disableDebug = () => gm.disableDebug();
global.toggleDebug = () => gm.toggleDebug();
global.isDebugEnabled = () => gm.isDebugEnabled();
global.setDebugLevels = (levels: string | string[]) => debugLog.setLogLevels(levels);
global.getDebugLevels = () => debugLog.getEnabledLevels();

// Assign manual spawner functions to global for console access
global.spawnCreep = spawnCreep;
global.spawnHarvester = spawnHarvester;
global.spawnHauler = spawnHauler;
global.spawnBuilder = spawnBuilder;
global.spawnUpgrader = spawnUpgrader;
global.spawnDefender = spawnDefender;
global.spawnRanger = spawnRanger;
global.spawnExplorer = spawnExplorer;
global.getSpawnStatus = getSpawnStatus;
global.getAllSpawnStatuses = getAllSpawnStatuses;
global.getCurrentCreepCounts = getCurrentCreepCounts;
global.needsMoreCreeps = needsMoreCreeps;
global.getBodyPreview = getBodyPreview;
global.getManualSpawner = getManualSpawner;

// Assign UI functions to global for console access
global.showCreeps = showCreeps;
global.showRooms = showRooms;
global.showStats = showStats;
global.showVisual = showVisual;
global.getStats = getStats;
global.creeps = creeps;
global.rooms = rooms;
global.toggleVisual = toggleVisual;
global.helpUI = helpUI;
global.getGameStatsUI = getGameStatsUI;

