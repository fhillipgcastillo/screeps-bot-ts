/**
 * Multi-Room Resource Harvesting Configuration
 *
 * This configuration file manages all settings related to multi-room operations,
 * including exploration depth, safety parameters, and resource prioritization.
 */

// ============================================================================
// CORE MULTI-ROOM SETTINGS
// ============================================================================

/**
 * Master feature flag to enable/disable multi-room operations
 * Set to false to fall back to single-room operations only
 */
export const ENABLE_MULTI_ROOM = true;

/**
 * Exploration depth configuration
 * 0 = Current room only (single-room mode)
 * 1 = Adjacent rooms (up, down, left, right)
 * 2 = Two levels out (adjacent + their adjacent rooms)
 * Note: Higher values increase CPU usage exponentially
 */
export const EXPLORATION_DEPTH = 1;

/**
 * Maximum number of creeps allowed to operate in multi-room mode
 * This prevents overwhelming the system with too many multi-room operations
 */
export const MAX_MULTI_ROOM_HARVESTERS = 3;
export const MAX_MULTI_ROOM_HAULERS = 4;

// ============================================================================
// SAFETY AND ACCESSIBILITY SETTINGS
// ============================================================================

/**
 * Interval (in ticks) for checking room safety status
 * Lower values provide better safety but increase CPU usage
 */
export const SAFETY_CHECK_INTERVAL = 50;

/**
 * Cache duration (in ticks) for room safety information
 * Rooms marked as unsafe will be rechecked after this duration
 */
export const SAFETY_CACHE_DURATION = 200;

/**
 * Maximum number of hostile creeps allowed in a room before marking it unsafe
 * 0 = No hostile creeps allowed (strictest safety)
 * Higher values allow some hostile presence
 */
export const MAX_HOSTILE_CREEPS_THRESHOLD = 0;

/**
 * Maximum number of hostile structures allowed in a room before marking it unsafe
 * 0 = No hostile structures allowed (strictest safety)
 * Higher values allow some hostile structures
 */
export const MAX_HOSTILE_STRUCTURES_THRESHOLD = 0;

/**
 * Minimum controller level required for a room to be considered safe for expansion
 * Rooms with controllers below this level may be unstable
 */
export const MIN_SAFE_CONTROLLER_LEVEL = 0;

// ============================================================================
// RESOURCE PRIORITIZATION SETTINGS
// ============================================================================

/**
 * Room type priority for resource collection
 * Higher numbers = higher priority
 */
export const ROOM_TYPE_PRIORITY = {
  owned: 100,      // Rooms owned by the player (highest priority)
  reserved: 80,    // Rooms reserved by the player
  neutral: 60,     // Neutral rooms (no owner/reservation)
  hostile: 0       // Hostile rooms (should be avoided)
} as const;

/**
 * Minimum energy amount in a source to consider it worth harvesting
 * Sources below this threshold will be ignored
 */
export const MIN_SOURCE_ENERGY_THRESHOLD = 500;

/**
 * Minimum energy amount in a source before triggering harvester migration
 * When a source drops below this threshold, harvesters will seek better alternatives
 */
export const MIN_SOURCE_ENERGY_FOR_MIGRATION = 300;

/**
 * Interval (in ticks) for checking source profitability
 * Harvesters will reassess their current source every N ticks to decide if migration is needed
 */
export const SOURCE_PROFITABILITY_CHECK_INTERVAL = 50;

/**
 * Maximum distance (in rooms) to consider for resource collection
 * This is separate from EXPLORATION_DEPTH and focuses on efficiency
 */
export const MAX_RESOURCE_COLLECTION_DISTANCE = 2;

/**
 * Priority multiplier based on distance from home room
 * Closer rooms get higher priority for resource collection
 */
export const DISTANCE_PRIORITY_MULTIPLIER = {
  0: 1.0,    // Home room (baseline)
  1: 0.8,    // Adjacent rooms
  2: 0.6,    // Two rooms away
  3: 0.4     // Three rooms away (rarely used)
} as const;

// ============================================================================
// PERFORMANCE AND OPTIMIZATION SETTINGS
// ============================================================================

/**
 * Maximum CPU usage allowed for multi-room operations per tick
 * If exceeded, multi-room operations will be throttled
 */
export const MAX_MULTI_ROOM_CPU_USAGE = 5.0;

/**
 * Interval (in ticks) for updating multi-room resource discovery
 * Higher values reduce CPU usage but may miss new opportunities
 */
export const RESOURCE_DISCOVERY_INTERVAL = 25;

/**
 * Maximum number of rooms to scan for resources per tick
 * This prevents CPU spikes from scanning too many rooms at once
 */
export const MAX_ROOMS_SCAN_PER_TICK = 2;

/**
 * Cache duration (in ticks) for discovered resources
 * Resources will be re-scanned after this duration
 */
export const RESOURCE_CACHE_DURATION = 100;

// ============================================================================
// CREEP BEHAVIOR SETTINGS
// ============================================================================

/**
 * Maximum number of creeps allowed per source to prevent overcrowding
 * This applies to both single-room and multi-room sources
 */
export const MAX_CREEPS_PER_SOURCE = 2;

/**
 * Minimum energy capacity required for a creep to operate in multi-room mode
 * Creeps below this capacity will stick to single-room operations
 */
export const MIN_MULTI_ROOM_CREEP_CAPACITY = 300;

/**
 * Timeout (in ticks) for room transitions
 * If a creep takes longer than this to reach a target room, it will reset
 */
export const ROOM_TRANSITION_TIMEOUT = 150;

/**
 * Number of failed attempts before a creep gives up on multi-room operations
 * and falls back to single-room mode
 */
export const MAX_MULTI_ROOM_FAILURES = 3;

// ============================================================================
// DEBUGGING AND MONITORING SETTINGS
// ============================================================================

/**
 * Enable debug logging for multi-room operations
 * Set to false in production to reduce console spam
 */
export const ENABLE_MULTI_ROOM_DEBUG = true;

/**
 * Enable visual indicators for multi-room operations
 * Shows paths, targets, and status information in the game UI
 */
export const ENABLE_MULTI_ROOM_VISUALS = true;

/**
 * Interval (in ticks) for logging multi-room statistics
 * Set to 0 to disable statistics logging
 */
export const STATS_LOGGING_INTERVAL = 100;

// ============================================================================
// UTILITY TYPES AND CONSTANTS
// ============================================================================

/**
 * Valid room types for multi-room operations
 */
export type RoomType = keyof typeof ROOM_TYPE_PRIORITY;

/**
 * Valid exploration depths
 */
export type ExplorationDepth = 0 | 1 | 2;

/**
 * Room safety status
 */
export enum RoomSafetyStatus {
  SAFE = 'safe',
  UNSAFE = 'unsafe',
  UNKNOWN = 'unknown',
  INACCESSIBLE = 'inaccessible'
}

/**
 * Multi-room operation modes
 */
export enum MultiRoomMode {
  DISABLED = 'disabled',
  HARVESTING_ONLY = 'harvesting_only',
  HAULING_ONLY = 'hauling_only',
  FULL_OPERATIONS = 'full_operations'
}

/**
 * Default multi-room configuration object
 * Used for easy access to all configuration values
 */
export const MULTI_ROOM_CONFIG = {
  // Core settings
  enabled: ENABLE_MULTI_ROOM,
  explorationDepth: EXPLORATION_DEPTH,
  maxHarvesters: MAX_MULTI_ROOM_HARVESTERS,
  maxHaulers: MAX_MULTI_ROOM_HAULERS,

  // Safety settings
  safetyCheckInterval: SAFETY_CHECK_INTERVAL,
  safetyCacheDuration: SAFETY_CACHE_DURATION,
  maxHostileCreeps: MAX_HOSTILE_CREEPS_THRESHOLD,
  maxHostileStructures: MAX_HOSTILE_STRUCTURES_THRESHOLD,
  minControllerLevel: MIN_SAFE_CONTROLLER_LEVEL,

  // Resource settings
  roomTypePriority: ROOM_TYPE_PRIORITY,
  minSourceEnergy: MIN_SOURCE_ENERGY_THRESHOLD,
  minSourceEnergyForMigration: MIN_SOURCE_ENERGY_FOR_MIGRATION,
  sourceProfitabilityCheckInterval: SOURCE_PROFITABILITY_CHECK_INTERVAL,
  maxCollectionDistance: MAX_RESOURCE_COLLECTION_DISTANCE,
  distancePriorityMultiplier: DISTANCE_PRIORITY_MULTIPLIER,

  // Performance settings
  maxCpuUsage: MAX_MULTI_ROOM_CPU_USAGE,
  resourceDiscoveryInterval: RESOURCE_DISCOVERY_INTERVAL,
  maxRoomsScanPerTick: MAX_ROOMS_SCAN_PER_TICK,
  resourceCacheDuration: RESOURCE_CACHE_DURATION,

  // Creep behavior settings
  maxCreepsPerSource: MAX_CREEPS_PER_SOURCE,
  minCreepCapacity: MIN_MULTI_ROOM_CREEP_CAPACITY,
  roomTransitionTimeout: ROOM_TRANSITION_TIMEOUT,
  maxFailures: MAX_MULTI_ROOM_FAILURES,

  // Debug settings
  debugEnabled: ENABLE_MULTI_ROOM_DEBUG,
  visualsEnabled: ENABLE_MULTI_ROOM_VISUALS,
  statsInterval: STATS_LOGGING_INTERVAL
} as const;

/**
 * Validates the current configuration and logs any issues
 * Should be called during initialization
 */
export function validateMultiRoomConfig(): boolean {
  let isValid = true;

  if (EXPLORATION_DEPTH < 0 || EXPLORATION_DEPTH > 2) {
    console.log('⚠️ Invalid EXPLORATION_DEPTH: must be 0, 1, or 2');
    isValid = false;
  }

  if (MAX_MULTI_ROOM_HARVESTERS < 0 || MAX_MULTI_ROOM_HAULERS < 0) {
    console.log('⚠️ Invalid max creep limits: must be non-negative');
    isValid = false;
  }

  if (SAFETY_CHECK_INTERVAL < 10) {
    console.log('⚠️ SAFETY_CHECK_INTERVAL too low: may cause CPU issues');
  }

  if (MAX_MULTI_ROOM_CPU_USAGE > 10) {
    console.log('⚠️ MAX_MULTI_ROOM_CPU_USAGE very high: may cause CPU limit issues');
  }

  return isValid;
}
