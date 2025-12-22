// import * as _ from "lodash";
import { debugLog } from "utils/Logger";
import { findClosestContainer, getContainers } from "./utils";
import { getCachedContainers } from "./utils/energy-bootstrap";
import { getNextResourceTarget } from "./utils/resource-assignment";
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
            debugLog.log(`${creep.name} upgrader error:`, error);
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
        // Find containers with at least half of creep's carry capacity
        const minEnergyNeeded = creep.store.getCapacity(RESOURCE_ENERGY) / 2;
        const containers = creep.room.find(FIND_STRUCTURES, {
            filter: (s) =>
                s.structureType === STRUCTURE_CONTAINER
                && (s.store[RESOURCE_ENERGY] >= 300 || s.store[RESOURCE_ENERGY] >= minEnergyNeeded)
        });

        // Find extensions with energy
        const extensions = creep.room.find(FIND_MY_STRUCTURES, {
            filter: (s) =>
                s.structureType === STRUCTURE_EXTENSION
                && s.store[RESOURCE_ENERGY] > 0
        });

        // Prioritize containers over extensions to preserve extensions for spawning
        if (containers.length > 0) {
            // Round-robin assignment for containers
            let container = getNextResourceTarget(creep.room, 'upgrader', containers) as StructureContainer;

            if (container) {
                const withdrawAction = creep.withdraw(container, RESOURCE_ENERGY);
                if (withdrawAction === ERR_NOT_IN_RANGE) {
                    creep.moveTo(container, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
            }
        } else if (extensions.length > 0) {
            // Round-robin assignment for extensions
            let theExtension = getNextResourceTarget(creep.room, 'upgrader', extensions) as StructureExtension;

            if (theExtension && creep.withdraw(theExtension, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(theExtension, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
        } else {
            // Fallback to spawn
            let spawn = Game.spawns.Spawn1;
            if (creep.withdraw(spawn, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
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

        //         if (harvestAction === ERR_NOT_IN_RANGE) {
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
