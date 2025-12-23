import { SmartCreep, CreepStateEnum } from './types';
import { debugLog } from "./utils/Logger";
import { MULTI_ROOM_CONFIG } from './config/multi-room.config';
import { findMultiRoomSources } from './utils/multi-room-resources';
import { checkRoomSafetyBeforeEntry } from './utils/room-safety';
import { getCachedContainers } from './utils/energy-bootstrap';
import { isMultiRoomEnabled } from './utils/consoleCommands';
import { assignCollectionTargetsToHaulers } from './utils/resource-distribution';
import { getCreepsByRole } from './types';

/**
 * HaulerCreep - Dual-phase transport with multi-room support
 * Collects energy from dropped resources, tombstones, and ruins,
 * then transfers to spawn, extensions, towers, storage, and containers
 */
class HaulerCreep extends SmartCreep {
    /**
     * Main run method called each tick
     */
    public run(): void {
        this.initializeMultiRoomMemory();
        this.updateWorkingState();
        this.handleTask();
    }

    /**
     * Update working state based on energy levels
     */
    private updateWorkingState(): void {
        if (this.creep.store.getFreeCapacity() > 0 && !this.memory.transfering) {
            this.memory.haulering = true;
            this.memory.transfering = false;
            this.setState(CreepStateEnum.HAULING);
        } else if (this.creep.store.getFreeCapacity() === 0 && !this.memory.transfering) {
            this.cleanUpTargetsState();
            this.memory.transfering = true;
            this.memory.haulering = false;
            this.setState(CreepStateEnum.TRANSFERRING);
        } else if (this.creep.store.energy === 0 && this.memory.transfering) {
            this.cleanUpTargetsState();
            this.memory.transfering = false;
            this.memory.haulering = true;
            this.setState(CreepStateEnum.HAULING);
        }
    }

    /**
     * Override handleTask to dispatch to hauling or transfer logic
     */
    public override handleTask(): void {
        if (this.memory.haulering) {
            this.executeHauling();
        } else if (this.memory.transfering) {
            this.executeTransfer();
        }
    }
    /**
     * Execute hauling (collection) phase
     */
    private executeHauling(): void {
        // Handle return to home room if carrying resources and in multi-room mode
        if (this.memory.multiRoom?.isReturningHome && this.creep.store.energy > 0) {
            if (!this.handleReturnToHome()) {
                return;
            }
        }

        let resourceTarget: Resource | Tombstone | Ruin | null = null;
        let targetRoomForTransition: string | null = null;
        let collectionTargets: Array<Resource | Tombstone | Ruin> = [];

        if (this.shouldUseMultiRoom() && !this.memory.multiRoom?.isReturningHome) {
            const multiRoomResources = this.findMultiRoomResources();
            if (multiRoomResources && multiRoomResources.length > 0) {
                const candidateRoom = multiRoomResources[0].room?.name;
                if (candidateRoom && candidateRoom !== this.creep.room.name) {
                    targetRoomForTransition = candidateRoom;
                } else {
                    collectionTargets = multiRoomResources;
                }
            }
        }

        // If not already populated by multi-room, gather local targets
        if (collectionTargets.length === 0 && !targetRoomForTransition) {
            const tombStones = this.creep.room.find(FIND_TOMBSTONES, { filter: r => r.store.energy > 0 });
            const ruins = this.creep.room.find(FIND_RUINS, { filter: r => r.store.energy > 0 });
            const droppedResources = this.creep.room.find(FIND_DROPPED_RESOURCES, { filter: resource => resource.amount >= 10 });
            collectionTargets = [...tombStones, ...ruins, ...droppedResources];
        }

        // Handle room transition if needed
        if (targetRoomForTransition) {
            if (this.handleRoomTransition(targetRoomForTransition)) {
                return;
            }
        }

        // Distribution-first assignment
        if (MULTI_ROOM_CONFIG.useDistribution) {
            if (collectionTargets.length === 0) {
                debugLog.debug(`${this.creep.name} no collection targets found`);
                this.cleanUpTargetsState();
                return;
            }
            const homeRoom = this.memory.multiRoom?.homeRoom || this.creep.room.name;
            const haulers = getCreepsByRole('hauler').filter(h => (h.memory.multiRoom?.homeRoom || h.room.name) === homeRoom && h.memory.haulering);
            debugLog.debug(`${this.creep.name} found ${haulers.length} haulers to distribute among ${collectionTargets.length} targets`);
            assignCollectionTargetsToHaulers(haulers, collectionTargets);
            const assigned = this.memory.resourceTarget ? Game.getObjectById(this.memory.resourceTarget as Id<Resource | Tombstone | Ruin>) : null;
            debugLog.debug(`${this.creep.name} after assignment: resourceTarget=${this.memory.resourceTarget}, object found=${assigned !== null}`);
            if (!assigned) {
                debugLog.warn(`${this.creep.name} assignment failed, no object found for target ${this.memory.resourceTarget}`);
                this.cleanUpTargetsState();
                return;
            }
            if ('store' in assigned) {
                resourceTarget = assigned as Tombstone | Ruin;
            } else {
                resourceTarget = assigned as Resource;
            }
        } else {
            // Fallback when distribution is disabled: use closest target
            if (collectionTargets.length > 0) {
                const target = this.getAppropriateResourceTarget(collectionTargets);
                debugLog.debug(`${this.creep.name} no distribution, found closest target: ${target?.id}`);
                if (target && ('amount' in target || 'store' in target)) {
                    resourceTarget = target as Resource | Tombstone | Ruin;
                }
            }
        }

        if (resourceTarget !== null) {
            this.withdrawRemains(resourceTarget);
        } else {
            this.cleanUpTargetsState();
        }
    }
    /**
     * Execute transfer (delivery) phase
     */
    private executeTransfer(): void {
        // Handle return to home room if in multi-room mode and not in home room
        const homeRoom = this.memory.multiRoom?.homeRoom;
        if (homeRoom && this.creep.room.name !== homeRoom && this.memory.multiRoom?.collectionRoom) {
            if (!this.handleReturnToHome()) {
                return;
            }
        }

        const spawn = this.findSpawn();
        if (!spawn) return;

        // Use cached containers to avoid repeated FIND operations
        const cachedContainers = getCachedContainers(this.creep.room.name);

        const containers: StructureContainer[] = _.sortByOrder(
            cachedContainers.filter(c => c.store.getFreeCapacity(RESOURCE_ENERGY) > 0),
            (c) => c.store.getFreeCapacity(RESOURCE_ENERGY),
            'asc'
        );

        // Find all extensions in the room to check total count
        const allExtensions = this.creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => structure.structureType === STRUCTURE_EXTENSION
        });

        // Find extensions with free capacity
        const emptyExtensions = this.creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return structure.structureType === STRUCTURE_EXTENSION &&
                    structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            }
        });

        // Find spawns with free capacity
        const emptySpawns = this.creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return structure.structureType === STRUCTURE_SPAWN &&
                    structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            }
        });

        // Find towers with free capacity
        const emptyTowers = this.creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return structure.structureType === STRUCTURE_TOWER &&
                    structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            }
        });

        // Find storage structures with free capacity
        const emptyStorage = this.creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return structure.structureType === STRUCTURE_STORAGE &&
                    structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            }
        });

        // Find all spawns in the room
        const allSpawns = this.creep.room.find(FIND_MY_SPAWNS);

        // Check if all spawns are at full capacity
        const allSpawnsFull = allSpawns.length > 0 && allSpawns.every(spawn => spawn.store.getFreeCapacity(RESOURCE_ENERGY) === 0);

        // Check if all extensions are at full capacity
        const allExtensionsFull = allExtensions.length > 0 && allExtensions.every(ext => {
            const structure = ext as StructureExtension;
            return structure.store.getFreeCapacity(RESOURCE_ENERGY) === 0;
        });

        // Combined check: spawns and extensions are full
        const allSpawnsAndExtensionsFull = allSpawnsFull && allExtensionsFull;

        // Priority logic:
        // 1. Extensions (if room has > 2 extensions total)
        // 2. Spawns
        // 3. Towers
        // 4. Storage
        // 5. Containers (when spawns and extensions are ALL full)
        let targets = undefined;

        if (allExtensions.length > 2 && emptyExtensions.length > 0) {
            targets = emptyExtensions;
        } else if (emptySpawns.length > 0) {
            targets = emptySpawns;
        } else if (emptyTowers.length > 0) {
            targets = emptyTowers;
        } else if (emptyStorage.length > 0) {
            targets = emptyStorage;
        } else if (allSpawnsAndExtensionsFull && containers.length > 0) {
            targets = containers;
        } else if (allExtensions.length <= 2 && emptyExtensions.length > 0) {
            targets = emptyExtensions;
        }

        if (targets && targets.length > 0) {
            const target = this.creep.pos.findClosestByRange(targets);
            if (target) {
                const transferAction = this.creep.transfer(target, RESOURCE_ENERGY);

                if (transferAction === ERR_NOT_IN_RANGE) {
                    this.creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
                } else if (transferAction === OK) {
                    this.cleanUpTargetsState();
                }
            }
        } else {
            this.cleanUpTargetsState();
            this.creep.say(`Can't transfer`);
        }
    }

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    /**
     * Withdraw or pickup from resource target
     */
    private withdrawRemains(resourceTarget: Resource | Tombstone | Ruin): void {
        let withdrawAction: ScreepsReturnCode;

        if (resourceTarget instanceof Resource) {
            withdrawAction = this.creep.pickup(resourceTarget);
        } else {
            withdrawAction = this.creep.withdraw(resourceTarget, RESOURCE_ENERGY);
        }

        if (withdrawAction === ERR_NOT_IN_RANGE) {
            const moveResult = this.creep.moveTo(resourceTarget, { visualizePathStyle: { stroke: '#ffaa00' } });
            if (moveResult === ERR_NO_PATH) {
                this.cleanUpTargetsState();
            }
        } else if (withdrawAction === OK || withdrawAction === ERR_FULL) {
            // Mark as returning home if collected from multi-room source
            if (this.memory.multiRoom?.collectionRoom &&
                this.creep.room.name !== this.memory.multiRoom.homeRoom) {
                this.memory.multiRoom.isReturningHome = true;
            }
            this.cleanUpTargetsState();
        }
    }

    /**
     * Find appropriate resource target from collection targets
     */
    private getAppropriateResourceTarget(collectionTargets: Array<Resource | Tombstone | Ruin>): Resource | Tombstone | Ruin | null {
        if (collectionTargets.length === 0) {
            return null;
        }

        // Prefer previous target if still valid
        if (this.memory.resourceTarget) {
            const prevTarget = Game.getObjectById(this.memory.resourceTarget as Id<Resource | Tombstone | Ruin>);
            if (prevTarget && collectionTargets.includes(prevTarget)) {
                return prevTarget;
            }
        }

        // Otherwise find closest target
        const closest = this.creep.pos.findClosestByRange(collectionTargets);
        if (closest) {
            this.memory.resourceTarget = closest.id;
            return closest;
        }

        return null;
    }

    /**
     * Find the spawn in the current room
     */
    private findSpawn(): StructureSpawn | null {
        const spawn = this.creep.room.find(FIND_MY_SPAWNS)[0];
        if (!spawn) {
            debugLog.warn(`${this.creep.name} cannot find spawn in room ${this.creep.room.name}`);
            return null;
        }
        return spawn;
    }

    /**
     * Clean up target state in memory
     */
    private cleanUpTargetsState(): void {
        delete this.memory.resourceTarget;
        delete this.memory.prevResourceTarget;
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
                isReturningHome: false,
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
     * Find multi-room resources to collect
     */
    private findMultiRoomResources(): (Resource | Tombstone | Ruin)[] | null {
        if (!this.shouldUseMultiRoom()) {
            return null;
        }

        try {
            const homeRoom = this.memory.multiRoom?.homeRoom || this.creep.room.name;
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
                        resource.amount >= 10 &&
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
            if (this.memory.multiRoom && allResources.length > 0) {
                const targetResource = allResources[0];
                this.memory.multiRoom.collectionRoom = targetResource.room?.name;
                this.memory.multiRoom.lastMultiRoomAttempt = Game.time;
            }

            if (MULTI_ROOM_CONFIG.debugEnabled) {
                debugLog.debug(`${this.creep.name} found ${allResources.length} multi-room resources`);
            }

            return allResources;

        } catch (error) {
            debugLog.warn(`Error finding multi-room resources for ${this.creep.name}:`, error);
            this.resetMultiRoomState();
            return null;
        }
    }

    /**
     * Handle room transitions for multi-room hauling
     */
    private handleRoomTransition(targetRoom: string): boolean {
        const currentRoom = this.creep.room.name;

        // If already in target room, no transition needed
        if (currentRoom === targetRoom) {
            return true;
        }

        // Real-time safety check
        if (!checkRoomSafetyBeforeEntry(targetRoom)) {
            if (MULTI_ROOM_CONFIG.debugEnabled) {
                debugLog.warn(`${this.creep.name} (hauler) cannot access ${targetRoom} (safety failed)`);
            }
            this.resetMultiRoomState();
            return false;
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
                    visualizePathStyle: { stroke: '#00ffff' },
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
     * Handle returning to home room after collecting resources
     */
    private handleReturnToHome(): boolean {
        const homeRoom = this.memory.multiRoom?.homeRoom;
        if (!homeRoom) {
            return false;
        }

        const currentRoom = this.creep.room.name;

        // If already in home room, return success
        if (currentRoom === homeRoom) {
            if (this.memory.multiRoom) {
                this.memory.multiRoom.isReturningHome = false;
                this.memory.multiRoom.collectionRoom = undefined;
            }
            return true;
        }

        // Set returning home flag
        if (this.memory.multiRoom) {
            this.memory.multiRoom.isReturningHome = true;
        }

        // Handle room transition to home
        return this.handleRoomTransition(homeRoom);
    }

    /**
     * Reset multi-room state and increment failure count
     */
    private resetMultiRoomState(): void {
        if (this.memory.multiRoom) {
            this.memory.multiRoom.isReturningHome = false;
            this.memory.multiRoom.collectionRoom = undefined;
            this.memory.multiRoom.failureCount++;

            if (MULTI_ROOM_CONFIG.debugEnabled) {
                debugLog.debug(`${this.creep.name} multi-room state reset, failures: ${this.memory.multiRoom.failureCount}`);
            }
        }

        this.cleanUpTargetsState();
    }
}

// Export the class for instance caching
export { HaulerCreep };

/**
 * Factory export for hauler role
 */
export default {
    run: (creep: Creep) => new HaulerCreep(creep).run()
};
