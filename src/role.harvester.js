var roleHarvester = {

    /** @param {Creep} creep **/
    run: function (creep) {
        this.stateSetter(creep);
        
        if (creep.memory.harvesting) {
            this.harvest(creep);
        } else if (creep.memory.transfering) {
            let targets = undefined;
            const storageAreFull = Game.spawns.Spawn1.room.energyAvailable === Game.spawns.Spawn1.room.energyCapacityAvailable;
            const containers = creep.room.find(FIND_STRUCTURES, {
                filter: (s) =>
                    s.structureType === STRUCTURE_CONTAINER
                    && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                    // && s.store.getFreeCapacity(RESOURCE_ENERGY) > 100
            });
            const structures = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (structure.structureType == STRUCTURE_EXTENSION ||
                        structure.structureType == STRUCTURE_SPAWN ||
                        structure.structureType == STRUCTURE_TOWER) &&
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
            });

            
            if(storageAreFull && containers.length > 0) {
                targets = containers;
            } else {
                targets = structures;
            }
            
            if (targets.length > 0) {
                var target = creep.pos.findClosestByRange(targets);
                if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
                }
            }
        }
    },
    harvest: function (creep) {
        var droppedResources = creep.room.find(FIND_TOMBSTONES && FIND_DROPPED_RESOURCES && FIND_RUINS, FIND_SOURCES);
        var sources = creep.room.find(FIND_SOURCES);
        // sources.sort((a, b) => a.pos.findInRange(FIND_MY_CREEPS, 1).length - b.pos.findInRange(FIND_MY_CREEPS, 1).length);
        if(droppedResources.length > 0){
            let resourceTarget = creep.pos.findClosestByRange(droppedResources);
            console.log("sourceTarget", resourceTarget)
            if (resourceTarget) {
                var harvestAction = creep.withdraw(resourceTarget, RESOURCE_ENERGY);

                if (harvestAction == ERR_NOT_IN_RANGE) {
                    // creep.say("Moving...");
                    let movingError = creep.moveTo(resourceTarget, { visualizePathStyle: { stroke: '#ffaa00' } });
                    if (movingError === ERR_NO_PATH || movingError === ERR_INVALID_TARGET) {
                        console.log("Hvst mv2 Rsc ERR_NO_PATH", movingError);
                        creep.memory.prevSourceTarget = creep.memory.sourceTarget;
                        creep.memory.sourceTarget = undefined;
                    }
                } else if (harvestAction === ERR_INVALID_TARGET) {
                    console.log("Hvst  Rsc ERR_INVALID_TARGET");
                    creep.memory.prevSourceTarget = creep.memory.sourceTarget;
                    creep.memory.sourceTarget = undefined;
                } else if (harvestAction !== OK) {
                    console.log("Hvst  Rsc Another error", harvestAction);
                }
            }
        } else if (creep.memory.sourceTarget) {
            // debugger;
            let sourceTarget = _.find(sources, (source) => _.isEqual(source.id, creep.memory.sourceTarget));
            if (sourceTarget) {
                var harvestAction = creep.harvest(sourceTarget);

                if (harvestAction == ERR_NOT_IN_RANGE) {
                    // creep.say("Moving...");
                    let movingError = creep.moveTo(sourceTarget, { visualizePathStyle: { stroke: '#ffaa00' } });
                    if (movingError === ERR_NO_PATH || movingError === ERR_INVALID_TARGET) {
                        console.log("Hvst mv2 ERR_NO_PATH", movingError);
                        creep.memory.prevSourceTarget = creep.memory.sourceTarget;
                        creep.memory.sourceTarget = undefined;
                    }
                } else if (harvestAction === ERR_INVALID_TARGET) {
                    console.log("Hvst ERR_INVALID_TARGET");
                    creep.memory.prevSourceTarget = creep.memory.sourceTarget;
                    creep.memory.sourceTarget = undefined;
                } else if (harvestAction !== OK) {
                    console.log("Hvst Another error", harvestAction);
                }
            } else {
                creep.memory.prevSourceTarget = creep.memory.sourceTarget;
                creep.memory.sourceTarget = undefined;
            }
        } else {
            // var creepSourceTarget = _.sample(sources);
            var creepSourceTarget = _.sample(_.filter(sources, (source) => source.id !== creep.memory.prevSourceTarget));

            if (creep.memory.prevSourceTarget === creepSourceTarget.id) {
                // creepSourceTarget = _.filter(sources, (source) => source.id !== creepSourceTarget.id )[0];
                creepSourceTarget = _.sample(_.filter(sources, (source) => source.id !== creepSourceTarget.id));
            }

            creep.memory.sourceTarget = creepSourceTarget.id;

            if (creep.harvest(creepSourceTarget) == ERR_NOT_IN_RANGE) {
                creep.moveTo(creepSourceTarget, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
        }
    },
    stateSetter: function (creep) {
        //state handler
        if (creep.store.getFreeCapacity() > 0 && !creep.memory.transfering) {
            creep.memory.harvesting = true;
            creep.memory.transfering = false;
            // creep.memory.idle = false;
        } else if (creep.store.getFreeCapacity() === 0 && !creep.memory.transfering) {
            creep.memory.transfering = true;
            creep.memory.harvesting = false;
            // creep.memory.idle = false;
        } else if (creep.store.energy === 0 && creep.memory.transfering) {
            creep.memory.transfering = false;
            creep.memory.harvesting = true;
            // creep.memory.idle = false;
        }
    },
};

module.exports = roleHarvester;