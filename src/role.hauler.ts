// import * as _ from "lodash";

type RoleHauler = {
  spawn?: StructureSpawn,
  run: (creep: Creep) => void,
  // getCreepTarget: (creep:Creep) => Source | undefined,
  hauler: (creep: Creep) => void,
  transfer: (creep: Creep) => void,
  // storeNewHarvestTarget: (creep:Creep) => void,
  // dropEnergy: (creep:Creep) => void,
  memorizedPrevTargets: (creep: Creep) => void,
  cleanUpTargetsState: (creep: Creep) => void,
  // getARandomTarget: (sources: Source[]) => Resource | undefined,
  getClosestTarget: (creep: Creep, targets: any[]) => Resource | undefined,
  shouldResetPrevTargets: (creep: Creep, targets: any[]) => void,
  getNextClosestTarget: (creep: Creep, targets: any[]) => Resource | Structure<StructureConstant> | Tombstone | Ruin | undefined,
  getAppropiateResourceTarget: (creep: Creep, targets: any[]) => Resource | Structure<StructureConstant> | Tombstone | Ruin | undefined,
  stateSetter: (creep: Creep) => void,
};
function cleanUpTargetsState(creep: Creep) {
  // this.memorizedPrevTargets(creep);
  creep.memory.prevSourceTarget = creep.memory.sourceTarget;
  creep.memory.sourceTarget = undefined;
}
function withdrowRemains(creep: Creep, target: any) {
  creep.memory.sourceTarget = undefined;
  let withdrowAction = creep.withdraw(target, RESOURCE_ENERGY);

  if (withdrowAction == ERR_NOT_IN_RANGE) {
    // creep.say("Moving...");
    let movingError = creep.moveTo(target, { visualizePathStyle: { stroke: '#ff6600' } });
    if (movingError !== OK) {
      console.log("mv act err", movingError)
      cleanUpTargetsState(creep);
    } else {
      creep.say("moving...")
    }
  } else if (withdrowAction === ERR_INVALID_TARGET) {
    console.log(creep.name + " Inv tgt", target);
    withdrowAction = creep.pickup(target);
  } else if (withdrowAction === ERR_NOT_ENOUGH_RESOURCES) {
    creep.say("Not enough energy");
    cleanUpTargetsState(creep);
  } else if (withdrowAction !== OK) {
    console.log(creep.name + "  Rsc error", withdrowAction);
    cleanUpTargetsState(creep);
  }
};
const haulerHandler: RoleHauler = {
  /** @param {Creep} creep **/
  spawn: undefined,
  run: function (creep) {
    this.stateSetter(creep);
    // creep.say(creep.name);
    let spawnName = Object.keys(Game.spawns)[0];
    this.spawn = Game.spawns[spawnName];

    if (creep.memory.haulering) {
      this.hauler(creep);
    } else if (creep.memory.transfering) {
      this.transfer(creep);
    }
  },
  hauler: function (creep) {
    let combineSources: (Tombstone | Ruin | Resource)[] = [];

    let droppedResources = creep.room.find(FIND_DROPPED_RESOURCES || FIND_TOMBSTONES || FIND_RUINS,
      {
        filter: resource => resource.amount >= 10
        // filter: resource => resource.resourceType === RESOURCE_ENERGY || resource.resourceType === TOM
      }
    );
    const tombStones = creep.room.find(FIND_TOMBSTONES, {
      filter: r => r.store.energy > 0
    });
    const ruins = creep.room.find(FIND_RUINS, {
      filter: r => r.store.energy > 0
    });
    combineSources.concat(tombStones, ruins);

    let resourceTarget;
    let target: Tombstone | Ruin | null = null;

    if (tombStones.length > 0) {
      target = creep.pos.findClosestByRange(tombStones);
    } else if (ruins.length > 0) {
      target = creep.pos.findClosestByRange(ruins);
    } else if (droppedResources.length > 0 && creep.memory.sourceTarget) {
      resourceTarget = _.find(droppedResources, r => r.id === creep.memory.sourceTarget)
    } else if (droppedResources.length > 0) {
      console.log("no source target");
      resourceTarget = this.getAppropiateResourceTarget(creep, droppedResources);
      // let availableTargets = _.filter(droppedResources, (source) => source.id !== creep.memory.sourceTarget);
      // resourceTarget = this.getClosestTarget(creep, availableTargets)
    }

    // find the next source of energy from `combineSources` similar to what I did on harvesting when there it not path
    // or implement a wanted logic to circle around the array of sources after we transfere what we found.

    if (target !== null) {
      withdrowRemains(creep, target);
    }
    else if (resourceTarget) {
      creep.memory.sourceTarget = resourceTarget?.id;
      let harvestAction = creep.pickup(resourceTarget as Resource);

      if (harvestAction == ERR_NOT_IN_RANGE) {
        // creep.say("Moving...");
        let movingError = creep.moveTo(resourceTarget, { visualizePathStyle: { stroke: '#ffaa00' } });
        if (movingError !== OK) {
          // console.log(creep.name, "issue moving");
          console.log("move action", movingError)
          this.cleanUpTargetsState(creep);
        }
        // } else if (harvestAction === ERR_INVALID_TARGET) {
        //   console.log(creep.name + "  Rsc ERR_INVALID_TARGET");
        // } else if(harvestAction === ERR_NOT_ENOUGH_RESOURCES){
        //   console.log("not enought energy, change source");
        //   this.cleanUpTargetsState(creep);
      } else if (harvestAction !== OK) {
        console.log(creep.name + "  Rsc Another error", harvestAction);
        console.log("target", creep.memory.sourceTarget);
        this.cleanUpTargetsState(creep);
      }
    } else {
      this.cleanUpTargetsState(creep);

    }
  },
  memorizedPrevTargets(creep) {
    if (!creep.memory?.prevTargets) {
      creep.memory.prevTargets = []
    }
    creep.memory.prevTargets.push(creep.memory.sourceTarget);
  },
  cleanUpTargetsState(creep) {
    // this.memorizedPrevTargets(creep);
    creep.memory.prevSourceTarget = creep.memory.sourceTarget;
    creep.memory.sourceTarget = undefined;
  },
  getClosestTarget(creep, targets) {
    let nextClosestTaret = creep.pos.findClosestByRange(targets)
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
    // this.shouldResetPrevTargets(creep, targets);
    let availableTargets;

    if(!creep.memory.sourceTarget && creep.memory.prevSourceTarget) {
      availableTargets = _.filter(targets, (source) => source.id !== creep.memory.prevSourceTarget);
    } else {
      availableTargets = _.filter(targets, (source) => source.id !== creep.memory.sourceTarget);
    }
    let nextClosestTaret = this.getClosestTarget(creep, availableTargets)
    // let availableTargets = _.filter(targets, (source) => !creep.memory.prevTargets.includes(source.id));
    // let nextClosestTaret = this.getClosestTarget(creep, availableTargets)
    return nextClosestTaret;
  },
  getAppropiateResourceTarget(creep, sources) {
    try {
      return this.getNextClosestTarget(creep, sources)
    } catch (error) {
      console.log("error with " + creep.name, error);
      return undefined;
    }
  },
  transfer(creep) {
    let targets = undefined;
    if (!this.spawn) return;

    const storageAreFull = this.spawn.store.getUsedCapacity(RESOURCE_ENERGY) / this.spawn.store.getCapacity(RESOURCE_ENERGY);
    const containers = creep.room.find(FIND_STRUCTURES, {
      filter: (s) =>
        s.structureType === STRUCTURE_CONTAINER
        && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
      // && s.store.getFreeCapacity(RESOURCE_ENERGY) > 100
    });
    const emptyExtensions = creep.room.find(FIND_STRUCTURES, {
      filter: (structure) => {
        return structure.structureType == STRUCTURE_EXTENSION &&
          structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
      }
    });
    const structures = creep.room.find(FIND_STRUCTURES, {
      filter: (structure) => {
        return (
          structure.structureType == STRUCTURE_SPAWN ||
          structure.structureType == STRUCTURE_TOWER) &&
          structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
      }
    });

    if (emptyExtensions.length > 0) {
      targets = emptyExtensions;
    } else if (storageAreFull >= 0.9 && containers.length > 0) {
      targets = containers;
    } else {
      targets = structures;
    }

    if (targets.length > 0) {
      let target = creep.pos.findClosestByRange(targets);
      if (target) {
        let transferAction = target && creep.transfer(target, RESOURCE_ENERGY);

        if (transferAction === ERR_NOT_IN_RANGE) {
          creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
        } else if(transferAction === OK) {
          this.cleanUpTargetsState(creep);
        } else {
          // console.log(creep.name+" transferAction", transferAction);
          // this.cleanUpTargetsState(creep);
        }
      }
    } else {
      this.cleanUpTargetsState(creep);
      creep.say(`Can't transfer`)
    }
  },
  stateSetter: function (creep) {
    //state handler
    if (creep.store.getFreeCapacity() > 0 && !creep.memory.transfering) {
      creep.memory.haulering = true;
      creep.memory.transfering = false;
      // creep.memory.idle = false;
    } else if (creep.store.getFreeCapacity() === 0 && !creep.memory.transfering) {
      this.cleanUpTargetsState(creep);
      creep.memory.transfering = true;
      creep.memory.haulering = false;
      // creep.memory.idle = false;
    } else if (creep.store.energy === 0 && creep.memory.transfering) {
      this.cleanUpTargetsState(creep);
      creep.memory.transfering = false;
      creep.memory.haulering = true;
      // creep.memory.idle = false;
    }
  },
}
export default haulerHandler;
