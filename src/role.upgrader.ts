// import * as _ from "lodash";
import { findClosestContainer, getContainers } from "./utils";
// import roleHauler from "./role.hauler";

type RoleHauler = {
    run: (creep: Creep) => void,
    pickUpEnergy: (creep: Creep) => void,
    stateSetter: (creep: Creep) => void,
    stateHandler: (creep: Creep) => void,
    memorizedPrevTargets?: (creep: Creep) => void,
    cleanUpTargetsState?: (creep: Creep) => void,
    getClosestTarget?: (creep: Creep, targets: any[]) => any,
    shouldResetPrevTargets?: (creep: Creep, targets: any[]) => void,
    getNextClosestTarget?: (creep: Creep, targets: any[]) => any,
    getAppropiateResourceTarget?: (creep: Creep, targets: any[]) => any,
};

const roleUpgrader: RoleHauler = {
    /** @param {Creep} creep **/
    run: function (creep) {
        try {
            this.stateSetter(creep);
            this.stateHandler(creep);
        } catch (error) {
            console.log(`${creep.name} upgrader error:`, error);
        }
    },
    stateSetter: function (creep) {
        if (creep.store.getFreeCapacity() > 0 && !creep.memory.upgrading) {
            creep.memory.harvesting = true;
            creep.memory.upgrading = false;
        } else if (creep.store.getFreeCapacity() === 0 && !creep.memory.upgrading) {
            creep.memory.upgrading = true;
            creep.memory.harvesting = false;
        } else if (creep.store[RESOURCE_ENERGY] === 0 && creep.memory.upgrading) {
            creep.memory.upgrading = false;
            creep.memory.harvesting = true;
        }
    },
    stateHandler: function (creep) {
        if (creep.memory.harvesting) {
            this.pickUpEnergy(creep);
        } else if (creep.memory.upgrading) {
            const controller = creep.room.controller;
            if (controller) {
                if (creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(controller, { visualizePathStyle: { stroke: '#ffffff' } });
                }
            }
        }
    },
    pickUpEnergy(creep) {
        let energySource = undefined;

        // Find containers with energy
        const containers = creep.room.find(FIND_STRUCTURES, {
            filter: (s) =>
                s.structureType === STRUCTURE_CONTAINER
                && s.store[RESOURCE_ENERGY] > 300
        });

        // Find extensions with energy
        const extensions = creep.room.find(FIND_MY_STRUCTURES, {
            filter: (s) =>
                s.structureType === STRUCTURE_EXTENSION
                && s.store[RESOURCE_ENERGY] > 0
        });

        // Find spawn
        const spawn = Game.spawns.Spawn1;

        // Prioritize energy sources
        if (containers.length > 0) {
            energySource = creep.pos.findClosestByRange(containers);
        } else if (extensions.length > 0) {
            energySource = creep.pos.findClosestByRange(extensions);
        } else if (spawn && spawn.store.getUsedCapacity(RESOURCE_ENERGY) > 100) {
            // Only use spawn if it has more than 100 energy
            energySource = spawn;
        }

        // If we found an energy source, try to withdraw from it
        if (energySource) {
            const withdrawResult = creep.withdraw(energySource, RESOURCE_ENERGY);

            if (withdrawResult === ERR_NOT_IN_RANGE) {
                creep.moveTo(energySource, {
                    visualizePathStyle: { stroke: '#ffaa00' }
                });
            } else if (withdrawResult !== OK) {
                console.log(`${creep.name} withdraw error:`, withdrawResult);
            }
        } else {
            creep.say('No energy!');
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
