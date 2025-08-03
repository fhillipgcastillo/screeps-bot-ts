// import * as _ from "lodash";
import { MULTI_ROOM_CONFIG } from './config/multi-room.config';
import { findMultiRoomSources } from './utils/multi-room-resources';
import { isRoomSafe, isRoomAccessible } from './utils/room-safety';
import { debugLog } from './utils/Logger';

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
    newLogicSourceTarget: (creep: Creep) => Source | null,
    // Multi-room functions
    initializeMultiRoomMemory: (creep: Creep) => void,
    shouldUseMultiRoom: (creep: Creep) => boolean,
    findMultiRoomTarget: (creep: Creep) => Source | null,
    handleRoomTransition: (creep: Creep, targetRoom: string) => boolean,
    resetMultiRoomState: (creep: Creep) => void,
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
    newLogicSourceTarget: function (creep) {
        // Initialize multi-room memory
        this.initializeMultiRoomMemory(creep);

        // Try multi-room target first if enabled and appropriate
        if (this.shouldUseMultiRoom(creep)) {
            const multiRoomTarget = this.findMultiRoomTarget(creep);
            if (multiRoomTarget) {
                // Handle room transition if needed
                const targetRoom = creep.memory.multiRoom?.targetRoom;
                if (targetRoom && targetRoom !== creep.room.name) {
                    if (this.handleRoomTransition(creep, targetRoom)) {
                        return multiRoomTarget;
                    }
                    // If transition failed, fall back to single-room logic
                } else {
                    // Already in target room or same room
                    return multiRoomTarget;
                }
            }
        }

        // Fall back to original single-room logic
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
    },
    harvest: function (creep) {
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
    },
    storeNewHarvestTarget(creep) {
        this.cleanUpTargetsState(creep);

        // Try multi-room target first if enabled
        if (this.shouldUseMultiRoom(creep)) {
            const multiRoomTarget = this.findMultiRoomTarget(creep);
            if (multiRoomTarget) {
                creep.memory.sourceTarget = multiRoomTarget.id;
                return;
            }
        }

        // Fall back to single-room logic
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
        // this.memorizedPrevTargets(creep);
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
        if (creep.memory?.prevTargets && creep.memory?.prevTargets.length === targets.length) {
            creep.memory.prevTargets = [];
        }
    },
    getNextClosestTarget(creep, targets) {
        let availableTargets = _.filter(targets, (source) => source.id !== creep.memory.sourceTarget);
        let nextClosestTaret = this.getClosestTarget(creep, availableTargets)
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

    // ============================================================================
    // MULTI-ROOM FUNCTIONS
    // ============================================================================

    /**
     * Initializes multi-room memory for a creep
     */
    initializeMultiRoomMemory: function (creep) {
        if (!creep.memory.multiRoom) {
            creep.memory.multiRoom = {
                enabled: MULTI_ROOM_CONFIG.enabled,
                homeRoom: creep.room.name,
                isMultiRoom: false,
                failureCount: 0
            };
        }
    },

    /**
     * Determines if a creep should use multi-room operations
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
     * Finds a multi-room target for the creep
     */
    findMultiRoomTarget: function (creep) {
        if (!this.shouldUseMultiRoom(creep)) {
            return null;
        }

        try {
            const homeRoom = creep.memory.multiRoom?.homeRoom || creep.room.name;
            const multiRoomSources = findMultiRoomSources(homeRoom);

            if (multiRoomSources.length === 0) {
                return null;
            }

            // Filter out sources that are already being targeted by other creeps
            const availableSources = multiRoomSources.filter(sourceInfo => {
                const creepsNearSource = sourceInfo.source.pos.findInRange(FIND_MY_CREEPS, 1);
                return creepsNearSource.length < MULTI_ROOM_CONFIG.maxCreepsPerSource;
            });

            if (availableSources.length === 0) {
                return null;
            }

            // Get the highest priority available source
            const targetSourceInfo = availableSources[0];
            const targetSource = targetSourceInfo.source;

            // Update creep memory
            if (creep.memory.multiRoom) {
                creep.memory.multiRoom.targetRoom = targetSourceInfo.roomName;
                creep.memory.multiRoom.isMultiRoom = targetSourceInfo.roomName !== homeRoom;
                creep.memory.multiRoom.lastMultiRoomAttempt = Game.time;
            }

            if (MULTI_ROOM_CONFIG.debugEnabled) {
                debugLog.debug(`${creep.name} targeting multi-room source in ${targetSourceInfo.roomName}`);
            }

            return targetSource;

        } catch (error) {
            debugLog.warn(`Error finding multi-room target for ${creep.name}:`, error);
            this.resetMultiRoomState(creep);
            return null;
        }
    },

    /**
     * Handles room transitions for multi-room operations
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

        // Check for transition timeout
        if (creep.memory.multiRoom?.roomTransitionStartTick) {
            const transitionTime = Game.time - creep.memory.multiRoom.roomTransitionStartTick;
            if (transitionTime > MULTI_ROOM_CONFIG.roomTransitionTimeout) {
                if (MULTI_ROOM_CONFIG.debugEnabled) {
                    debugLog.debug(`${creep.name} room transition timeout - resetting`);
                }
                this.resetMultiRoomState(creep);
                return false;
            }
        } else {
            // Start transition timer
            if (creep.memory.multiRoom) {
                creep.memory.multiRoom.roomTransitionStartTick = Game.time;
            }
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
                    visualizePathStyle: { stroke: '#00ff00' },
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
     * Resets multi-room state and increments failure count
     */
    resetMultiRoomState: function (creep) {
        if (creep.memory.multiRoom) {
            creep.memory.multiRoom.isMultiRoom = false;
            creep.memory.multiRoom.targetRoom = undefined;
            creep.memory.multiRoom.roomTransitionStartTick = undefined;
            creep.memory.multiRoom.failureCount++;

            if (MULTI_ROOM_CONFIG.debugEnabled) {
                debugLog.debug(`${creep.name} multi-room state reset, failures: ${creep.memory.multiRoom.failureCount}`);
            }
        }

        // Clear current target to force new target selection
        this.cleanUpTargetsState(creep);
    },
};

export default roleHarvester;
