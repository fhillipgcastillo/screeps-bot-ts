// import * as _ from "lodash";
import { debugLog } from "./utils/logger";

function cleanUpTargetsState(creep: Creep) {
  // this.memorizedPrevTargets(creep);
  creep.memory.prevResourceTarget = creep.memory.resourceTarget;
  creep.memory.resourceTarget = undefined;
}
function withdrowRemains(creep: Creep, target: any) {
  creep.memory.resourceTarget = undefined;
  let withdrowAction = creep.withdraw(target, RESOURCE_ENERGY);

  if (withdrowAction == ERR_NOT_IN_RANGE) {
    // creep.say("Moving...");
    let movingError = creep.moveTo(target, { visualizePathStyle: { stroke: '#ff6600' } });
    if (movingError !== OK) {
      debugLog.warn("mv act err", movingError)
      cleanUpTargetsState(creep);
    } else {
      creep.say("moving...")
    }
  } else if (withdrowAction === ERR_INVALID_TARGET) {
    debugLog.debug(creep.name + " Inv tgt", target);
    withdrowAction = creep.pickup(target);
  } else if (withdrowAction === ERR_NOT_ENOUGH_RESOURCES) {
    creep.say("Not enough energy");
    cleanUpTargetsState(creep);
  } else if (withdrowAction !== OK) {
    debugLog.warn(creep.name + "  Rsc error", withdrowAction);
    cleanUpTargetsState(creep);
  }
}

export class RoleHauler {
  private spawn?: StructureSpawn;

  // Tiga's queue constants
  private static readonly ENERGY_THRESHOLD = 50; // Wait until 50+ energy accumulates before moving
  private static readonly QUEUE_UPDATE_INTERVAL = 5; // Update queue every 5 ticks

  /** @param {Creep} creep **/
  public run(creep: Creep): void {
    this.stateSetter(creep);
    // creep.say(creep.name);
    let spawnName = Object.keys(Game.spawns)[0];
    this.spawn = Game.spawns[spawnName];

    if (creep.memory.haulering) {
      this.hauler(creep);
    } else if (creep.memory.transfering) {
      this.transfer(creep);
    }
  }

  public hauler(creep: Creep): void {
    // First, check if we should be waiting in a queue (Tiga's queue system)
    const sourceId = this.getAssignedSource(creep);
    if (sourceId) {
      const queueResult = this.checkQueueAndWait(creep, sourceId);
      if (!queueResult.shouldProceed) {
        // Hauler is waiting in queue - move towards source but stay 5-10 blocks away
        const source = Game.getObjectById(sourceId as Id<Source>);
        if (source) {
          const rangeToSource = creep.pos.getRangeTo(source);

          // Move towards source but maintain 5-10 block distance
          if (rangeToSource > 10) {
            // Too far, move closer
            creep.moveTo(source, { visualizePathStyle: { stroke: '#0088ff' } });
          } else if (rangeToSource < 5) {
            // Too close, move back (circle around at distance 5-10)
            const positions = source.room.lookAtArea(
              source.pos.y - 10,
              source.pos.x - 10,
              source.pos.y + 10,
              source.pos.x + 10
            );
            // Just maintain position if already in good range
          }
          // If rangeToSource is 5-10, just stay there
        }
        creep.say(`Queue: ${queueResult.position}`);
        return;
      }
    }

    // Get the source object this hauler is assigned to
    const source = sourceId ? Game.getObjectById(sourceId as Id<Source>) : null;

    // Find dropped energy NEAR the assigned source (where harvesters drop)
    let droppedResources: Resource[] = [];
    if (source) {
      // Look for dropped resources within range 3 of the source (harvesters drop here)
      droppedResources = source.room.find(FIND_DROPPED_RESOURCES, {
        filter: resource => {
          return resource.resourceType === RESOURCE_ENERGY &&
                 resource.pos.getRangeTo(source) <= 3 &&
                 resource.amount >= 10;
        }
      });
    } else {
      // Fallback if no source assigned: find any dropped resources with 10+ energy
      droppedResources = creep.room.find(FIND_DROPPED_RESOURCES, {
        filter: resource => resource.resourceType === RESOURCE_ENERGY && resource.amount >= 10
      });
    }

    // Also check for tombstones and ruins as backup energy sources
    const tombStones = creep.room.find(FIND_TOMBSTONES, {
      filter: r => r.store.energy > 0
    });
    const ruins = creep.room.find(FIND_RUINS, {
      filter: r => r.store.energy > 0
    });

    let resourceTarget;
    let target: Tombstone | Ruin | null = null;

    // Priority: tombstones > ruins > dropped resources at source
    if (tombStones.length > 0) {
      target = creep.pos.findClosestByRange(tombStones);
    } else if (ruins.length > 0) {
      target = creep.pos.findClosestByRange(ruins);
    } else if (droppedResources.length > 0 && creep.memory.resourceTarget) {
      // Check if we still have the target we were going for
      resourceTarget = _.find(droppedResources, r => r.id === creep.memory.resourceTarget)
    } else if (droppedResources.length > 0) {
      debugLog.debug(`Hauler ${creep.name} finding target near source`);
      // Find closest dropped resource near source
      resourceTarget = creep.pos.findClosestByRange(droppedResources);
    }

    if (target !== null) {
      withdrowRemains(creep, target);
    }
    else if (resourceTarget) {
      creep.memory.resourceTarget = resourceTarget?.id;
      let harvestAction = creep.pickup(resourceTarget as Resource);

      if (harvestAction === OK) {
        // Successfully picked up energy - rotate queue immediately
        if (sourceId) {
          this.rotateQueue(sourceId, creep.name);
        }
        this.cleanUpTargetsState(creep);
      } else if (harvestAction == ERR_NOT_IN_RANGE) {
        let movingError = creep.moveTo(resourceTarget, { visualizePathStyle: { stroke: '#ffaa00' } });
        if (movingError !== OK) {
          debugLog.warn("move action", movingError)
          this.cleanUpTargetsState(creep);
        }
      } else {
        // Other error - clean up and try again
        debugLog.warn(creep.name + "  Rsc error: " + harvestAction);
        this.cleanUpTargetsState(creep);
      }
    } else {
      // No energy found at source - move toward source location to wait for harvester drops
      if (source) {
        creep.moveTo(source, { visualizePathStyle: { stroke: '#ffff00' } });
      }
      this.cleanUpTargetsState(creep);
    }
  }

  public memorizedPrevTargets(creep: Creep): void {
    if (!creep.memory?.prevResourceTargets) {
      creep.memory.prevResourceTargets = []
    }
    if (creep.memory.resourceTarget) {
      creep.memory.prevResourceTargets.push(creep.memory.resourceTarget);
    }
  }

  /**
   * Gets the source ID this hauler is assigned to
   * (To be populated by per-source team assignment in Phase 3)
   */
  private getAssignedSource(creep: Creep): string | undefined {
    return creep.memory.sourceId;
  }

  /**
   * Implements Tiga's queue system: checks if hauler should wait before picking up energy
   * Returns whether the hauler should proceed with gathering or wait in queue
   */
  private checkQueueAndWait(creep: Creep, sourceId: string): { shouldProceed: boolean; position: number } {
    if (!Memory.sources) Memory.sources = {};
    if (!Memory.sources[sourceId]) {
      Memory.sources[sourceId] = { queue: { order: [], accumulation: 0 }, team: { harvesters: [], haulers: [], maxHarvesters: 2, maxHaulers: 4 } };
    }

    const sourceQueue = Memory.sources[sourceId].queue;
    if (!sourceQueue.order) sourceQueue.order = [];
    if (sourceQueue.accumulation === undefined) sourceQueue.accumulation = 0;

    // Update queue position every QUEUE_UPDATE_INTERVAL ticks
    if (Game.time % RoleHauler.QUEUE_UPDATE_INTERVAL === 0) {
      // Remove dead creeps from queue
      sourceQueue.order = sourceQueue.order.filter((id: string) => Game.creeps[id] !== undefined);

      // Add creep to queue if not already in it
      if (!sourceQueue.order.includes(creep.name)) {
        sourceQueue.order.push(creep.name);
      }

      // Update accumulation from actual dropped resources at source
      const source = Game.getObjectById(sourceId as Id<Source>);
      if (source) {
        const droppedNearSource = source.room.find(FIND_DROPPED_RESOURCES, {
          filter: resource => {
            return resource.resourceType === RESOURCE_ENERGY &&
                   resource.pos.getRangeTo(source) <= 3;
          }
        });
        sourceQueue.accumulation = droppedNearSource.reduce((sum, r) => sum + r.amount, 0);
      }
    }

    // Get queue position
    const position = sourceQueue.order.indexOf(creep.name);

    // Check if energy threshold is met for this creep's position in queue
    const energyPerHauler = RoleHauler.ENERGY_THRESHOLD;
    const requiredEnergy = energyPerHauler * (position + 1);

    // If this hauler is first in queue and threshold met, proceed
    if (position === 0 && sourceQueue.accumulation >= requiredEnergy) {
      return { shouldProceed: true, position };
    }

    // Otherwise, wait in queue
    return { shouldProceed: false, position };
  }

  public cleanUpTargetsState(creep: Creep): void {
    // this.memorizedPrevTargets(creep);
    creep.memory.prevResourceTarget = creep.memory.resourceTarget;
    creep.memory.resourceTarget = undefined;
  }

  /**
   * Rotates the queue after a hauler successfully picks up energy
   * Removes the hauler from the front of the queue so the next one can proceed
   */
  private rotateQueue(sourceId: string, creepName: string): void {
    if (!Memory.sources || !Memory.sources[sourceId]) {
      return;
    }

    const sourceQueue = Memory.sources[sourceId].queue;
    if (!sourceQueue.order) sourceQueue.order = [];

    // Remove the current creep from the front of the queue
    const index = sourceQueue.order.indexOf(creepName);
    if (index === 0) {
      // Remove from front
      sourceQueue.order.shift();
      debugLog.debug(`Queue rotated at source ${sourceId.slice(-4)}: ${creepName} picked up, next is ${sourceQueue.order[0] || 'none'}`);
    }
  }

  public getClosestTarget(creep: Creep, targets: any[]): Resource | Structure<StructureConstant> | Tombstone | Ruin | undefined {
    let nextClosestTaret = creep.pos.findClosestByRange(targets)
    return nextClosestTaret
  }

  public shouldResetPrevTargets(creep: Creep, targets: any[]): void {
    if (!creep?.memory?.prevResourceTargets) {
      this.memorizedPrevTargets(creep);
    }
    if (creep.memory.prevResourceTargets && creep.memory.prevResourceTargets.length === targets.length) {
      creep.memory.prevResourceTargets = [];
    }
  }

  public getNextClosestTarget(creep: Creep, targets: any[]): Resource | Structure<StructureConstant> | Tombstone | Ruin | undefined {
    // this.shouldResetPrevTargets(creep, targets);
    let availableTargets;

    if (!creep.memory.resourceTarget && creep.memory.prevResourceTarget) {
      availableTargets = _.filter(targets, (source) => source.id !== creep.memory.prevResourceTarget);
    } else {
      availableTargets = _.filter(targets, (source) => source.id !== creep.memory.resourceTarget);
    }
    let nextClosestTaret = this.getClosestTarget(creep, availableTargets)
    // let availableTargets = _.filter(targets, (source) => !creep.memory.prevTargets.includes(source.id));
    // let nextClosestTaret = this.getClosestTarget(creep, availableTargets)
    return nextClosestTaret;
  }

  public getAppropiateResourceTarget(creep: Creep, sources: any[]): Resource | Structure<StructureConstant> | Tombstone | Ruin | undefined {
    try {
      return this.getNextClosestTarget(creep, sources)
    } catch (error) {
      debugLog.error("error with " + creep.name, error);
      return undefined;
    }
  }

  public transfer(creep: Creep): void {
    let targets = undefined;
    if (!this.spawn) return;
    _.sortByOrder
    const storageAreFull = this.spawn.store.getUsedCapacity(RESOURCE_ENERGY) / this.spawn.store.getCapacity(RESOURCE_ENERGY);
    const containers: StructureContainer[] = _.sortByOrder(
      creep.room.find(FIND_STRUCTURES, {
        filter: (s) =>
          s.structureType === STRUCTURE_CONTAINER
          && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        // && s.store.getFreeCapacity(RESOURCE_ENERGY) > 100
      }),
      (c) => c.store.getFreeCapacity(RESOURCE_ENERGY),
      'asc'
    );

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

    if (storageAreFull >= 0.9 && containers.length > 0) {
      targets = containers;
    } else if (emptyExtensions.length > 0) {
      targets = emptyExtensions;
    } else {
      targets = structures;
    }

    if (targets.length > 0) {
      let target = creep.pos.findClosestByRange(targets);
      if (target) {
        let transferAction = target && creep.transfer(target, RESOURCE_ENERGY);

        if (transferAction === ERR_NOT_IN_RANGE) {
          creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
        } else if (transferAction === OK) {
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
  }

  public stateSetter(creep: Creep): void {
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
    } /*else {
      console.log("didn't fit")
    }*/
  }
}
