/**
 * Cache Configuration Utilities
 *
 * Centralized cache configuration logic to avoid circular dependencies.
 * This module is imported by room-safety and consoleCommands without cycles.
 */

import { MULTI_ROOM_CONFIG } from '../config/multi-room.config';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type CacheType = 'roomSafety' | 'resourceDiscovery' | 'roomAccessibility';

// ============================================================================
// MEMORY INTERFACE
// ============================================================================

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

interface RoomSafetyInfo {
  status: any; // RoomSafetyStatus from config - using any to avoid circular import
  lastChecked: number;
  hostileCreeps: number;
  hostileStructures: number;
  controllerLevel?: number;
  roomType: any; // RoomType from config - using any to avoid circular import
  resourceValue: number;
}

interface RoomAccessibilityInfo {
  accessible: boolean;
  exitDirection?: ExitConstant;
  pathCost: number;
  lastChecked: number;
}

declare global {
  interface Memory {
    multiRoom?: {
      roomSafety?: { [roomName: string]: RoomSafetyInfo };
      roomAccessibility?: { [fromRoom: string]: { [toRoom: string]: RoomAccessibilityInfo } };
      resourceCache?: { [homeRoom: string]: ResourceDiscoveryCache };
      lastGlobalUpdate?: number;
      cacheSettings?: {
        roomSafetyEnabled?: boolean;
        resourceDiscoveryEnabled?: boolean;
        roomAccessibilityEnabled?: boolean;
        durations?: {
          roomSafety?: number;
          resourceDiscovery?: number;
          roomAccessibility?: number;
        };
      };
    };
  }
}

// ============================================================================
// CACHE INITIALIZATION
// ============================================================================

/**
 * Initialize cache settings in memory if they don't exist
 */
export function initializeCacheSettings(): void {
  if (!Memory.multiRoom) {
    Memory.multiRoom = {};
  }
  if (!Memory.multiRoom.cacheSettings) {
    Memory.multiRoom.cacheSettings = {
      roomSafetyEnabled: false,
      resourceDiscoveryEnabled: false,
      roomAccessibilityEnabled: false,
      durations: {
        roomSafety: 0,
        resourceDiscovery: 0,
        roomAccessibility: 0
      }
    };
  }
}

// ============================================================================
// CACHE CONTROL FUNCTIONS
// ============================================================================

/**
 * Check if caching is enabled for a specific cache type
 * @param cacheType - The type of cache to check
 * @returns true if caching is enabled, false otherwise (default: false)
 */
export function shouldUseCache(cacheType: CacheType): boolean {
  initializeCacheSettings();

  switch (cacheType) {
    case 'roomSafety':
      return Memory.multiRoom!.cacheSettings!.roomSafetyEnabled ?? false;
    case 'resourceDiscovery':
      return Memory.multiRoom!.cacheSettings!.resourceDiscoveryEnabled ?? false;
    case 'roomAccessibility':
      return Memory.multiRoom!.cacheSettings!.roomAccessibilityEnabled ?? false;
    default:
      return false;
  }
}

/**
 * Get the cache duration for a specific cache type
 * @param cacheType - The type of cache to get duration for
 * @returns Cache duration in ticks (default: 0)
 */
export function getCacheDuration(cacheType: CacheType): number {
  initializeCacheSettings();

  const durations = Memory.multiRoom!.cacheSettings!.durations!;
  switch (cacheType) {
    case 'roomSafety':
      return durations.roomSafety ?? 0;
    case 'resourceDiscovery':
      return durations.resourceDiscovery ?? 0;
    case 'roomAccessibility':
      return durations.roomAccessibility ?? 0;
    default:
      return 0;
  }
}

/**
 * Set cache enabled state for a specific type
 * @param cacheType - The type of cache to update
 * @param enabled - Whether to enable or disable the cache
 */
export function setCacheEnabled(cacheType: CacheType, enabled: boolean): void {
  initializeCacheSettings();

  switch (cacheType) {
    case 'roomSafety':
      Memory.multiRoom!.cacheSettings!.roomSafetyEnabled = enabled;
      break;
    case 'resourceDiscovery':
      Memory.multiRoom!.cacheSettings!.resourceDiscoveryEnabled = enabled;
      break;
    case 'roomAccessibility':
      Memory.multiRoom!.cacheSettings!.roomAccessibilityEnabled = enabled;
      break;
  }
}

/**
 * Set cache duration for a specific type
 * @param cacheType - The type of cache to update
 * @param duration - Cache duration in ticks
 */
export function setCacheDuration(cacheType: CacheType, duration: number): void {
  initializeCacheSettings();

  const durations = Memory.multiRoom!.cacheSettings!.durations!;
  switch (cacheType) {
    case 'roomSafety':
      durations.roomSafety = duration;
      break;
    case 'resourceDiscovery':
      durations.resourceDiscovery = duration;
      break;
    case 'roomAccessibility':
      durations.roomAccessibility = duration;
      break;
  }
}

/**
 * Get all cache settings
 */
export function getCacheSettings() {
  initializeCacheSettings();
  return Memory.multiRoom!.cacheSettings!;
}
