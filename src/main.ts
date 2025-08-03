import { ErrorMapper } from "utils/ErrorMapper";
// import * as _ from "lodash";

import spawnManager from "./spawn.manager";
import roleHarvester from "./role.harvester_stationary";
import roleHauler from "./role.hauler";
import roleUpgrader from "./role.upgrader";
import roleBuilder from "./role.builder";
import roleExplorer from "role.explorer";
import roleDefender from "role.defender";
import roleRanger from "role.ranger";
import { GameManager } from "GameManager";

// declare global {
//   /*
//     Example types, expand on these or remove them and add your own.
//     Note: Values, properties defined here do no fully *exist* by this type definiton alone.
//           You must also give them an implemention if you would like to use them. (ex. actually setting a `role` property in a Creeps memory)

//     Types added in this `global` block are in an ambient, global context. This is needed because `main.ts` is a module file (uses import or export).
//     Interfaces matching on name from @types/screeps will be merged. This is how you can extend the 'built-in' interfaces from @types/screeps.
//   */
//   // Memory extension samples
//   interface Memory {
//     uuid: number;
//     log: any;
//   }

//   interface CreepMemory {
//     role: string;
//     room: string;
//     working: boolean;

//     [name: string]: any;
//     building?: boolean;
//     upgrading?: boolean;
//     target?: Id<_HasId>;
//     harvesting?: boolean;
//     source?: Id<Source>;
//   }

//   // Syntax for adding proprties to `global` (ex "global.log")
//   namespace NodeJS {
//     interface Global {
//       log: any;
//      gm: GameManager;
//     }
//   }
// }

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
// every 20 ticks, reset creeps action memory
// export const loop = ErrorMapper.wrapLoop(() => {
const gm =  new GameManager()
export const loop = () => {
  gm.tick();
};

// to use the the following methods fromt he CLI/Terminal/Console we need to import the main then we get access to those
// for example: `require('main').spawnManager`
// we could also change to use `Game.creepManager = require('CreepManager');`
// export { spawnManager, roleHarvester, roleHauler, roleUpgrader, roleBuilder, roleExplorer, roleDefender, roleRanger };

// Export manual spawning functions for console access
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
  ManualSpawner,
  getManualSpawner
} from "./manual.spawner";

global.gm = gm;
