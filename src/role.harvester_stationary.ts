// import * as _ from "lodash";

export class RoleHarvester {
    /** @param {Creep} creep **/
    public run(creep: Creep): void {
        // creep.say(creep.name);
        this.stateSetter(creep);
        if (creep.store[RESOURCE_ENERGY] > 5) {
            this.dropEnergy(creep)
            // } else if (creep.memory.harvesting) {
        } else {
            this.harvest(creep);
        }
    }

    public getCreepTarget(creep: Creep): Source | undefined {
        var sources = creep.room.find(FIND_SOURCES);
        return _.find(sources, (source) => _.isEqual(source.id, creep.memory.sourceTarget));
    }

    public newLogicSourceTarget(creep: Creep): Source | null {
        var sources = creep.room.find(FIND_SOURCES);
        if (sources.length === 0) return null;

        if (creep.memory.sourceTargetId && creep.memory.lastStep) {
            // find others targets = omit current target
            sources = sources.filter((s) => s.id !== creep.memory.sourceTarget);
            creep.memory.sourceTarget = undefined;
        }

        let target: Source | null = null;

        // assign a new target
        if (!creep.memory.sourceTarget) {
            target = creep.pos.findClosestByPath(sources);
            creep.memory.sourceTarget = target?.id;
        }

        if (!target && creep.memory.sourceTarget) {
            target = sources.find(s => s.id === creep.memory.sourceTarget) || null;
            if (!target) {
                console.log("not target available");
            }
        }

        return target;
    }

    public harvest(creep: Creep): void {
        try {
            let sourceTarget = this.newLogicSourceTarget(creep);

            // const mapExits = Game.map.describeExits("W52S5")
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
        } catch (error) {
            console.log("harvest error", error)
        }
    }

    public storeNewHarvestTarget(creep: Creep): void {
        this.cleanUpTargetsState(creep);
        var targets = creep.room.find(FIND_SOURCES);
        var nextClosestTaret = this.getNextClosestTarget(creep, targets)

        creep.memory.sourceTarget = nextClosestTaret.id;

        // if (creep.harvest(nextClosestTaret) == ERR_NOT_IN_RANGE) {
        //     creep.moveTo(nextClosestTaret, { visualizePathStyle: { stroke: '#ffaa00' } });
        // }
    }

    public dropEnergy(creep: Creep): void {
        creep.drop(RESOURCE_ENERGY, 5)
    }

    public memorizedPrevTargets(creep: Creep): void {
        if (!creep.memory?.prevTargets) {
            creep.memory.prevTargets = []
        }
        if (creep.memory.sourceTarget) {
            creep.memory.prevTargets.push(creep.memory.sourceTarget);
        }
    }

    public cleanUpTargetsState(creep: Creep): void {
        // this.memorizedPrevTargets(creep);
        creep.memory.prevSourceTarget = creep.memory.sourceTarget;
        creep.memory.sourceTarget = undefined;
    }

    public getARandomTarget(sources: Source[]): Source | undefined {
        const creepSourceTarget = _.sample(sources);
        return creepSourceTarget;
    }

    public getClosestTarget(creep: Creep, targets: any[]): any {
        var nextClosestTaret = creep.pos.findClosestByRange(targets)
        return nextClosestTaret;
    }

    public shouldResetPrevTargets(creep: Creep, targets: any[]): void {
        if (creep.memory?.prevTargets && creep.memory?.prevTargets.length === targets.length) {
            creep.memory.prevTargets = [];
        }
    }

    public getNextClosestTarget(creep: Creep, targets: any[]): any {
        let availableTargets = _.filter(targets, (source) => source.id !== creep.memory.sourceTarget);
        let nextClosestTaret = this.getClosestTarget(creep, availableTargets)
        return nextClosestTaret
    }

    public stateSetter(creep: Creep): void {
        //state handler
        if (creep.store.getFreeCapacity() > 0 && !creep.memory.transfering) {
            creep.memory.harvesting = true;
            creep.memory.transfering = false;

        } else if (creep.store.energy === 0 && creep.memory.transfering) {
            creep.memory.transfering = false;
            creep.memory.harvesting = true;
        }
    }
}
