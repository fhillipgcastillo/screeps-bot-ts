// import * as _ from "lodash";
import { debugLog } from "./utils/Logger";
import { MULTI_ROOM_CONFIG } from './config/multi-room.config';
import { findMultiRoomSources } from './utils/multi-room-resources';
import { isRoomSafe, isRoomAccessible } from './utils/room-safety';

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
  // Multi-room functions
  initializeMultiRoomMemory: (creep: Creep) => void,
  shouldUseMultiRoom: (creep: Creep) => boolean,
  findMultiRoomResources: (creep: Creep) => (Resource | Tombstone | Ruin)[] | null,
  handleRoomTransition: (creep: Creep, targetRoom: string) => boolean,
  handleReturnToHome: (creep: Creep) => boolean,
  resetMultiRoomState: (creep: Creep) => void,
};
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
    // Initialize multi-room memory
    this.initializeMultiRoomMemory(creep);

    // Handle return to home room if carrying resources and in multi-room mode
    if (creep.memory.multiRoom?.isReturningHome && creep.store.energy > 0) {
      if (!this.handleReturnToHome(creep)) {
        return; // Still transitioning to home room
      }
    }

    let combineSources: (Tombstone | Ruin | Resource)[] = [];
    let resourceTarget;
    let target: Tombstone | Ruin | null = null;

    // Try multi-room resources first if enabled and appropriate
    if (this.shouldUseMultiRoom(creep) && !creep.memory.multiRoom?.isReturningHome) {
      const multiRoomResources = this.findMultiRoomResources(creep);
      if (multiRoomResources && multiRoomResources.length > 0) {
        const targetResource = multiRoomResources[0];
        const targetRoom = targetResource.room?.name;

        // Handle room transition if needed
        if (targetRoom && targetRoom !== creep.room.name) {
          if (this.handleRoomTransition(creep, targetRoom)) {
            return; // Still transitioning to target room
          }
          // If transition failed, fall back to single-room logic
        } else {
          // Already in target room or same room, use the multi-room resource
          if ('amount' in targetResource) {
            resourceTarget = targetResource as Resource;
          } else {
            target = targetResource as (Tombstone | Ruin);
          }
        }
      }
    }

    // Fall back to single-room logic if no multi-room resources found
    if (!resourceTarget && !target) {
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

      if (tombStones.length > 0) {
        target = creep.pos.findClosestByRange(tombStones);
      } else if (ruins.length > 0) {
        target = creep.pos.findClosestByRange(ruins);
      } else if (droppedResources.length > 0 && creep.memory.resourceTarget) {
        resourceTarget = _.find(droppedResources, r => r.id === creep.memory.resourceTarget)
      } else if (droppedResources.length > 0) {
        debugLog.debug("no source target");
        resourceTarget = this.getAppropiateResourceTarget(creep, droppedResources);
        // let availableTargets = _.filter(droppedResources, (source) => source.id !== creep.memory.sourceTarget);
        // resourceTarget = this.getClosestTarget(creep, availableTargets)
      }
    }

    // find the next source of energy from `combineSources` similar to what I did on harvesting when there it not path
    // or implement a wanted logic to circle around the array of sources after we transfere what we found.

    if (target !== null) {
      withdrowRemains(creep, target);
    }
    else if (resourceTarget) {
      creep.memory.resourceTarget = resourceTarget?.id;
      let harvestAction = creep.pickup(resourceTarget as Resource);

      if (harvestAction == ERR_NOT_IN_RANGE) {
        // creep.say("Moving...");
        let movingError = creep.moveTo(resourceTarget, { visualizePathStyle: { stroke: '#ffaa00' } });
        if (movingError !== OK) {
          // debugLog.debug(creep.name, "issue moving");
          debugLog.warn("move action", movingError)
          this.cleanUpTargetsState(creep);
        }
        // } else if (harvestAction === ERR_INVALID_TARGET) {
        //   console.log(creep.name + "  Rsc ERR_INVALID_TARGET");
        // } else if(harvestAction === ERR_NOT_ENOUGH_RESOURCES){
        //   console.log("not enought energy, change source");
        //   this.cleanUpTargetsState(creep);
      } else if (harvestAction !== OK) {
        debugLog.warn(creep.name + "  Rsc Another error", harvestAction);
        debugLog.debug("target", creep.memory.resourceTarget);
        this.cleanUpTargetsState(creep);
      }
    } else {
      this.cleanUpTargetsState(creep);

    }
  },
  memorizedPrevTargets(creep) {
    if (!creep.memory?.prevResourceTargets) {
      creep.memory.prevResourceTargets = []
    }
    if (creep.memory.resourceTarget) {
      creep.memory.prevResourceTargets.push(creep.memory.resourceTarget);
    }
  },
  cleanUpTargetsState(creep) {
    // this.memorizedPrevTargets(creep);
    creep.memory.prevResourceTarget = creep.memory.resourceTarget;
    creep.memory.resourceTarget = undefined;
  },
  getClosestTarget(creep, targets) {
    let nextClosestTaret = creep.pos.findClosestByRange(targets)
    return nextClosestTaret
  },
  shouldResetPrevTargets(creep, targets) {
    if (!creep?.memory?.prevResourceTargets) {
      this.memorizedPrevTargets(creep);
    }
    if (creep.memory.prevResourceTargets && creep.memory.prevResourceTargets.length === targets.length) {
      creep.memory.prevResourceTargets = [];
    }
  },
  getNextClosestTarget(creep, targets) {
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
  },
  getAppropiateResourceTarget(creep, sources) {
    try {
      return this.getNextClosestTarget(creep, sources)
    } catch (error) {
      debugLog.error("error with " + creep.name, error);
      return undefined;
    }
  },
  transfer(creep) {
    // Handle return to home room if in multi-room mode and not in home room
    const homeRoom = creep.memory.multiRoom?.homeRoom;
    if (homeRoom && creep.room.name !== homeRoom && creep.memory.multiRoom?.collectionRoom) {
      if (!this.handleReturnToHome(creep)) {
        return; // Still transitioning to home room
      }
    }

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
    } /*else {
      console.log("didn't fit")
    }*/
  },

  // ============================================================================
  // MULTI-ROOM FUNCTIONS
  // ============================================================================

  /**
   * Initializes multi-room memory for a hauler creep
   */
  initializeMultiRoomMemory: function (creep) {
    if (!creep.memory.multiRoom) {
      creep.memory.multiRoom = {
        enabled: MULTI_ROOM_CONFIG.enabled,
        homeRoom: creep.room.name,
        isReturningHome: false,
        failureCount: 0
      };
    }
  },

  /**
   * Determines if a hauler creep should use multi-room operations
   */
  shouldUseMultiRoom: function (creep) {
    this.initializeMultiRoomMemory(creep);

    // Check if multi-room is globally enabled
    if (!MULTI_ROOM_CONFIG.enabled || !creep.memory.multiRoom?.enabled) {
      return false;
    }

    // Check if creep has sufficient capacity
    if (creep.store.getCapacity() < MULTI_ROOM_CONFIG.minCreepCapacity) {
      return false;
    }

    // Check failure count
    if (creep.memory.multiRoom.failureCount >= MULTI_ROOM_CONFIG.maxFailures) {
      return false;
    }

    // Check if enough time has passed since last failure
    const now = Game.time;
    if (creep.memory.multiRoom.lastMultiRoomAttempt &&
        (now - creep.memory.multiRoom.lastMultiRoomAttempt) < 100) {
      return false;
    }

    return true;
  },

  /**
   * Finds multi-room resources for the hauler to collect
   */
  findMultiRoomResources: function (creep) {
    if (!this.shouldUseMultiRoom(creep)) {
      return null;
    }

    try {
      const homeRoom = creep.memory.multiRoom?.homeRoom || creep.room.name;
      const multiRoomSources = findMultiRoomSources(homeRoom);

      if (multiRoomSources.length === 0) {
        return null;
      }

      // Look for dropped resources near multi-room sources
      const allResources: (Resource | Tombstone | Ruin)[] = [];

      for (const sourceInfo of multiRoomSources) {
        const room = Game.rooms[sourceInfo.roomName];
        if (!room) continue;

        // Find dropped resources near the source
        const droppedResources = room.find(FIND_DROPPED_RESOURCES, {
          filter: resource => resource.resourceType === RESOURCE_ENERGY &&
                             resource.amount >= 50 &&
                             resource.pos.findInRange([sourceInfo.source], 3).length > 0
        });

        // Find tombstones and ruins with energy
        const tombstones = room.find(FIND_TOMBSTONES, {
          filter: tombstone => tombstone.store.energy > 0
        });

        const ruins = room.find(FIND_RUINS, {
          filter: ruin => ruin.store.energy > 0
        });

        allResources.push(...droppedResources, ...tombstones, ...ruins);
      }

      if (allResources.length === 0) {
        return null;
      }

      // Sort by priority (closer rooms first, then by resource amount)
      allResources.sort((a, b) => {
        const roomA = a.room?.name || '';
        const roomB = b.room?.name || '';
        const distanceA = Game.map.getRoomLinearDistance(homeRoom, roomA);
        const distanceB = Game.map.getRoomLinearDistance(homeRoom, roomB);

        if (distanceA !== distanceB) {
          return distanceA - distanceB;
        }

        // Secondary sort by resource amount
        const amountA = 'amount' in a ? a.amount : a.store.energy;
        const amountB = 'amount' in b ? b.amount : b.store.energy;
        return amountB - amountA;
      });

      // Update creep memory
      if (creep.memory.multiRoom && allResources.length > 0) {
        const targetResource = allResources[0];
        creep.memory.multiRoom.collectionRoom = targetResource.room?.name;
        creep.memory.multiRoom.lastMultiRoomAttempt = Game.time;
      }

      if (MULTI_ROOM_CONFIG.debugEnabled) {
        debugLog.debug(`${creep.name} found ${allResources.length} multi-room resources`);
      }

      return allResources;

    } catch (error) {
      debugLog.warn(`Error finding multi-room resources for ${creep.name}:`, error);
      this.resetMultiRoomState(creep);
      return null;
    }
  },

  /**
   * Handles room transitions for multi-room hauling
   */
  handleRoomTransition: function (creep, targetRoom) {
    const currentRoom = creep.room.name;

    // If already in target room, no transition needed
    if (currentRoom === targetRoom) {
      return true;
    }

    // Check if room is still safe and accessible
    if (!isRoomSafe(targetRoom) || !isRoomAccessible(currentRoom, targetRoom)) {
      if (MULTI_ROOM_CONFIG.debugEnabled) {
        debugLog.debug(`${creep.name} cannot access ${targetRoom} - resetting multi-room state`);
      }
      this.resetMultiRoomState(creep);
      return false;
    }

    // Find exit to target room
    try {
      const exitDirection = Game.map.findExit(currentRoom, targetRoom);
      if (exitDirection === ERR_NO_PATH || exitDirection === ERR_INVALID_ARGS) {
        this.resetMultiRoomState(creep);
        return false;
      }

      const exit = creep.pos.findClosestByRange(exitDirection);
      if (exit) {
        const moveResult = creep.moveTo(exit, {
          visualizePathStyle: { stroke: '#00ffff' },
          reusePath: 10
        });

        if (moveResult === ERR_NO_PATH) {
          this.resetMultiRoomState(creep);
          return false;
        }
      }

      return true;

    } catch (error) {
      debugLog.warn(`Error handling room transition for ${creep.name}:`, error);
      this.resetMultiRoomState(creep);
      return false;
    }
  },

  /**
   * Handles returning to home room after collecting resources
   */
  handleReturnToHome: function (creep) {
    const homeRoom = creep.memory.multiRoom?.homeRoom;
    if (!homeRoom) {
      return false;
    }

    const currentRoom = creep.room.name;

    // If already in home room, return success
    if (currentRoom === homeRoom) {
      if (creep.memory.multiRoom) {
        creep.memory.multiRoom.isReturningHome = false;
        creep.memory.multiRoom.collectionRoom = undefined;
      }
      return true;
    }

    // Set returning home flag
    if (creep.memory.multiRoom) {
      creep.memory.multiRoom.isReturningHome = true;
    }

    // Handle room transition to home
    return this.handleRoomTransition(creep, homeRoom);
  },

  /**
   * Resets multi-room state and increments failure count
   */
  resetMultiRoomState: function (creep) {
    if (creep.memory.multiRoom) {
      creep.memory.multiRoom.isReturningHome = false;
      creep.memory.multiRoom.collectionRoom = undefined;
      creep.memory.multiRoom.failureCount++;

      if (MULTI_ROOM_CONFIG.debugEnabled) {
        debugLog.debug(`${creep.name} multi-room state reset, failures: ${creep.memory.multiRoom.failureCount}`);
      }
    }

    // Clear current target to force new target selection
    this.cleanUpTargetsState(creep);
  },
}
export default haulerHandler;
