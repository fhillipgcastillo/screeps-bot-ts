import { GameManager } from "GameManager";

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
// every 20 ticks, reset creeps action memory
// export const loop = ErrorMapper.wrapLoop(() => {
const gm =  new GameManager()
export const loop = () => {
  gm.tick();
};


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
  getManualSpawner
} from "./manual.spawner";

global.gm = gm;

