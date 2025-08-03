/**
 * Multi-Room Resource Discovery Utilities
 *
 * This module provides functions to discover and prioritize energy sources
 * across multiple rooms while respecting safety and accessibility constraints.
 */

import { MULTI_ROOM_CONFIG, RoomType } from '../config/multi-room.config';
import { isRoomSafe, isRoomAccessible, getRoomResourceValue } from './room-safety';
import { debugLog } from './Logger';

// Import types from room-safety.ts to avoid circular imports
type MultiRoomSource = {
  source: Source;
  roomName: string;
  distance: number;
  priority: number;
  safetyStatus: boolean;
  accessibility: boolean;
  resourceValue: number;
};

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

// MultiRoomSource and ResourceDiscoveryCache interfaces are declared in room-safety.ts to avoid conflicts

// ============================================================================
// GLOBAL CACHE STORAGE
// ============================================================================

// Note: Memory interface is declared in room-safety.ts to avoid conflicts

// Initialize resource cache if it doesn't exist
function initializeResourceCache(): void {
  if (!Memory.multiRoom) {
    Memory.multiRoom = {};
  }
  if (!Memory.multiRoom.resourceCache) {
    Memory.multiRoom.resourceCache = {};
  }
}

// ============================================================================
// MAIN RESOURCE DISCOVERY FUNCTIONS
// ============================================================================

/**
 * Finds all available energy sources within the specified exploration depth
 * @param homeRoom - The home room to search from
 * @param depth - Exploration depth (0 = current room only, 1 = adjacent rooms, etc.)
 * @param forceRefresh - Force a fresh scan, ignoring cache
 * @returns Array of MultiRoomSource objects sorted by priority
 */
export function findMultiRoomSources(homeRoom: string, depth: number = MULTI_ROOM_CONFIG.explorationDepth, forceRefresh: boolean = false): MultiRoomSource[] {
  initializeResourceCache();

  const cached = Memory.multiRoom!.resourceCache![homeRoom];
  const now = Game.time;

  // Use cached result if available and not expired
  if (!forceRefresh && cached &&
      (now - cached.lastUpdated) < MULTI_ROOM_CONFIG.resourceCacheDuration &&
      cached.explorationDepth === depth) {

    if (MULTI_ROOM_CONFIG.debugEnabled) {
      debugLog.debug(`Using cached multi-room sources for ${homeRoom}: ${cached.sources.length} sources`);
    }

    return cached.sources.filter(source => source.safetyStatus && source.accessibility);
  }

  // Perform fresh resource discovery
  const discoveredSources = performResourceDiscovery(homeRoom, depth);

  // Cache the results
  Memory.multiRoom!.resourceCache![homeRoom] = {
    sources: discoveredSources,
    lastUpdated: now,
    homeRoom,
    explorationDepth: depth
  };

  if (MULTI_ROOM_CONFIG.debugEnabled) {
    debugLog.debug(`Discovered ${discoveredSources.length} multi-room sources for ${homeRoom} (depth: ${depth})`);
  }

  return discoveredSources.filter(source => source.safetyStatus && source.accessibility);
}

/**
 * Gets energy sources from adjacent rooms only
 * @param roomName - The room to find adjacent sources for
 * @returns Array of MultiRoomSource objects from adjacent rooms
 */
export function getAdjacentRoomSources(roomName: string): MultiRoomSource[] {
  const adjacentRooms = getAdjacentRoomNames(roomName);
  const sources: MultiRoomSource[] = [];

  adjacentRooms.forEach(adjRoomName => {
    if (isRoomSafe(adjRoomName) && isRoomAccessible(roomName, adjRoomName)) {
      const roomSources = getRoomSources(adjRoomName, roomName, 1);
      sources.push(...roomSources);
    }
  });

  return prioritizeSourcesByDistance(sources, roomName);
}

/**
 * Prioritizes sources by distance and other factors
 * @param sources - Array of MultiRoomSource objects to prioritize
 * @param homeRoom - The home room for distance calculations (currently unused but kept for future use)
 * @returns Sorted array of sources by priority (highest first)
 */
export function prioritizeSourcesByDistance(sources: MultiRoomSource[], homeRoom: string): MultiRoomSource[] {
  // Note: homeRoom parameter is kept for future distance-based sorting enhancements
  return sources.sort((a, b) => {
    // Primary sort: priority (higher is better)
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }

    // Secondary sort: distance (closer is better)
    if (a.distance !== b.distance) {
      return a.distance - b.distance;
    }

    // Tertiary sort: resource value (higher is better)
    return b.resourceValue - a.resourceValue;
  });
}

/**
 * Filters sources to only include those from safe rooms
 * @param sources - Array of MultiRoomSource objects to filter
 * @returns Filtered array containing only sources from safe rooms
 */
export function filterSafeRoomSources(sources: MultiRoomSource[]): MultiRoomSource[] {
  return sources.filter(source => source.safetyStatus && source.accessibility);
}

// ============================================================================
// INTERNAL RESOURCE DISCOVERY FUNCTIONS
// ============================================================================

/**
 * Performs the actual resource discovery across multiple rooms
 * @param homeRoom - The home room to search from
 * @param depth - Exploration depth
 * @returns Array of discovered MultiRoomSource objects
 */
function performResourceDiscovery(homeRoom: string, depth: number): MultiRoomSource[] {
  const allSources: MultiRoomSource[] = [];
  const visitedRooms = new Set<string>();
  const roomsToExplore: Array<{ roomName: string; distance: number }> = [{ roomName: homeRoom, distance: 0 }];

  while (roomsToExplore.length > 0 && allSources.length < 50) { // Limit to prevent infinite loops
    const { roomName, distance } = roomsToExplore.shift()!;

    // Skip if already visited or beyond exploration depth
    if (visitedRooms.has(roomName) || distance > depth) {
      continue;
    }

    visitedRooms.add(roomName);

    // Get sources from this room
    const roomSources = getRoomSources(roomName, homeRoom, distance);
    allSources.push(...roomSources);

    // Add adjacent rooms to exploration queue if within depth
    if (distance < depth) {
      const adjacentRooms = getAdjacentRoomNames(roomName);
      adjacentRooms.forEach(adjRoomName => {
        if (!visitedRooms.has(adjRoomName)) {
          roomsToExplore.push({ roomName: adjRoomName, distance: distance + 1 });
        }
      });
    }
  }

  return prioritizeSourcesByDistance(allSources, homeRoom);
}

/**
 * Gets all energy sources from a specific room
 * @param roomName - The room to get sources from
 * @param homeRoom - The home room for distance/priority calculations
 * @param distance - Distance from home room
 * @returns Array of MultiRoomSource objects from the specified room
 */
function getRoomSources(roomName: string, homeRoom: string, distance: number): MultiRoomSource[] {
  const room = Game.rooms[roomName];
  const sources: MultiRoomSource[] = [];

  // Skip if room is not visible
  if (!room) {
    return sources;
  }

  // Check room safety and accessibility
  const safetyStatus = isRoomSafe(roomName);
  const accessibility = isRoomAccessible(homeRoom, roomName);

  // Skip unsafe or inaccessible rooms
  if (!safetyStatus || !accessibility) {
    return sources;
  }

  // Get all energy sources in the room
  const roomSources = room.find(FIND_SOURCES);
  const resourceValue = getRoomResourceValue(room);

  roomSources.forEach(source => {
    // Skip sources with insufficient energy
    if (source.energy < MULTI_ROOM_CONFIG.minSourceEnergy) {
      return;
    }

    const priority = calculateSourcePriority(source, roomName, homeRoom, distance, resourceValue);

    sources.push({
      source,
      roomName,
      distance,
      priority,
      safetyStatus,
      accessibility,
      resourceValue
    });
  });

  return sources;
}

/**
 * Calculates the priority score for a source
 * @param source - The energy source
 * @param roomName - The room containing the source
 * @param homeRoom - The home room (currently unused but kept for future use)
 * @param distance - Distance from home room
 * @param resourceValue - Total resource value of the room
 * @returns Priority score (higher is better)
 */
function calculateSourcePriority(source: Source, roomName: string, homeRoom: string, distance: number, resourceValue: number): number {
  // Note: homeRoom parameter is kept for future room-specific priority calculations
  let priority = 100; // Base priority

  // Distance penalty
  const distanceMultiplier = MULTI_ROOM_CONFIG.distancePriorityMultiplier[distance as keyof typeof MULTI_ROOM_CONFIG.distancePriorityMultiplier] || 0.2;
  priority *= distanceMultiplier;

  // Energy amount bonus
  const energyRatio = source.energy / source.energyCapacity;
  priority *= (0.5 + energyRatio * 0.5); // 50% base + 50% based on energy ratio

  // Room type bonus
  const room = Game.rooms[roomName];
  if (room?.controller) {
    if (room.controller.my) {
      priority *= MULTI_ROOM_CONFIG.roomTypePriority.owned / 100;
    } else if (room.controller.reservation && room.controller.reservation.username === 'YourUsername') {
      priority *= MULTI_ROOM_CONFIG.roomTypePriority.reserved / 100;
    } else {
      priority *= MULTI_ROOM_CONFIG.roomTypePriority.neutral / 100;
    }
  }

  // Resource value bonus
  if (resourceValue > 1000) {
    priority *= 1.2; // 20% bonus for resource-rich rooms
  }

  return Math.round(priority);
}

/**
 * Gets the names of adjacent rooms
 * @param roomName - The room to find adjacent rooms for
 * @returns Array of adjacent room names
 */
function getAdjacentRoomNames(roomName: string): string[] {
  try {
    const exits = Game.map.describeExits(roomName);
    return Object.values(exits).filter(name => name !== undefined) as string[];
  } catch (error) {
    debugLog.warn(`Error getting adjacent rooms for ${roomName}:`, error);
    return [];
  }
}

// ============================================================================
// CACHE MANAGEMENT AND UTILITIES
// ============================================================================

/**
 * Clears the resource discovery cache for a specific room or all rooms
 * @param homeRoom - Optional specific room to clear cache for
 */
export function clearResourceCache(homeRoom?: string): void {
  initializeResourceCache();

  if (homeRoom) {
    delete Memory.multiRoom!.resourceCache![homeRoom];
    if (MULTI_ROOM_CONFIG.debugEnabled) {
      debugLog.debug(`Cleared resource cache for ${homeRoom}`);
    }
  } else {
    Memory.multiRoom!.resourceCache = {};
    if (MULTI_ROOM_CONFIG.debugEnabled) {
      debugLog.debug('Cleared all resource caches');
    }
  }
}

/**
 * Gets statistics about the current resource cache
 * @returns Object containing cache statistics
 */
export function getResourceCacheStats(): { totalRooms: number; totalSources: number; oldestCache: number } {
  initializeResourceCache();

  const cache = Memory.multiRoom!.resourceCache!;
  const now = Game.time;
  let totalSources = 0;
  let oldestCache = now;

  Object.values(cache).forEach(roomCache => {
    totalSources += roomCache.sources.length;
    if (roomCache.lastUpdated < oldestCache) {
      oldestCache = roomCache.lastUpdated;
    }
  });

  return {
    totalRooms: Object.keys(cache).length,
    totalSources,
    oldestCache: now - oldestCache
  };
}

/**
 * Updates resource discovery for all cached rooms if needed
 */
export function updateResourceDiscoveryCache(): void {
  initializeResourceCache();

  const cache = Memory.multiRoom!.resourceCache!;
  const now = Game.time;

  Object.keys(cache).forEach(homeRoom => {
    const roomCache = cache[homeRoom];
    if (now - roomCache.lastUpdated >= MULTI_ROOM_CONFIG.resourceDiscoveryInterval) {
      findMultiRoomSources(homeRoom, roomCache.explorationDepth, true);
    }
  });
}
