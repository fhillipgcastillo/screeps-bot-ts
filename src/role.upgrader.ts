// import * as _ from "lodash";
import { findClosestContainer, getContainers } from "./utils";
// import roleHauler from "./role.hauler";

type RoleHauler = {
    run: (creep: Creep) => void,
    pickUpEnergy: (creep: Creep) => void,
};

const roleUpgrader: RoleHauler = {
    /** @param {Creep} creep **/
    run: function (creep) {
        creep.say("I'm " + creep.name);

        if (!Object.keys(creep.memory).includes("upgrading")) {
            creep.memory.upgrading = false;
            creep.memory.harvesting = true;
        }

        if (creep.memory.upgrading && creep.store[RESOURCE_ENERGY] == 0) {
            creep.memory.upgrading = false;
            creep.memory.harvesting = true;
            creep.say('🔄 harvest');
        }
        if (!creep.memory.upgrading && creep.store.getFreeCapacity() == 0) {
            creep.memory.upgrading = true;
            creep.memory.harvesting = false;
            creep.say('⚡ upgrade');
        }
        const controller = creep.room.controller;

        if (creep.memory.upgrading && controller) {
            console.log(creep.name, "upgrading controller", controller);
            const upgradeAction = creep.upgradeController(controller);
            if (upgradeAction == ERR_NOT_IN_RANGE) {
                creep.moveTo(controller, { visualizePathStyle: { stroke: '#ffffff' } });
            } else if (upgradeAction === ERR_NO_BODYPART) {
                creep.say("No Body part")
                // } else {
                //     console.log("didn't upgrade", upgradeAction)
            }
        } else if (creep.memory.harvesting) {
            console.log(creep.name, "harvesting");
            this.pickUpEnergy(creep);
        }
    },
    pickUpEnergy(creep) {
        console.log("finding energy for", creep.name, "from containers");
        var containers = creep.room.find(FIND_STRUCTURES, {
            filter: (s) =>
                s.structureType === STRUCTURE_CONTAINER
                && s.store[RESOURCE_ENERGY] > 300
            // && s.store.getFreeCapacity(RESOURCE_ENERGY) > 100
        });

        const extensions = creep.room.find(FIND_MY_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_EXTENSION && s.store[RESOURCE_ENERGY] > 0 })
        let container = containers ? creep.pos.findClosestByRange(containers) : null;
        if (extensions.length > 0) {
            let theExtension = creep.pos.findClosestByRange(extensions);

            if (theExtension && creep.withdraw(theExtension, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(theExtension, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
        }
        else if (container) {
            const withdrawAction = creep.withdraw(container, RESOURCE_ENERGY);
            if (withdrawAction === ERR_NOT_IN_RANGE) {
                creep.moveTo(container, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
        } else if (!container || !extensions) {
            let spawn = Game.spawns.Spawn1;
            if (creep.withdraw(spawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(spawn, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
        }

        // var droppedResources = creep.room.find(FIND_DROPPED_RESOURCES, {
        //     filter: resource => resource.resourceType === RESOURCE_ENERGY
        // });

        // if (droppedResources.length > 0) {
        //     let resourceTarget = this.getAppropiateResourceTarget(creep, droppedResources);
        //     // console.log("sourceTarget", resourceTarget)
        //     if (resourceTarget) {
        //         var harvestAction = creep.pickup(resourceTarget);

        //         if (harvestAction == ERR_NOT_IN_RANGE) {
        //             // creep.say("Moving...");
        //             let movingError = creep.moveTo(resourceTarget, { visualizePathStyle: { stroke: '#ffaa00' } });
        //             if (movingError === ERR_NO_PATH || movingError === ERR_INVALID_TARGET) {
        //                 console.log(creep.name + " mv2 Rsc ERR_NO_PATH", movingError);
        //                 // creep.memory.prevSourceTarget = creep.memory.sourceTarget;
        //                 // creep.memory.sourceTarget = undefined;
        //                 this.cleanUpTargetsState(creep);
        //             }
        //         } else if (harvestAction === ERR_INVALID_TARGET) {
        //             console.log(creep.name + "  Rsc ERR_INVALID_TARGET");
        //             // creep.memory.prevSourceTarget = creep.memory.sourceTarget;
        //             // creep.memory.sourceTarget = undefined;
        //             this.cleanUpTargetsState(creep);
        //         } else if (harvestAction !== OK) {
        //             console.log(creep.name + "  Rsc Another error", harvestAction);
        //         }
        //     }
        // }
    },
};

export default roleUpgrader;
