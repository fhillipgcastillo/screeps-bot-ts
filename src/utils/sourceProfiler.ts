/**
 * Source Profitability Tracker
 *
 * Evaluates energy source profitability to enable intelligent harvester migration.
 * Scores sources based on remaining energy, distance, crowding, and regeneration rate.
 */

import { MULTI_ROOM_CONFIG } from '../config/multi-room.config';
import { debugLog } from './Logger';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface SourceProfitabilityScore {
  sourceId: Id<Source>;
  score: number;
  remainingEnergy: number;
  distance: number;
  crowdingPenalty: number;
  lastUpdated: number;
}

interface SourceProfitabilityCache {
  [sourceId: string]: SourceProfitabilityScore;
}

// ============================================================================
// GLOBAL CACHE STORAGE
// ============================================================================

declare global {
  interface Memory {
    sourceProfitability?: SourceProfitabilityCache;
  }
}

function initializeProfitabilityCache(): void {
  if (!Memory.sourceProfitability) {
    Memory.sourceProfitability = {};
  }
}

// ============================================================================
// SOURCE PROFITABILITY SCORING
// ============================================================================

/**
 * Calculate profitability score for a source
 * Higher score = more profitable
 *
 * Scoring factors:
 * - Remaining energy (0-100 points based on percentage full)
 * - Distance penalty (-10 points per room away from home)
 * - Crowding penalty (-15 points per extra creep beyond optimal)
 * - Regeneration bonus (+10 points if source will regen soon)
 *
 * @param source - The energy source to evaluate
 * @param creep - The harvester creep evaluating the source
 * @returns Profitability score (higher is better)
 */
export function scoreSourceProfitability(source: Source, creep: Creep): number {
  let score = 0;

  // 1. Energy availability (0-100 points)
  const energyRatio = source.energy / source.energyCapacity;
  score += energyRatio * 100;

  // 2. Distance penalty (0 to -30 points)
  const homeRoom = creep.memory.multiRoom?.homeRoom || creep.room.name;
  const sourceRoom = source.room?.name;

  if (sourceRoom) {
    const distance = Game.map.getRoomLinearDistance(homeRoom, sourceRoom);
    score -= distance * 10;
  }

  // 3. Crowding penalty (0 to -45 points for 3+ extra creeps)
  const creepsNearSource = source.pos.findInRange(FIND_MY_CREEPS, 1);
  const optimalCreeps = MULTI_ROOM_CONFIG.maxCreepsPerSource;
  const extraCreeps = Math.max(0, creepsNearSource.length - optimalCreeps);
  score -= extraCreeps * 15;

  // 4. Regeneration bonus (+10 if regenerating soon)
  if (source.ticksToRegeneration && source.ticksToRegeneration <= 50) {
    score += 10;
  }

  return Math.round(score);
}

/**
 * Determine if a harvester should migrate to a new source
 * Compares current source profitability against available alternatives
 *
 * @param currentSource - The source currently being harvested
 * @param alternatives - Alternative sources available
 * @param creep - The harvester creep considering migration
 * @returns True if migration is recommended
 */
export function shouldMigrateToNewSource(
  currentSource: Source,
  alternatives: Source[],
  creep: Creep
): boolean {
  // Don't migrate if current source is above migration threshold
  if (currentSource.energy >= MULTI_ROOM_CONFIG.minSourceEnergyForMigration) {
    return false;
  }

  // Calculate current source profitability
  const currentScore = scoreSourceProfitability(currentSource, creep);

  // Find best alternative
  let bestAlternativeScore = -Infinity;
  for (const altSource of alternatives) {
    // Skip the current source
    if (altSource.id === currentSource.id) {
      continue;
    }

    // Skip sources below minimum threshold
    if (altSource.energy < MULTI_ROOM_CONFIG.minSourceEnergy) {
      continue;
    }

    const altScore = scoreSourceProfitability(altSource, creep);
    if (altScore > bestAlternativeScore) {
      bestAlternativeScore = altScore;
    }
  }

  // Migrate if best alternative is significantly better (20+ point difference)
  const migrationThreshold = 20;
  const shouldMigrate = bestAlternativeScore > (currentScore + migrationThreshold);

  if (MULTI_ROOM_CONFIG.debugEnabled && shouldMigrate) {
    debugLog.debug(
      `${creep.name} migration recommended: current=${currentScore}, best alt=${bestAlternativeScore}`
    );
  }

  return shouldMigrate;
}

/**
 * Get cached source profitability score
 * Uses cached value if available and not expired, otherwise recalculates
 *
 * @param sourceId - ID of the source to retrieve score for
 * @param creep - The harvester creep requesting the score
 * @returns Cached profitability score or 0 if unavailable
 */
export function getCachedSourceProfitability(sourceId: Id<Source>, creep: Creep): number {
  initializeProfitabilityCache();

  const cached = Memory.sourceProfitability![sourceId];
  const now = Game.time;

  // Use cached score if available and not expired
  if (cached && (now - cached.lastUpdated) < MULTI_ROOM_CONFIG.sourceProfitabilityCheckInterval) {
    return cached.score;
  }

  // Recalculate and cache
  const source = Game.getObjectById(sourceId);
  if (!source) {
    return 0;
  }

  const score = scoreSourceProfitability(source, creep);

  // Update cache
  const distance = source.room
    ? Game.map.getRoomLinearDistance(creep.memory.multiRoom?.homeRoom || creep.room.name, source.room.name)
    : 0;

  const creepsNearSource = source.pos.findInRange(FIND_MY_CREEPS, 1);
  const crowdingPenalty = Math.max(0, creepsNearSource.length - MULTI_ROOM_CONFIG.maxCreepsPerSource) * 15;

  Memory.sourceProfitability![sourceId] = {
    sourceId,
    score,
    remainingEnergy: source.energy,
    distance,
    crowdingPenalty,
    lastUpdated: now
  };

  return score;
}

/**
 * Clear profitability cache for a specific source (e.g., after source depletion)
 *
 * @param sourceId - Optional source ID to clear (clears all if omitted)
 */
export function clearSourceProfitabilityCache(sourceId?: Id<Source>): void {
  initializeProfitabilityCache();

  if (sourceId) {
    delete Memory.sourceProfitability![sourceId];
  } else {
    Memory.sourceProfitability = {};
  }
}

/**
 * Cleanup stale cache entries (sources that no longer exist)
 * Should be called periodically (e.g., every 100 ticks)
 */
export function cleanupSourceProfitabilityCache(): void {
  initializeProfitabilityCache();

  const cache = Memory.sourceProfitability!;
  const now = Game.time;
  const maxAge = 500; // Clear entries older than 500 ticks

  for (const sourceId in cache) {
    const entry = cache[sourceId];

    // Remove if too old or source no longer exists
    if ((now - entry.lastUpdated) > maxAge || !Game.getObjectById(sourceId as Id<Source>)) {
      delete cache[sourceId];
    }
  }
}
