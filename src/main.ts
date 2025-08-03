import { GameManager } from "GameManager";

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
// every 20 ticks, reset creeps action memory
// export const loop = ErrorMapper.wrapLoop(() => {
const gm =  new GameManager()
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

global.gm = gm;

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

