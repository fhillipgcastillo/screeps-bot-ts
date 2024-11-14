import { ErrorMapper } from "utils/ErrorMapper";
// import * as _ from "lodash";

import spawnManager from "./spawn.manager";
import roleHarvester from "./role.harvester_stationary";
import roleHauler from "./role.hauler";
import roleUpgrader from "./role.upgrader";
import roleBuilder from "./role.builder";

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
//     }
//   }
// }

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  console.log(`Current game tick is ${Game.time}`);

  const activeCreeps = _.filter(Game.creeps, ((creep: Creep) => !creep.spawning));

  for (var creepName in Memory.creeps) {
    if (!Game.creeps[creepName]) {
      delete Memory.creeps[creepName];
      console.log('Clearing non-existing creep memory:', creepName);
    }
  }

  // auto spawn harvesters
  spawnManager.run();
  for (let name in Game.spawns) {
    const spawn = Game.spawns[name];

    if (spawn.room?.controller) {
      //auto activate safe mode
      if (spawn.room.controller.level >= 2 && spawn.room.controller.safeModeAvailable) {
        spawn.room.controller.activateSafeMode();
      }
      // if (spawn.room.controller.level === 3) {
      //     var tower = Game.getObjectById('2702f7754f7e3bbdd0f32215');
      //     if (tower) {
      //         // heal
      //         var closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, { filter: (structure) => structure.hits < structure.hitsMax })
      //         if (closestDamagedStructure) {
      //             tower.repair(closestDamagedStructure);
      //         }

      //         // attack
      //         var closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
      //         if (closestHostile) {
      //             tower.attack(closestHostile);
      //         }

      //     }
      // }
    }
    for (var creepName in activeCreeps) {
      var creep = activeCreeps[creepName];
      if (creep.memory.role == 'harvester') {
        roleHarvester.run(creep);
      } else if (creep.memory.role == 'hauler') {
        roleHauler.run(creep);
      } else if (creep.memory.role == 'upgrader') {
        roleUpgrader.run(creep);
      } else if (creep.memory.role == 'builder') {
        roleBuilder.run(creep);
        // } else if (creep.memory.role == 'defender') {
        //     roleDefender.run(creep);
        // } else if ( creep.memory.role == 'ranger') {
        //     roleRanger.run(creep);
      }
    }
  }
});
