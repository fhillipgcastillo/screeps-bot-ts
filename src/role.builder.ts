// import * as _ from "lodash";
import { findClosestContainer, getContainers } from "./utils";

type RoleBuilder = {
    run: (creep: Creep) => void,
    // getCreepTarget: (creep:Creep) => Source | undefined,
    // hauler: (creep: Creep) => void,
    // transfer: (creep: Creep) => void,
    // storeNewHarvestTarget: (creep:Creep) => void,
    // dropEnergy: (creep:Creep) => void,
    memorizedPrevTargets: (creep: Creep) => void,
    cleanUpTargetsState: (creep: Creep) => void,
    // getARandomTarget: (sources: Source[]) => Resource | undefined,
    getClosestTarget: (creep: Creep, targets: any[]) => Resource | undefined,
    shouldResetPrevTargets: (creep: Creep, targets: any[]) => void,
    getNextClosestTarget: (creep: Creep, targets: any[]) => Resource | undefined,
    getAppropiateResourceTarget: (creep: Creep, targets: any[]) => Resource | undefined,
    stateSetter: (creep: Creep) => void,
    stateHandler: (creep: Creep) => void,
    getBuildTarget: (creep: Creep) => ConstructionSite | null,
    build: (creep: Creep) => void,
    pickUpEnergy: (creep: Creep) => void,
    findTarget: (creep: Creep) => ConstructionSite | null,
};

const roleBuilder: RoleBuilder = {
    /** @param {Creep} creep **/
    run: function (creep) {
        // when there's not harvester or haulers do not build
        // creep.say(creep.name);
        try {
            this.stateSetter(creep);
            this.stateHandler(creep);
        } catch (error) {
            console.log(creep.name + " bldr error - ", error)
        }
    },
    stateSetter: function (creep) {
        //state handler
        if (creep.store.getFreeCapacity() > 0 && !creep.memory.building) {
            creep.memory.harvesting = true;
            creep.memory.building = false;
            // creep.memory.idle = false;
        } else if (creep.store.getFreeCapacity() === 0 && !creep.memory.building) {
            creep.memory.building = true;
            creep.memory.harvesting = false;
            // creep.memory.idle = false;
        } else if (creep.store.energy === 0 && creep.memory.building) {
            creep.memory.building = false;
            creep.memory.harvesting = true;
            // creep.memory.idle = false;
        }
    },
    stateHandler: function (creep) {
        // var sources = creep.room.find(FIND_SOURCES);
        // sources.sort((a, b) => a.pos.findInRange(FIND_MY_CREEPS, 1).length - b.pos.findInRange(FIND_MY_CREEPS, 1).length);
        var containers = getContainers(creep, 50)

        if (creep.memory.harvesting && containers.length > 0) {
            let container = findClosestContainer(creep, containers);

            if (container && creep.withdraw(container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(container, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
        } else if (creep.memory.harvesting) {
            this.pickUpEnergy(creep);
        } else if (creep.memory.building) {
            // var targets = creep.rom.find(FIND_MY_CONSTRUCTION_SITES, {});
            this.build(creep)
        }
    },
    getBuildTarget(creep) {
        let target: ConstructionSite | null;
        creep.memory.prevBuildTarget = creep.memory.buildTarget || undefined;
        creep.memory.buildTarget = undefined;
        const controller = creep.room.controller;
        const roomEnergyCapacityAvailableLess300 = Game.spawns.Spawn1.room.energyCapacityAvailable <= 300;
        const spawnControllerUnderLevel2 = controller?.level && controller?.level < 2;

        if (roomEnergyCapacityAvailableLess300 && spawnControllerUnderLevel2) {
            target = creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES, {
                filter: (structure) => {
                    return (
                        structure.structureType == STRUCTURE_CONTAINER ||
                        structure.structureType == STRUCTURE_ROAD ||
                        structure.structureType == STRUCTURE_EXTENSION
                    )// && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
            });
        } else {
            target = creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES, {
                filter: (structure) => {
                    // console.log(structure);

                    return (
                        structure.structureType == STRUCTURE_RAMPART ||
                        structure.structureType == STRUCTURE_ROAD ||
                        structure.structureType == STRUCTURE_CONTAINER ||
                        structure.structureType == STRUCTURE_EXTENSION ||
                        structure.structureType == STRUCTURE_SPAWN ||
                        structure.structureType == STRUCTURE_TOWER
                    )// && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
            });
        }

        creep.memory.buildTarget = target?.id;
        return target;
    },
    findTarget(creep) {
        const target = creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES, {
            filter: (structure) => {
                // console.log(structure);

                return (
                    structure.id == creep.memory.buildTarget
                )// && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            }
        });
        return target;
    },
    build(creep) {
        var target = null;
        if (!creep.memory.buildTarget && !Object.keys(Game.constructionSites).includes(creep.memory.buildTarget)) {
            target = this.getBuildTarget(creep);
        } else {
            target = this.findTarget(creep);
        }

        if (target) {
            creep.memory.buildTarget = target.id;
            const buildActionError = creep.build(target);
            if (buildActionError == ERR_NOT_IN_RANGE) {
                creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
            } else if (buildActionError === ERR_INVALID_TARGET) {
                creep.memory.prevBuildTarget = creep.memory.buildTarget || undefined;
                creep.memory.buildTarget = undefined;
            } else if (buildActionError !== OK) {
                console.log(creep.name + " Bld Error ", buildActionError);
            }
        } else {
            creep.memory.prevBuildTarget = creep.memory.buildTarget || undefined;
            creep.memory.buildTarget = undefined;
        }
    },
    pickUpEnergy(creep) {
        var containers = creep.room.find(FIND_STRUCTURES, {
            filter: (s) =>
                s.structureType === STRUCTURE_CONTAINER
                && s.store[RESOURCE_ENERGY] > 300
            // && s.store.getFreeCapacity(RESOURCE_ENERGY) > 100
        });

        const extensions = creep.room.find(FIND_MY_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_EXTENSION && s.store.getFreeCapacity() === 0 })
        let container = creep.pos.findClosestByRange(containers);
        if (extensions.length > 0) {
            let theextension = creep.pos.findClosestByRange(extensions);

            if (theextension && creep.withdraw(theextension, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(theextension, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
        }
        else if (container && creep.withdraw(container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            creep.moveTo(container, { visualizePathStyle: { stroke: '#ffaa00' } });
        } else {
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
    memorizedPrevTargets(creep) {
        if (!creep.memory?.prevTargets) {
            creep.memory.prevTargets = []
        }
        if (creep.memory.sourceTarget) {
            creep.memory.prevTargets.push(creep.memory.sourceTarget);
        }
    },
    cleanUpTargetsState(creep) {
        this.memorizedPrevTargets(creep);
        creep.memory.prevSourceTarget = creep.memory.sourceTarget;
        creep.memory.sourceTarget = undefined;
    },
    getClosestTarget(creep, targets) {
        var nextClosestTaret = creep.pos.findClosestByRange(targets)
        return nextClosestTaret
    },
    shouldResetPrevTargets(creep, targets) {
        if (!creep?.memory?.prevTargets) {
            this.memorizedPrevTargets(creep);
        }
        if (creep.memory.prevTargets.length === targets.length) {
            creep.memory.prevTargets = [];
        }
    },
    getNextClosestTarget(creep, targets) {
        this.shouldResetPrevTargets(creep, targets);
        var availableTargets = _.filter(targets, (source) => !creep.memory.prevTargets.includes(source.id));
        var nextClosestTaret = this.getClosestTarget(creep, availableTargets)
        return nextClosestTaret
    },
    getAppropiateResourceTarget(creep, sources) {
        try {
            return this.getNextClosestTarget(creep, sources)
        } catch (error) {
            console.log("error with " + creep.name, error)
            return undefined;
        }
    },
};

export default roleBuilder;
