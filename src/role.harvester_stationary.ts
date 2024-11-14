// import * as _ from "lodash";

type RoleHarvester = {
    run: (creep: Creep) => void,
    getCreepTarget: (creep: Creep) => Source | undefined,
    harvest: (creep: Creep) => void,
    storeNewHarvestTarget: (creep: Creep) => void,
    dropEnergy: (creep: Creep) => void,
    memorizedPrevTargets: (creep: Creep) => void,
    cleanUpTargetsState: (creep: Creep) => void,
    getARandomTarget: (sources: Source[]) => Source | undefined,
    getClosestTarget: (creep: Creep, targets: any[]) => any,
    shouldResetPrevTargets: (creep: Creep, targets: any[]) => any,
    getNextClosestTarget: (creep: Creep, targets: any[]) => any,
    stateSetter: (creep: Creep) => void,
};
const roleHarvester: RoleHarvester = {

    /** @param {Creep} creep **/
    run: function (creep) {
        // creep.say(creep.name);
        this.stateSetter(creep);
        if (creep.store[RESOURCE_ENERGY] > 5) {
            this.dropEnergy(creep)
            // } else if (creep.memory.harvesting) {
        } else {
            this.harvest(creep);
        }
    },
    getCreepTarget: function (creep) {
        var sources = creep.room.find(FIND_SOURCES);
        return _.find(sources, (source) => _.isEqual(source.id, creep.memory.sourceTarget));
    },
    harvest: function (creep) {
        try {

            if (creep.memory.sourceTarget) {
                // debugger;
                let sourceTarget = this.getCreepTarget(creep);
                if (sourceTarget) {
                    var harvestAction = creep.harvest(sourceTarget);

                    if (harvestAction == ERR_NOT_IN_RANGE) {
                        // creep.say("Moving...");
                        let movingError = creep.moveTo(sourceTarget, { visualizePathStyle: { stroke: '#ffaa00' } });
                        if (movingError === ERR_NO_PATH || movingError === ERR_INVALID_TARGET) {
                            console.log("Hvst mv2 ERR_NO_PATH", movingError); //most commont error when there's a lot of creeps
                            creep.say("NO Pth")
                            this.cleanUpTargetsState(creep);
                            let targets = creep.room.find(FIND_SOURCES);

                            this.getNextClosestTarget(creep, targets)

                        }
                    } else if (harvestAction === ERR_INVALID_TARGET) {
                        console.log("Hvst ERR_INVALID_TARGET");
                        creep.say("INV Tgt")
                        this.cleanUpTargetsState(creep);
                    } else if (harvestAction !== OK) {
                        console.log(`${creep.name} Hvst Another error`, harvestAction);
                        this.cleanUpTargetsState(creep);
                    }
                } else {
                    this.cleanUpTargetsState(creep);
                }
            } else {
                this.storeNewHarvestTarget(creep)
            }
        } catch (error) {
            console.log("harvest error", error)
        }
    },
    storeNewHarvestTarget(creep) {
        this.cleanUpTargetsState(creep);
        var targets = creep.room.find(FIND_SOURCES);
        var nextClosestTaret = this.getNextClosestTarget(creep, targets)

        creep.memory.sourceTarget = nextClosestTaret.id;

        // if (creep.harvest(nextClosestTaret) == ERR_NOT_IN_RANGE) {
        //     creep.moveTo(nextClosestTaret, { visualizePathStyle: { stroke: '#ffaa00' } });
        // }
    },
    dropEnergy(creep) {
        creep.drop(RESOURCE_ENERGY, 5)
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
    getARandomTarget(sources) {
        const creepSourceTarget = _.sample(sources);
        return creepSourceTarget;
    },
    getClosestTarget(creep, targets) {
        var nextClosestTaret = creep.pos.findClosestByRange(targets)
        return nextClosestTaret;
    },
    shouldResetPrevTargets(creep, targets) {
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
    stateSetter: function (creep) {
        //state handler
        if (creep.store.getFreeCapacity() > 0 && !creep.memory.transfering) {
            creep.memory.harvesting = true;
            creep.memory.transfering = false;

        } else if (creep.store.energy === 0 && creep.memory.transfering) {
            creep.memory.transfering = false;
            creep.memory.harvesting = true;
        }
    },
};

export default roleHarvester;
