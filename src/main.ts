import { GameManager } from "GameManager";
const gm =  new GameManager()


// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
// every 20 ticks, reset creeps action memory
// export const loop = ErrorMapper.wrapLoop(() => {
export const loop = () => {
  gm.tick();
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

// Multi-room debugging and utilities
import {
  debugMultiRoomOperations,
  runMultiRoomDiagnostics,
  exportMultiRoomStats,
  clearPerformanceHistory
} from "./utils/multi-room-debug";
import { clearResourceCache } from "./utils/multi-room-resources";
import { MULTI_ROOM_CONFIG } from "./config/multi-room.config";
import {
  initializeConsoleCommands,
  toggleMultiRoom,
  enableMultiRoom,
  disableMultiRoom,
  getMultiRoomStatus,
  resetMultiRoomCache
} from "./utils/consoleCommands";

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
  getGameStatsUI,
  // Multi-room debugging functions
  debugMultiRoomOperations,
  runMultiRoomDiagnostics,
  exportMultiRoomStats,
  clearPerformanceHistory,
  clearResourceCache,
  MULTI_ROOM_CONFIG,
  // Multi-room console commands
  toggleMultiRoom,
  enableMultiRoom,
  disableMultiRoom,
  getMultiRoomStatus,
  resetMultiRoomCache
};

// Export debug functions for external use
export const enableDebug = () => gm.enableDebug();
export const disableDebug = () => gm.disableDebug();
export const toggleDebug = () => gm.toggleDebug();
export const isDebugEnabled = () => gm.isDebugEnabled();

global.gm = gm;

// Initialize console commands for multi-room control
initializeConsoleCommands();

// Assign debug functions to global for console access
global.enableDebug = () => gm.enableDebug();
global.disableDebug = () => gm.disableDebug();
global.toggleDebug = () => gm.toggleDebug();
global.isDebugEnabled = () => gm.isDebugEnabled();

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

// Assign multi-room debugging functions to global for console access
global.debugMultiRoom = debugMultiRoomOperations;
global.runMultiRoomDiagnostics = runMultiRoomDiagnostics;
global.exportMultiRoomStats = exportMultiRoomStats;
global.clearPerformanceHistory = clearPerformanceHistory;
global.clearResourceCache = clearResourceCache;
global.multiRoomConfig = MULTI_ROOM_CONFIG;

