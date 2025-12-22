/**
 * Resource Distribution and Anti-Crowding System
 *
 * This module provides functions to manage creep distribution across resource nodes,
 * prevent overcrowding, and optimize resource collection efficiency.
 */

import { MULTI_ROOM_CONFIG } from '../config/multi-room.config';
import { debugLog } from './Logger';
import { getCreepsByRole } from '../types';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface SourceAssignment {
  sourceId: Id<Source>;
  roomName: string;
  assignedCreeps: string[];
  maxCreeps: number;
  priority: number;
  distance: number;
}

interface CreepDistributionInfo {
  creepName: string;
  currentTarget?: Id<Source>;
  position: RoomPosition;
  role: string;
  capacity: number;
}

// ============================================================================
// MAIN DISTRIBUTION FUNCTIONS
// ============================================================================

/**
 * Assigns unique targets to creeps to prevent overcrowding
 * @param creeps - Array of creeps to assign targets to
 * @param sources - Array of available sources
 */
export function assignUniqueTargets(creeps: Creep[], sources: Source[]): void {
  if (creeps.length === 0 || sources.length === 0) {
    return;
  }

  // Create source assignments
  const sourceAssignments: SourceAssignment[] = sources.map(source => ({
    sourceId: source.id,
    roomName: source.room.name,
    assignedCreeps: [],
    maxCreeps: MULTI_ROOM_CONFIG.maxCreepsPerSource,
    priority: calculateSourcePriority(source, creeps[0].room.name),
    distance: 0 // Will be calculated per creep
  }));

  // Sort sources by priority (higher is better)
  sourceAssignments.sort((a, b) => b.priority - a.priority);

  // Get current assignments
  const currentAssignments = getCurrentSourceAssignments(creeps);

  // Assign creeps to sources
  for (const creep of creeps) {
    const bestSource = findBestSourceForCreep(creep, sourceAssignments, currentAssignments);
    if (bestSource) {
      // Update creep memory
      creep.memory.sourceTarget = bestSource.sourceId;

      // Update assignment tracking
      bestSource.assignedCreeps.push(creep.name);
      currentAssignments.set(creep.name, bestSource.sourceId);

      if (MULTI_ROOM_CONFIG.debugEnabled) {
        debugLog.debug(`Assigned ${creep.name} to source ${bestSource.sourceId} in ${bestSource.roomName}`);
      }
    }
  }
}

/**
 * Gets available targets excluding those already assigned
 * @param sources - Array of all available sources
 * @param excludeIds - Array of source IDs to exclude
 * @returns Filtered array of available sources
 */
export function getAvailableTargets(sources: Source[], excludeIds: string[]): Source[] {
  return sources.filter(source => !excludeIds.includes(source.id));
}

/**
 * Optimizes hauler routes to cycle between different resource sources
 * @param haulers - Array of hauler creeps
 * @param sources - Array of available sources (for dropped resources)
 */
export function optimizeHaulerRoutes(haulers: Creep[], sources: Source[]): void {
  if (haulers.length === 0) {
    return;
  }

  // Group haulers by their current room
  const haulersByRoom = new Map<string, Creep[]>();
  haulers.forEach(hauler => {
    const roomName = hauler.room.name;
    if (!haulersByRoom.has(roomName)) {
      haulersByRoom.set(roomName, []);
    }
    haulersByRoom.get(roomName)!.push(hauler);
  });

  // Optimize routes for each room
  haulersByRoom.forEach((roomHaulers, roomName) => {
    optimizeHaulersInRoom(roomHaulers, roomName, sources);
  });
}

/**
 * Redistributes creeps from overcrowded sources
 */
export function redistributeOvercrowdedSources(): void {
  const harvesters = getCreepsByRole('harvester');
  if (harvesters.length === 0) {
    return;
  }

  // Group harvesters by their target source
  const sourceGroups = new Map<Id<Source>, Creep[]>();
  harvesters.forEach(harvester => {
    const targetId = harvester.memory.sourceTarget;
    if (targetId) {
      if (!sourceGroups.has(targetId)) {
        sourceGroups.set(targetId, []);
      }
      sourceGroups.get(targetId)!.push(harvester);
    }
  });

  // Find overcrowded sources and redistribute
  sourceGroups.forEach((creeps, sourceId) => {
    if (creeps.length > MULTI_ROOM_CONFIG.maxCreepsPerSource) {
      redistributeCreepsFromSource(creeps, sourceId);
    }
  });
}

/**
 * Calculates optimal creep distribution across available sources
 * @param creeps - Array of creeps to distribute
 * @param sources - Array of available sources
 * @returns Optimal distribution plan
 */
export function calculateOptimalCreepDistribution(creeps: Creep[], sources: Source[]): Map<Id<Source>, string[]> {
  const distribution = new Map<Id<Source>, string[]>();

  if (creeps.length === 0 || sources.length === 0) {
    return distribution;
  }

  // Initialize distribution map
  sources.forEach(source => {
    distribution.set(source.id, []);
  });

  // Sort creeps by priority (higher capacity first, then by distance to sources)
  const sortedCreeps = [...creeps].sort((a, b) => {
    const capacityDiff = b.store.getCapacity() - a.store.getCapacity();
    if (capacityDiff !== 0) return capacityDiff;

    // If same capacity, sort by average distance to sources
    const avgDistanceA = calculateAverageDistanceToSources(a, sources);
    const avgDistanceB = calculateAverageDistanceToSources(b, sources);
    return avgDistanceA - avgDistanceB;
  });

  // Distribute creeps using round-robin with priority
  let sourceIndex = 0;
  for (const creep of sortedCreeps) {
    // Find the source with the least assigned creeps
    let bestSource = sources[0];
    let minAssigned = distribution.get(bestSource.id)!.length;

    for (const source of sources) {
      const assigned = distribution.get(source.id)!.length;
      if (assigned < minAssigned && assigned < MULTI_ROOM_CONFIG.maxCreepsPerSource) {
        bestSource = source;
        minAssigned = assigned;
      }
    }

    // Assign creep to best source
    distribution.get(bestSource.id)!.push(creep.name);
  }

  return distribution;
}

/**
 * Assigns unique collection targets (tombstones/ruins/dropped energy) to haulers
 * respecting max creeps per target and prioritizing higher energy amounts.
 */
export function assignCollectionTargetsToHaulers(
  haulers: Creep[],
  targets: Array<Resource | Tombstone | Ruin>
): void {
  if (haulers.length === 0 || targets.length === 0) {
    return;
  }

  const maxPerTarget = MULTI_ROOM_CONFIG.maxCreepsPerSource;

  const targetInfos = targets.map(t => ({
    id: t.id,
    roomName: t?.room?.name,
    energy: getAvailableEnergy(t),
    assigned: [] as string[]
  })).filter(t => t.energy > 0);

  // Sort by available energy (desc)
  targetInfos.sort((a, b) => b.energy - a.energy);

  const currentAssignments = new Map<string, string>();
  haulers.forEach(h => {
    if (h.memory.resourceTarget) {
      currentAssignments.set(h.name, h.memory.resourceTarget);
    }
  });

  // Prefer keeping existing assignments if capacity remains
  const findExisting = (hauler: Creep) => {
    const existing = currentAssignments.get(hauler.name);
    if (!existing) return null;
    const info = targetInfos.find(t => t.id === existing);
    if (info && info.assigned.length < maxPerTarget) {
      return info;
    }
    return null;
  };

  const findBest = (hauler: Creep) => {
    let best = null as typeof targetInfos[number] | null;
    for (const info of targetInfos) {
      if (info.assigned.length >= maxPerTarget) continue;
      if (!best) {
        best = info;
        continue;
      }
      // Prefer higher energy, then lower load
      if (info.energy > best.energy) {
        best = info;
      } else if (info.energy === best.energy && info.assigned.length < best.assigned.length) {
        best = info;
      }
    }
    return best;
  };

  // Assign haulers (higher capacity first)
  const sortedHaulers = [...haulers].sort((a, b) => b.store.getCapacity() - a.store.getCapacity());
  for (const hauler of sortedHaulers) {
    const chosen = findExisting(hauler) || findBest(hauler);
    if (chosen) {
      hauler.memory.resourceTarget = chosen.id;
      chosen.assigned.push(hauler.name);
      if (MULTI_ROOM_CONFIG.debugEnabled) {
        debugLog.debug(`Hauler ${hauler.name} assigned to collection ${chosen.id} (${chosen.energy})`);
      }
    } else {
      hauler.memory.resourceTarget = undefined;
    }
  }
}

function getAvailableEnergy(target: Resource | Tombstone | Ruin): number {
  if ('amount' in target) {
    return target.amount;
  }
  if ('store' in target) {
    return target.store.getUsedCapacity(RESOURCE_ENERGY) || 0;
  }
  return 0;
}

// ============================================================================
// INTERNAL HELPER FUNCTIONS
// ============================================================================

/**
 * Calculates priority score for a source
 */
function calculateSourcePriority(source: Source, homeRoom: string): number {
  let priority = 100; // Base priority

  // Energy amount bonus
  const energyRatio = source.energy / source.energyCapacity;
  priority *= (0.5 + energyRatio * 0.5);

  // Distance penalty
  const distance = Game.map.getRoomLinearDistance(homeRoom, source.room.name);
  const distanceMultiplier = MULTI_ROOM_CONFIG.distancePriorityMultiplier[distance as keyof typeof MULTI_ROOM_CONFIG.distancePriorityMultiplier] || 0.2;
  priority *= distanceMultiplier;

  return Math.round(priority);
}

/**
 * Gets current source assignments for all creeps
 */
function getCurrentSourceAssignments(creeps: Creep[]): Map<string, Id<Source>> {
  const assignments = new Map<string, Id<Source>>();

  creeps.forEach(creep => {
    if (creep.memory.sourceTarget) {
      assignments.set(creep.name, creep.memory.sourceTarget);
    }
  });

  return assignments;
}

/**
 * Finds the best source for a specific creep
 */
function findBestSourceForCreep(
  creep: Creep,
  sourceAssignments: SourceAssignment[],
  currentAssignments: Map<string, Id<Source>>
): SourceAssignment | null {
  // Check if creep already has a good assignment
  const currentTarget = currentAssignments.get(creep.name);
  if (currentTarget) {
    const currentAssignment = sourceAssignments.find(sa => sa.sourceId === currentTarget);
    if (currentAssignment && currentAssignment.assignedCreeps.length < currentAssignment.maxCreeps) {
      return currentAssignment;
    }
  }

  // Find best available source
  for (const sourceAssignment of sourceAssignments) {
    if (sourceAssignment.assignedCreeps.length < sourceAssignment.maxCreeps) {
      // Calculate distance for this creep
      const source = Game.getObjectById(sourceAssignment.sourceId);
      if (source) {
        sourceAssignment.distance = creep.pos.findPathTo(source).length;
        return sourceAssignment;
      }
    }
  }

  return null;
}

/**
 * Optimizes hauler routes within a specific room
 */
function optimizeHaulersInRoom(haulers: Creep[], roomName: string, sources: Source[]): void {
  // Find sources in this room
  const roomSources = sources.filter(source => source.room.name === roomName);
  if (roomSources.length === 0) {
    return;
  }

  // Assign haulers to different areas around sources
  haulers.forEach((hauler, index) => {
    const targetSourceIndex = index % roomSources.length;
    const targetSource = roomSources[targetSourceIndex];

    // Store preferred collection area in memory
    if (!hauler.memory.multiRoom) {
      hauler.memory.multiRoom = {
        enabled: MULTI_ROOM_CONFIG.enabled,
        homeRoom: roomName,
        isReturningHome: false,
        failureCount: 0
      };
    }

    // Set collection preference
    hauler.memory.preferredCollectionSource = targetSource.id;

    if (MULTI_ROOM_CONFIG.debugEnabled) {
      debugLog.debug(`Optimized route for ${hauler.name} to focus on source ${targetSource.id}`);
    }
  });
}

/**
 * Redistributes creeps from an overcrowded source
 */
function redistributeCreepsFromSource(creeps: Creep[], sourceId: Id<Source>): void {
  // Sort creeps by distance to source (farthest first for redistribution)
  const source = Game.getObjectById(sourceId);
  if (!source) {
    return;
  }

  const sortedCreeps = creeps.sort((a, b) => {
    const distanceA = a.pos.getRangeTo(source);
    const distanceB = b.pos.getRangeTo(source);
    return distanceB - distanceA; // Farthest first
  });

  // Keep only the allowed number of creeps
  const excessCreeps = sortedCreeps.slice(MULTI_ROOM_CONFIG.maxCreepsPerSource);

  // Clear targets for excess creeps so they find new sources
  excessCreeps.forEach(creep => {
    creep.memory.sourceTarget = undefined;
    creep.memory.prevSourceTarget = sourceId;

    if (MULTI_ROOM_CONFIG.debugEnabled) {
      debugLog.debug(`Redistributed ${creep.name} from overcrowded source ${sourceId}`);
    }
  });
}

/**
 * Calculates average distance from a creep to all sources
 */
function calculateAverageDistanceToSources(creep: Creep, sources: Source[]): number {
  if (sources.length === 0) {
    return 0;
  }

  const totalDistance = sources.reduce((sum, source) => {
    return sum + creep.pos.getRangeTo(source);
  }, 0);

  return totalDistance / sources.length;
}
