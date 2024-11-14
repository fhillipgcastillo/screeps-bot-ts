// import * as _ from "lodash";
import { findClosestContainer, getContainers } from "./utils";
// import roleHauler from "./role.hauler";

type RoleHauler = {
  run: (creep:Creep) => void
};

const roleUpgrader:RoleHauler = {
    /** @param {Creep} creep **/
    run: function(creep) {
        // creep.say(creep.name);

        if(creep.memory.upgrading && creep.store[RESOURCE_ENERGY] == 0) {
            creep.memory.upgrading = false;
            creep.memory.harvesting = true;
            creep.say('🔄 harvest');
	    }
	    if(!creep.memory.upgrading && creep.store.getFreeCapacity() == 0) {
	        creep.memory.upgrading = true;
            creep.memory.harvesting = false;
	        creep.say('⚡ upgrade');
	    }
        var containers = getContainers(creep, 50)

        const controller = creep.room.controller;

	    if(creep.memory.upgrading && controller) {
            const upgradeAction = creep.upgradeController(controller);
            if( upgradeAction== ERR_NOT_IN_RANGE) {
                creep.moveTo(controller, {visualizePathStyle: {stroke: '#ffffff'}});
            } else if(upgradeAction === ERR_NO_BODYPART){
                creep.say("No Body part")
            // } else {
            //     console.log("didn't upgrade", upgradeAction)
            }
        } else if(containers.length > 0) {
            let container = findClosestContainer(creep, containers);

            if(container && creep.withdraw(container, RESOURCE_ENERGY ) == ERR_NOT_IN_RANGE) {
                creep.moveTo(container, {visualizePathStyle: {stroke: '#ffaa00'}});
            }
        }
        // else {
        //     // roleHauler.hauler(creep);
        //     let spawn = Game.spawns.Spawn1;
        //     if(creep.withdraw(spawn, RESOURCE_ENERGY ) == ERR_NOT_IN_RANGE) {
        //         creep.moveTo(spawn, {visualizePathStyle: {stroke: '#ffaa00'}});
        //     }
        //     // var sources = creep.room.find(FIND_SOURCES);
        //     // if(creep.harvest(sources[0]) == ERR_NOT_IN_RANGE) {
        //     //     creep.moveTo(sources[0], {visualizePathStyle: {stroke: '#ffaa00'}});
        //     // }
        // }
	}
};

export default roleUpgrader;
