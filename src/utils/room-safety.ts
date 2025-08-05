/**
 * Room Safety and Accessibility Assessment Utilities
 *
 * This module provides functions to evaluate room safety, accessibility,
 * and resource availability for multi-room operations.
 */

import {
  MULTI_ROOM_CONFIG,
  RoomSafetyStatus,
  RoomType
} from '../config/multi-room.config';
import { debugLog } from './Logger';

// Forward declarations for multi-room types to avoid circular imports
interface MultiRoomSource {
  source: Source;
  roomName: string;
  distance: number;
  priority: number;
  safetyStatus: boolean;
  accessibility: boolean;
  resourceValue: number;
}

interface ResourceDiscoveryCache {
  sources: MultiRoomSource[];
  lastUpdated: number;
  homeRoom: string;
  explorationDepth: number;
}

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface RoomSafetyInfo {
  status: RoomSafetyStatus;
  lastChecked: number;
  hostileCreeps: number;
  hostileStructures: number;
  controllerLevel?: number;
  roomType: RoomType;
  resourceValue: number;
}

interface RoomAccessibilityInfo {
  accessible: boolean;
  exitDirection?: ExitConstant;
  pathCost: number;
  lastChecked: number;
}

// ============================================================================
// GLOBAL CACHE STORAGE
// ============================================================================

/**
 * Global cache for multi-room information
 * Stored in Memory to persist across ticks
 */
declare global {
  interface Memory {
    multiRoom?: {
      roomSafety?: { [roomName: string]: RoomSafetyInfo };
      roomAccessibility?: { [fromRoom: string]: { [toRoom: string]: RoomAccessibilityInfo } };
      resourceCache?: { [homeRoom: string]: ResourceDiscoveryCache };
      lastGlobalUpdate?: number;
    };
  }
}

// Initialize memory structure if it doesn't exist
function initializeMultiRoomMemory(): void {
  if (!Memory.multiRoom) {
    Memory.multiRoom = {
      roomSafety: {},
      roomAccessibility: {},
      lastGlobalUpdate: Game.time
    };
  }
  if (!Memory.multiRoom.roomSafety) Memory.multiRoom.roomSafety = {};
  if (!Memory.multiRoom.roomAccessibility) Memory.multiRoom.roomAccessibility = {};
}

// ============================================================================
// ROOM SAFETY ASSESSMENT
// ============================================================================

/**
 * Checks if a room is safe for multi-room operations
 * @param roomName - Name of the room to check
 * @param forceRefresh - Force a fresh check, ignoring cache
 * @returns true if the room is safe, false otherwise
 */
export function isRoomSafe(roomName: string, forceRefresh: boolean = false): boolean {
  initializeMultiRoomMemory();

  const cached = Memory.multiRoom!.roomSafety![roomName];
  const now = Game.time;

  // Use cached result if available and not expired
  if (!forceRefresh && cached && (now - cached.lastChecked) < MULTI_ROOM_CONFIG.safetyCacheDuration) {
    if (MULTI_ROOM_CONFIG.debugEnabled) {
      debugLog.debug(`Room safety (cached): ${roomName} = ${cached.status}`);
    }
    return cached.status === RoomSafetyStatus.SAFE;
  }

  // Perform fresh safety check
  const safetyInfo = assessRoomSafety(roomName);

  // Cache the result
  Memory.multiRoom!.roomSafety![roomName] = safetyInfo;

  if (MULTI_ROOM_CONFIG.debugEnabled) {
    debugLog.debug(`Room safety (fresh): ${roomName} = ${safetyInfo.status}, hostiles: ${safetyInfo.hostileCreeps}/${safetyInfo.hostileStructures}`);
  }

  return safetyInfo.status === RoomSafetyStatus.SAFE;
}

/**
 * Performs a comprehensive safety assessment of a room
 * @param roomName - Name of the room to assess
 * @returns RoomSafetyInfo object with detailed safety information
 */
function assessRoomSafety(roomName: string): RoomSafetyInfo {
  const room = Game.rooms[roomName];

  // If room is not visible, mark as unknown
  if (!room) {
    return {
      status: RoomSafetyStatus.UNKNOWN,
      lastChecked: Game.time,
      hostileCreeps: 0,
      hostileStructures: 0,
      roomType: 'neutral',
      resourceValue: 0
    };
  }

  // Count hostile creeps and structures
  const hostileCreeps = room.find(FIND_HOSTILE_CREEPS);
  const hostileStructures = room.find(FIND_HOSTILE_STRUCTURES);

  // Determine room type and controller level
  const controller = room.controller;
  let roomType: RoomType = 'neutral';
  let controllerLevel = 0;

  if (controller) {
    controllerLevel = controller.level;
    if (controller.my) {
      roomType = 'owned';
    } else if (controller.reservation && controller.reservation.username === 'YourUsername') {
      roomType = 'reserved';
    } else if (controller.owner || (controller.reservation && controller.reservation.username !== 'YourUsername')) {
      roomType = 'hostile';
    }
  }

  // Calculate resource value
  const resourceValue = calculateRoomResourceValue(room);

  // Determine safety status
  let status = RoomSafetyStatus.SAFE;

  if (roomType === 'hostile') {
    status = RoomSafetyStatus.UNSAFE;
  } else if (hostileCreeps.length > MULTI_ROOM_CONFIG.maxHostileCreeps) {
    status = RoomSafetyStatus.UNSAFE;
  } else if (hostileStructures.length > MULTI_ROOM_CONFIG.maxHostileStructures) {
    status = RoomSafetyStatus.UNSAFE;
  } else if (controllerLevel < MULTI_ROOM_CONFIG.minControllerLevel) {
    status = RoomSafetyStatus.UNSAFE;
  }

  return {
    status,
    lastChecked: Game.time,
    hostileCreeps: hostileCreeps.length,
    hostileStructures: hostileStructures.length,
    controllerLevel,
    roomType,
    resourceValue
  };
}

// ============================================================================
// ROOM ACCESSIBILITY ASSESSMENT
// ============================================================================

/**
 * Checks if a room is accessible from another room
 * @param fromRoom - Starting room name
 * @param toRoom - Target room name
 * @param forceRefresh - Force a fresh check, ignoring cache
 * @returns true if the room is accessible, false otherwise
 */
export function isRoomAccessible(fromRoom: string, toRoom: string, forceRefresh: boolean = false): boolean {
  initializeMultiRoomMemory();

  const cached = Memory.multiRoom!.roomAccessibility![fromRoom]?.[toRoom];
  const now = Game.time;

  // Use cached result if available and not expired
  if (!forceRefresh && cached && (now - cached.lastChecked) < MULTI_ROOM_CONFIG.safetyCacheDuration) {
    if (MULTI_ROOM_CONFIG.debugEnabled) {
      debugLog.debug(`Room accessibility (cached): ${fromRoom} -> ${toRoom} = ${cached.accessible}`);
    }
    return cached.accessible;
  }

  // Perform fresh accessibility check
  const accessibilityInfo = assessRoomAccessibility(fromRoom, toRoom);

  // Cache the result
  if (!Memory.multiRoom!.roomAccessibility![fromRoom]) {
    Memory.multiRoom!.roomAccessibility![fromRoom] = {};
  }
  Memory.multiRoom!.roomAccessibility![fromRoom][toRoom] = accessibilityInfo;

  if (MULTI_ROOM_CONFIG.debugEnabled) {
    debugLog.debug(`Room accessibility (fresh): ${fromRoom} -> ${toRoom} = ${accessibilityInfo.accessible}, cost: ${accessibilityInfo.pathCost}`);
  }

  return accessibilityInfo.accessible;
}

/**
 * Performs a comprehensive accessibility assessment between two rooms
 * @param fromRoom - Starting room name
 * @param toRoom - Target room name
 * @returns RoomAccessibilityInfo object with detailed accessibility information
 */
function assessRoomAccessibility(fromRoom: string, toRoom: string): RoomAccessibilityInfo {
  try {
    // Check if rooms are the same
    if (fromRoom === toRoom) {
      return {
        accessible: true,
        pathCost: 0,
        lastChecked: Game.time
      };
    }

    // Try to find exit direction
    const exitDirection = Game.map.findExit(fromRoom, toRoom);

    if (exitDirection === ERR_NO_PATH || exitDirection === ERR_INVALID_ARGS) {
      return {
        accessible: false,
        pathCost: Infinity,
        lastChecked: Game.time
      };
    }

    // Calculate path cost using Game.map.findRoute
    const route = Game.map.findRoute(fromRoom, toRoom);

    if (route === ERR_NO_PATH) {
      return {
        accessible: false,
        pathCost: Infinity,
        lastChecked: Game.time
      };
    }

    const pathCost = Array.isArray(route) ? route.length : 1;

    return {
      accessible: true,
      exitDirection: exitDirection as ExitConstant,
      pathCost,
      lastChecked: Game.time
    };

  } catch (error) {
    debugLog.warn(`Error assessing room accessibility from ${fromRoom} to ${toRoom}:`, error);
    return {
      accessible: false,
      pathCost: Infinity,
      lastChecked: Game.time
    };
  }
}

// ============================================================================
// RESOURCE VALUE ASSESSMENT
// ============================================================================

/**
 * Calculates the resource value of a room
 * @param roomName - Name of the room to evaluate (if string) or Room object
 * @returns Numerical value representing the room's resource worth
 */
export function getRoomResourceValue(roomName: string | Room): number {
  const room = typeof roomName === 'string' ? Game.rooms[roomName] : roomName;

  if (!room) {
    return 0;
  }

  return calculateRoomResourceValue(room);
}

/**
 * Internal function to calculate room resource value
 * @param room - Room object to evaluate
 * @returns Numerical resource value
 */
function calculateRoomResourceValue(room: Room): number {
  let value = 0;

  // Add value for energy sources
  const sources = room.find(FIND_SOURCES);
  sources.forEach(source => {
    if (source.energy >= MULTI_ROOM_CONFIG.minSourceEnergy) {
      value += source.energy;
    }
  });

  // Add value for dropped resources
  const droppedResources = room.find(FIND_DROPPED_RESOURCES, {
    filter: resource => resource.resourceType === RESOURCE_ENERGY && resource.amount >= 50
  });
  droppedResources.forEach(resource => {
    value += resource.amount;
  });

  // Add value for tombstones and ruins with energy
  const tombstones = room.find(FIND_TOMBSTONES, {
    filter: tombstone => tombstone.store.energy > 0
  });
  tombstones.forEach(tombstone => {
    value += tombstone.store.energy;
  });

  const ruins = room.find(FIND_RUINS, {
    filter: ruin => ruin.store.energy > 0
  });
  ruins.forEach(ruin => {
    value += ruin.store.energy;
  });

  return value;
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

/**
 * Updates the room safety cache for all known rooms
 * Should be called periodically to maintain fresh safety information
 */
export function updateRoomSafetyCache(): void {
  initializeMultiRoomMemory();

  const now = Game.time;
  const lastUpdate = Memory.multiRoom!.lastGlobalUpdate || 0;

  // Only update if enough time has passed
  if (now - lastUpdate < MULTI_ROOM_CONFIG.safetyCheckInterval) {
    return;
  }

  // Update safety info for all visible rooms
  Object.keys(Game.rooms).forEach(roomName => {
    const cached = Memory.multiRoom!.roomSafety![roomName];
    if (!cached || (now - cached.lastChecked) >= MULTI_ROOM_CONFIG.safetyCheckInterval) {
      isRoomSafe(roomName, true); // Force refresh
    }
  });

  Memory.multiRoom!.lastGlobalUpdate = now;

  if (MULTI_ROOM_CONFIG.debugEnabled) {
    debugLog.debug(`Updated room safety cache for ${Object.keys(Game.rooms).length} rooms`);
  }
}

/**
 * Clears expired entries from the room safety and accessibility caches
 */
export function cleanupRoomCaches(): void {
  initializeMultiRoomMemory();

  const now = Game.time;
  const maxAge = MULTI_ROOM_CONFIG.safetyCacheDuration * 2; // Keep entries a bit longer

  // Clean up safety cache
  const safetyCache = Memory.multiRoom!.roomSafety!;
  Object.keys(safetyCache).forEach(roomName => {
    if (now - safetyCache[roomName].lastChecked > maxAge) {
      delete safetyCache[roomName];
    }
  });

  // Clean up accessibility cache
  const accessibilityCache = Memory.multiRoom!.roomAccessibility!;
  Object.keys(accessibilityCache).forEach(fromRoom => {
    Object.keys(accessibilityCache[fromRoom]).forEach(toRoom => {
      if (now - accessibilityCache[fromRoom][toRoom].lastChecked > maxAge) {
        delete accessibilityCache[fromRoom][toRoom];
      }
    });

    // Remove empty fromRoom entries
    if (Object.keys(accessibilityCache[fromRoom]).length === 0) {
      delete accessibilityCache[fromRoom];
    }
  });
}

/**
 * Gets the room status using Game.map.getRoomStatus with caching
 * @param roomName - Name of the room to check
 * @returns Room status object
 */
export function getRoomStatus(roomName: string): RoomStatus {
  try {
    return Game.map.getRoomStatus(roomName);
  } catch (error) {
    debugLog.warn(`Error getting room status for ${roomName}:`, error);
    return { status: 'normal', timestamp: null };
  }
}
