// import * as _ from "lodash";

type RoleHauler = {
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
  getNextClosestTarget: (creep: Creep, targets: any[]) => Resource | undefined,
  getAppropiateResourceTarget: (creep: Creep, targets: any[]) => Resource | undefined,
  stateSetter: (creep: Creep) => void,
};

const haulerHandler: RoleHauler = {
  /** @param {Creep} creep **/
  run: function (creep) {
    this.stateSetter(creep);
    // creep.say(creep.name);

    if (creep.memory.haulering) {
      this.hauler(creep);
    } else if (creep.memory.transfering) {
      this.transfer(creep);
    }
  },
  hauler: function (creep) {
    var droppedResources = creep.room.find(FIND_DROPPED_RESOURCES || FIND_TOMBSTONES || FIND_RUINS, {
      filter: resource => resource.resourceType === RESOURCE_ENERGY
    });
    if (!creep.memory.sourceTarget) {

    }
    let resourceTarget;
    if (droppedResources.length > 0 && creep.memory.sourceTarget) {
      resourceTarget = _.find(droppedResources, r => r.id === creep.memory.sourceTarget)
    } else if (droppedResources.length > 0) {
      resourceTarget = this.getAppropiateResourceTarget(creep, droppedResources);
    }

    if (resourceTarget) {
      creep.memory.sourceTarget = resourceTarget.id;
      var harvestAction = creep.pickup(resourceTarget);

      if (harvestAction == ERR_NOT_IN_RANGE) {
        // creep.say("Moving...");
        let movingError = creep.moveTo(resourceTarget, { visualizePathStyle: { stroke: '#ffaa00' } });
        if (movingError === ERR_NO_PATH || movingError === ERR_INVALID_TARGET) {
          console.log(creep.name + " mv2 Rsc ERR_NO_PATH", movingError);
          creep.memory.transfering = false;
          creep.memory.haulering = false;
        }
      } else if (harvestAction === ERR_INVALID_TARGET) {
        console.log(creep.name + "  Rsc ERR_INVALID_TARGET");
      } else if (harvestAction !== OK) {
        console.log(creep.name + "  Rsc Another error", harvestAction);
      }
    }
  },
  memorizedPrevTargets(creep) {
    if (!creep.memory?.prevTargets) {
      creep.memory.prevTargets = []
    }
    creep.memory.prevTargets.push(creep.memory.sourceTarget);
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
    const storageAreFull = Game.spawns.Spawn1.room.energyAvailable / Game.spawns.Spawn1.room.energyCapacityAvailable ;
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
        return (structure.structureType == STRUCTURE_EXTENSION ||
          structure.structureType == STRUCTURE_SPAWN ||
          structure.structureType == STRUCTURE_TOWER) &&
          structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
      }
    });

    if(emptyExtensions) {
      console.log("emptyExtensions", emptyExtensions);
      targets = emptyExtensions;
    } else if (storageAreFull >= 0.7 && containers.length > 0) {
      targets = containers;
    } else {
      targets = structures;
    }

    if (targets.length > 0) {
      var target = creep.pos.findClosestByRange(targets);
      if (target) {
        let transferAction = target && creep.transfer(target, RESOURCE_ENERGY);

        if (transferAction == ERR_NOT_IN_RANGE) {
          creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
        } else {
          // console.log(creep.name+" transferAction", transferAction);
          // this.cleanUpTargetsState(creep);
        }
      }
    } else {
      // var target = creep.pos.findClosestByRange(targets);

      console.log(`${creep.name} no targets`)
    }
  },
  stateSetter: function (creep) {
    //state handler
    if (creep.store.getFreeCapacity() > 0 && !creep.memory.transfering) {
      creep.memory.haulering = true;
      creep.memory.transfering = false;
      // creep.memory.idle = false;
    } else if (creep.store.getFreeCapacity() === 0 && !creep.memory.transfering) {
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
