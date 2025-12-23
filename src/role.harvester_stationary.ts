import { SmartCreep, CreepStateEnum } from './types';
import { MULTI_ROOM_CONFIG } from './config/multi-room.config';
import { findMultiRoomSources } from './utils/multi-room-resources';
import { checkRoomSafetyBeforeEntry } from './utils/room-safety';
import { debugLog } from './utils/Logger';
import { shouldMigrateToNewSource } from './utils/sourceProfiler';
import { isMultiRoomEnabled } from './utils/consoleCommands';
import { shouldClaimRoom, claimRoom } from './utils/roomClaiming';
import { assignUniqueTargets } from './utils/resource-distribution';
import { getCreepsByRole } from './types';

/**
 * HarvesterCreep - Stationary harvester with multi-room support
 * Harvests energy from sources and drops it for haulers to collect
 */
class HarvesterCreep extends SmartCreep {

    /**
     * Main run method called each tick
     */
    public run(): void {
        this.initializeMultiRoomMemory();
        this.setState(CreepStateEnum.HARVESTING);
        this.handleTask();
    }

    /**
     * Handle harvesting task
     */
    public override harvest(): void {
        if (this.creep.store[RESOURCE_ENERGY] > 5) {
            this.dropEnergy();
        } else {
            this.executeHarvest();
        }
    }
    /**
     * Get the currently targeted source from memory
     */
    private getCreepTarget(): Source | undefined {
        const sources = this.creep.room.find(FIND_SOURCES);
        return _.find(sources, (source) => _.isEqual(source.id, this.memory.sourceTarget));
    }
    /**
     * Find and select the best source target using multi-room logic
     */
    private findSourceTarget(): Source | null {
        this.initializeMultiRoomMemory();

        // Distribution-first targeting when enabled
        if (MULTI_ROOM_CONFIG.useDistribution) {
            const homeRoom = this.memory.multiRoom?.homeRoom || this.creep.room.name;
            const harvesters = getCreepsByRole('harvester').filter(h => (h.memory.multiRoom?.homeRoom || h.room.name) === homeRoom);

            // Determine candidate sources (multi-room if allowed)
            let sources: Source[] = [];
            if (this.shouldUseMultiRoom()) {
                const multiRoomSources = findMultiRoomSources(homeRoom);
                sources = multiRoomSources.map(s => s.source);
            } else {
                sources = this.creep.room.find(FIND_SOURCES);
            }

            if (sources.length === 0 || harvesters.length === 0) {
                this.cleanUpTargetsState();
                return null;
            }

            assignUniqueTargets(harvesters, sources);
            const assigned = this.memory.sourceTarget ? Game.getObjectById(this.memory.sourceTarget as Id<Source>) : null;
            if (!assigned && MULTI_ROOM_CONFIG.debugEnabled) {
                debugLog.warn(`${this.creep.name} distribution assignment failed`);
            }
            return assigned;
        }

        // Periodic profitability check for migration (every 50 ticks)
        const shouldCheckProfitability = !this.memory.multiRoom?.lastProfitabilityCheck ||
            (Game.time - this.memory.multiRoom.lastProfitabilityCheck) >= MULTI_ROOM_CONFIG.sourceProfitabilityCheckInterval;

        if (shouldCheckProfitability && this.memory.sourceTarget) {
            const currentSource = Game.getObjectById(this.memory.sourceTarget as Id<Source>);

            if (currentSource && this.shouldUseMultiRoom()) {
                // Get all available sources (multi-room and single-room)
                const multiRoomSources = findMultiRoomSources(this.memory.multiRoom?.homeRoom || this.creep.room.name);
                const allSources = multiRoomSources.map(s => s.source);

                // Add local sources as fallback
                const localSources = this.creep.room.find(FIND_SOURCES);
                localSources.forEach(s => {
                    if (!allSources.find(existing => existing.id === s.id)) {
                        allSources.push(s);
                    }
                });

                // Check if migration is beneficial
                if (shouldMigrateToNewSource(currentSource, allSources, this.creep)) {
                    debugLog.info(`${this.creep.name} triggering migration from depleted source`);
                    this.memory.sourceTarget = undefined;
                    this.memory.multiRoom!.lastProfitabilityCheck = Game.time;
                }
            }

            // Update check timestamp
            if (this.memory.multiRoom) {
                this.memory.multiRoom.lastProfitabilityCheck = Game.time;
            }
        }

        // Try multi-room target first if enabled and appropriate
        if (this.shouldUseMultiRoom()) {
            const multiRoomTarget = this.findMultiRoomTarget();
            if (multiRoomTarget) {
                // Handle room transition if needed
                const targetRoom = this.memory.multiRoom?.targetRoom;
                if (targetRoom && targetRoom !== this.creep.room.name) {
                    if (this.handleRoomTransition(targetRoom)) {
                        return multiRoomTarget;
                    }
                } else {
                    return multiRoomTarget;
                }
            }
        }

        // Fall back to original single-room logic
        let sources = this.creep.room.find(FIND_SOURCES);
        if (sources.length === 0) return null;

        if (this.memory.sourceTargetId && this.memory.lastStep) {
            sources = sources.filter((s) => s.id !== this.memory.sourceTarget);
            this.memory.sourceTarget = undefined;
        }

        let target: Source | null = null;

        // Assign a new target
        if (!this.memory.sourceTarget) {
            target = this.creep.pos.findClosestByPath(sources);
            this.memory.sourceTarget = target?.id;
        }

        if (!target && this.memory.sourceTarget) {
            target = sources.find(s => s.id === this.memory.sourceTarget) || null;
            if (!target) {
                debugLog.log("no target available");
            }
        }

        return target;
    }
    /**
     * Execute the harvesting action
     */
    private executeHarvest(): void {
        try {
            const sourceTarget = this.findSourceTarget();

            if (sourceTarget) {
                const harvestAction = this.creep.harvest(sourceTarget);

                if (harvestAction === ERR_NOT_IN_RANGE) {
                    const movingError = this.creep.moveTo(sourceTarget, { visualizePathStyle: { stroke: '#ffaa00' } });
                    if (movingError === ERR_NO_PATH || movingError === ERR_INVALID_TARGET) {
                        debugLog.log("Hvst mv2 ERR_NO_PATH", movingError);
                        this.creep.say("NO Pth");
                        this.cleanUpTargetsState();
                        const targets = this.creep.room.find(FIND_SOURCES);
                        this.getNextClosestTarget(targets);
                    }
                } else if (harvestAction === ERR_INVALID_TARGET) {
                    debugLog.log("Hvst ERR_INVALID_TARGET");
                    this.creep.say("INV Tgt");
                    this.cleanUpTargetsState();
                } else if (harvestAction !== OK) {
                    debugLog.log(`${this.creep.name} Hvst Another error`, harvestAction);
                    this.cleanUpTargetsState();
                }
            } else {
                this.cleanUpTargetsState();
            }
        } catch (error) {
            debugLog.log("harvest error", error);
        }
    }
    /**
     * Drop energy for haulers to collect
     */
    private dropEnergy(): void {
        this.creep.drop(RESOURCE_ENERGY, 5);
    }

    /**
     * Clean up current target state
     */
    private cleanUpTargetsState(): void {
        this.memory.prevSourceTarget = this.memory.sourceTarget;
        this.memory.sourceTarget = undefined;
    }

    /**
     * Get closest target from available targets
     */
    private getClosestTarget(targets: Source[]): Source | undefined {
        return this.creep.pos.findClosestByRange(targets) || undefined;
    }

    /**
     * Get next closest target excluding current target
     */
    private getNextClosestTarget(targets: Source[]): Source | undefined {
        const availableTargets = _.filter(targets, (source) => source.id !== this.memory.sourceTarget);
        return this.getClosestTarget(availableTargets);
    }

    // ============================================================================
    // MULTI-ROOM FUNCTIONS
    // ============================================================================

    /**
     * Initialize multi-room memory
     */
    private initializeMultiRoomMemory(): void {
        if (!this.memory.multiRoom) {
            this.memory.multiRoom = {
                enabled: isMultiRoomEnabled(),
                homeRoom: this.creep.room.name,
                isMultiRoom: false,
                failureCount: 0
            };
        }
    }

    /**
     * Check if creep should use multi-room operations
     */
    private shouldUseMultiRoom(): boolean {
        this.initializeMultiRoomMemory();

        if (!isMultiRoomEnabled() || !this.memory.multiRoom?.enabled) {
            return false;
        }

        if (this.creep.store.getCapacity() < MULTI_ROOM_CONFIG.minCreepCapacity) {
            return false;
        }

        if (this.memory.multiRoom.failureCount >= MULTI_ROOM_CONFIG.maxFailures) {
            return false;
        }

        const now = Game.time;
        if (this.memory.multiRoom.lastMultiRoomAttempt &&
            (now - this.memory.multiRoom.lastMultiRoomAttempt) < 100) {
            return false;
        }

        return true;
    }

    /**
     * Find a multi-room target source
     */
    private findMultiRoomTarget(): Source | null {
        if (!this.shouldUseMultiRoom()) {
            return null;
        }

        try {
            const homeRoom = this.memory.multiRoom?.homeRoom || this.creep.room.name;
            const multiRoomSources = findMultiRoomSources(homeRoom);

            if (multiRoomSources.length === 0) {
                return null;
            }

            // Filter out sources that are already being targeted by other creeps
            const availableSources = multiRoomSources.filter(sourceInfo => {
                const creepsNearSource = sourceInfo.source.pos.findInRange(FIND_MY_CREEPS, 1);
                return creepsNearSource.length <= MULTI_ROOM_CONFIG.maxCreepsPerSource;
            });

            if (availableSources.length === 0) {
                return null;
            }

            // Get the highest priority available source
            const targetSourceInfo = availableSources[0];
            const targetSource = targetSourceInfo.source;

            // Update creep memory
            if (this.memory.multiRoom) {
                this.memory.multiRoom.targetRoom = targetSourceInfo.roomName;
                this.memory.multiRoom.isMultiRoom = targetSourceInfo.roomName !== homeRoom;
                this.memory.multiRoom.lastMultiRoomAttempt = Game.time;
            }

            // Evaluate claiming the target room if configured
            const claimingConfig = (MULTI_ROOM_CONFIG as any).claiming;
            if (claimingConfig && claimingConfig.enabled) {
                const criteria = claimingConfig.criteria || {
                    minSafetyScore: 50,
                    maxHostileCreeps: 0,
                    maxHostileStructures: 1,
                    minSourceCount: 1,
                    minAverageSourceEnergy: 500,
                };
                const decision = shouldClaimRoom(targetSourceInfo.roomName, criteria, homeRoom);
                if (decision.canClaim) {
                    claimRoom(targetSourceInfo.roomName, homeRoom);
                    if (MULTI_ROOM_CONFIG.debugEnabled) {
                        debugLog.info(`${this.creep.name} claimed room ${targetSourceInfo.roomName}`);
                    }
                }
            }

            if (MULTI_ROOM_CONFIG.debugEnabled) {
                debugLog.debug(`${this.creep.name} targeting multi-room source in ${targetSourceInfo.roomName}`);
            }

            return targetSource;

        } catch (error) {
            debugLog.warn(`Error finding multi-room target for ${this.creep.name}:`, error);
            this.resetMultiRoomState();
            return null;
        }
    }

    /**
     * Handle room transitions for multi-room operations
     */
    private handleRoomTransition(targetRoom: string): boolean {
        const currentRoom = this.creep.room.name;

        // If already in target room, no transition needed
        if (currentRoom === targetRoom) {
            if (this.memory.multiRoom?.roomTransitionStartTick) {
                if (MULTI_ROOM_CONFIG.debugEnabled) {
                    const duration = Game.time - this.memory.multiRoom.roomTransitionStartTick;
                    debugLog.debug(`${this.creep.name} reached ${targetRoom} in ${duration} ticks`);
                }
                delete this.memory.multiRoom.roomTransitionStartTick;
            }
            return true;
        }

        // Real-time safety check
        if (!checkRoomSafetyBeforeEntry(targetRoom)) {
            if (MULTI_ROOM_CONFIG.debugEnabled) {
                debugLog.warn(`${this.creep.name} cannot access ${targetRoom} (safety failed)`);
            }
            this.resetMultiRoomState();
            return false;
        }

        // Check for transition timeout
        if (this.memory.multiRoom?.roomTransitionStartTick) {
            const transitionTime = Game.time - this.memory.multiRoom.roomTransitionStartTick;
            if (transitionTime > MULTI_ROOM_CONFIG.roomTransitionTimeout) {
                debugLog.warn(
                    `${this.creep.name} room transition TIMEOUT: ${currentRoom} → ${targetRoom} ` +
                    `(${transitionTime}/${MULTI_ROOM_CONFIG.roomTransitionTimeout} ticks)`
                );
                this.resetMultiRoomState();
                return false;
            } else if (MULTI_ROOM_CONFIG.debugEnabled && transitionTime % 20 === 0) {
                debugLog.debug(`${this.creep.name} transitioning: ${currentRoom} → ${targetRoom} (${transitionTime}t)`);
            }
        } else {
            // Start transition timer
            if (this.memory.multiRoom) {
                this.memory.multiRoom.roomTransitionStartTick = Game.time;
                if (MULTI_ROOM_CONFIG.debugEnabled) {
                    debugLog.info(`${this.creep.name} starting room transition: ${currentRoom} → ${targetRoom}`);
                }
            }
        }

        // Find exit to target room
        try {
            const exitDirection = Game.map.findExit(currentRoom, targetRoom);
            if (exitDirection === ERR_NO_PATH || exitDirection === ERR_INVALID_ARGS) {
                this.resetMultiRoomState();
                return false;
            }

            const exit = this.creep.pos.findClosestByRange(exitDirection);
            if (exit) {
                const moveResult = this.creep.moveTo(exit, {
                    visualizePathStyle: { stroke: '#00ff00' },
                    reusePath: 10
                });

                if (moveResult === ERR_NO_PATH) {
                    this.resetMultiRoomState();
                    return false;
                }
            }

            return true;

        } catch (error) {
            debugLog.warn(`Error handling room transition for ${this.creep.name}:`, error);
            this.resetMultiRoomState();
            return false;
        }
    }

    /**
     * Reset multi-room state and increment failure count
     */
    private resetMultiRoomState(): void {
        if (this.memory.multiRoom) {
            this.memory.multiRoom.isMultiRoom = false;
            this.memory.multiRoom.targetRoom = undefined;
            this.memory.multiRoom.roomTransitionStartTick = undefined;
            this.memory.multiRoom.failureCount++;

            if (MULTI_ROOM_CONFIG.debugEnabled) {
                debugLog.debug(`${this.creep.name} multi-room state reset, failures: ${this.memory.multiRoom.failureCount}`);
            }
        }

        this.cleanUpTargetsState();
    }
}

// Export the class for instance caching
export { HarvesterCreep };

/**
 * Factory export for harvester role
 */
export default {
    run: (creep: Creep) => new HarvesterCreep(creep).run()
};
