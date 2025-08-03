/**
 * Multi-Room Debugging and Performance Monitoring Utilities
 *
 * This module provides debugging tools, performance monitoring, and diagnostic
 * functions for the multi-room harvesting system.
 */

import { MULTI_ROOM_CONFIG } from '../config/multi-room.config';
import { debugLog } from './Logger';
import { getCreepsByRole } from '../types';
import { getResourceCacheStats } from './multi-room-resources';

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

interface PerformanceMetrics {
  cpuUsage: number;
  multiRoomCreeps: number;
  activeHarvesters: number;
  activeHaulers: number;
  roomsScanned: number;
  sourcesFound: number;
  cacheHitRate: number;
  averageTransitionTime: number;
}

interface MultiRoomStats {
  totalCreeps: number;
  multiRoomCreeps: number;
  successfulTransitions: number;
  failedTransitions: number;
  resourcesCollected: number;
  roomsExplored: number;
}

let performanceHistory: PerformanceMetrics[] = [];
let statsHistory: MultiRoomStats[] = [];

/**
 * Monitors CPU usage and performance of multi-room operations
 */
export function monitorMultiRoomPerformance(): PerformanceMetrics {
  const startCpu = Game.cpu.getUsed();

  // Gather performance data
  const harvesters = getCreepsByRole('harvester');
  const haulers = getCreepsByRole('hauler');

  const multiRoomHarvesters = harvesters.filter(creep =>
    creep.memory.multiRoom?.enabled && creep.memory.multiRoom?.isMultiRoom
  );
  const multiRoomHaulers = haulers.filter(creep =>
    creep.memory.multiRoom?.enabled && creep.memory.multiRoom?.collectionRoom
  );

  const resourceStats = getResourceCacheStats();

  // Calculate average transition time
  const transitionTimes = [...multiRoomHarvesters, ...multiRoomHaulers]
    .map(creep => {
      if (creep.memory.multiRoom?.roomTransitionStartTick) {
        return Game.time - creep.memory.multiRoom.roomTransitionStartTick;
      }
      return 0;
    })
    .filter(time => time > 0);

  const averageTransitionTime = transitionTimes.length > 0
    ? transitionTimes.reduce((sum, time) => sum + time, 0) / transitionTimes.length
    : 0;

  const metrics: PerformanceMetrics = {
    cpuUsage: Game.cpu.getUsed() - startCpu,
    multiRoomCreeps: multiRoomHarvesters.length + multiRoomHaulers.length,
    activeHarvesters: harvesters.length,
    activeHaulers: haulers.length,
    roomsScanned: resourceStats.totalRooms,
    sourcesFound: resourceStats.totalSources,
    cacheHitRate: calculateCacheHitRate(),
    averageTransitionTime
  };

  // Store in history (keep last 100 entries)
  performanceHistory.push(metrics);
  if (performanceHistory.length > 100) {
    performanceHistory.shift();
  }

  return metrics;
}

/**
 * Logs performance statistics periodically
 */
export function logPerformanceStats(): void {
  if (!MULTI_ROOM_CONFIG.debugEnabled) {
    return;
  }

  if (Game.time % MULTI_ROOM_CONFIG.statsInterval === 0) {
    const metrics = monitorMultiRoomPerformance();

    console.log(`🔍 Multi-Room Performance Stats (Tick ${Game.time}):`);
    console.log(`  CPU Usage: ${metrics.cpuUsage.toFixed(2)}`);
    console.log(`  Multi-Room Creeps: ${metrics.multiRoomCreeps}`);
    console.log(`  Active Harvesters: ${metrics.activeHarvesters}`);
    console.log(`  Active Haulers: ${metrics.activeHaulers}`);
    console.log(`  Rooms Scanned: ${metrics.roomsScanned}`);
    console.log(`  Sources Found: ${metrics.sourcesFound}`);
    console.log(`  Cache Hit Rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);
    console.log(`  Avg Transition Time: ${metrics.averageTransitionTime.toFixed(1)} ticks`);
  }
}

/**
 * Calculates cache hit rate for performance monitoring
 */
function calculateCacheHitRate(): number {
  // This is a simplified calculation - in a real implementation,
  // you would track actual cache hits vs misses
  const resourceStats = getResourceCacheStats();
  if (resourceStats.totalRooms === 0) {
    return 0;
  }

  // Estimate based on cache age - newer caches are more likely to be hits
  const avgCacheAge = resourceStats.oldestCache;
  const maxAge = MULTI_ROOM_CONFIG.resourceCacheDuration;

  return Math.max(0, 1 - (avgCacheAge / maxAge));
}

// ============================================================================
// DEBUGGING FUNCTIONS
// ============================================================================

/**
 * Displays detailed debug information about multi-room operations
 */
export function debugMultiRoomOperations(): void {
  if (!MULTI_ROOM_CONFIG.debugEnabled) {
    return;
  }

  console.log('🏠 Multi-Room Debug Information:');
  console.log(`  System Enabled: ${MULTI_ROOM_CONFIG.enabled}`);
  console.log(`  Exploration Depth: ${MULTI_ROOM_CONFIG.explorationDepth}`);
  console.log(`  Max Harvesters: ${MULTI_ROOM_CONFIG.maxHarvesters}`);
  console.log(`  Max Haulers: ${MULTI_ROOM_CONFIG.maxHaulers}`);

  debugCreepStates();
  debugRoomSafety();
  debugResourceCache();
}

/**
 * Debugs creep states and multi-room assignments
 */
function debugCreepStates(): void {
  const harvesters = getCreepsByRole('harvester');
  const haulers = getCreepsByRole('hauler');

  console.log('\n👷 Harvester States:');
  harvesters.forEach(creep => {
    const multiRoom = creep.memory.multiRoom;
    if (multiRoom) {
      console.log(`  ${creep.name}: ${multiRoom.isMultiRoom ? 'Multi-Room' : 'Single-Room'} | ` +
                  `Home: ${multiRoom.homeRoom} | Target: ${multiRoom.targetRoom || 'None'} | ` +
                  `Failures: ${multiRoom.failureCount}`);
    } else {
      console.log(`  ${creep.name}: No multi-room memory`);
    }
  });

  console.log('\n🚚 Hauler States:');
  haulers.forEach(creep => {
    const multiRoom = creep.memory.multiRoom;
    if (multiRoom) {
      console.log(`  ${creep.name}: ${multiRoom.collectionRoom ? 'Multi-Room' : 'Single-Room'} | ` +
                  `Home: ${multiRoom.homeRoom} | Collection: ${multiRoom.collectionRoom || 'None'} | ` +
                  `Returning: ${multiRoom.isReturningHome} | Failures: ${multiRoom.failureCount}`);
    } else {
      console.log(`  ${creep.name}: No multi-room memory`);
    }
  });
}

/**
 * Debugs room safety status
 */
function debugRoomSafety(): void {
  if (!Memory.multiRoom?.roomSafety) {
    console.log('\n🛡️ Room Safety: No data available');
    return;
  }

  console.log('\n🛡️ Room Safety Status:');
  const safetyCache = Memory.multiRoom.roomSafety;
  Object.keys(safetyCache).forEach(roomName => {
    const info = safetyCache[roomName];
    const age = Game.time - info.lastChecked;
    console.log(`  ${roomName}: ${info.status} | Hostiles: ${info.hostileCreeps}/${info.hostileStructures} | ` +
                `Age: ${age} ticks | Type: ${info.roomType}`);
  });
}

/**
 * Debugs resource cache status
 */
function debugResourceCache(): void {
  const stats = getResourceCacheStats();
  console.log('\n📦 Resource Cache Status:');
  console.log(`  Total Rooms: ${stats.totalRooms}`);
  console.log(`  Total Sources: ${stats.totalSources}`);
  console.log(`  Oldest Cache: ${stats.oldestCache} ticks`);

  if (Memory.multiRoom?.resourceCache) {
    Object.keys(Memory.multiRoom.resourceCache).forEach(homeRoom => {
      const cache = Memory.multiRoom!.resourceCache![homeRoom];
      const age = Game.time - cache.lastUpdated;
      console.log(`  ${homeRoom}: ${cache.sources.length} sources | Age: ${age} ticks | Depth: ${cache.explorationDepth}`);
    });
  }
}

// ============================================================================
// DIAGNOSTIC FUNCTIONS
// ============================================================================

/**
 * Runs comprehensive diagnostics on the multi-room system
 */
export function runMultiRoomDiagnostics(): boolean {
  console.log('🔧 Running Multi-Room System Diagnostics...');

  let allTestsPassed = true;

  // Test 1: Configuration validation
  console.log('  Test 1: Configuration validation...');
  const { validateMultiRoomConfig } = require('../config/multi-room.config');
  if (!validateMultiRoomConfig()) {
    console.log('    ❌ Configuration validation failed');
    allTestsPassed = false;
  } else {
    console.log('    ✅ Configuration valid');
  }

  // Test 2: Memory structure integrity
  console.log('  Test 2: Memory structure integrity...');
  if (!testMemoryIntegrity()) {
    console.log('    ❌ Memory structure issues detected');
    allTestsPassed = false;
  } else {
    console.log('    ✅ Memory structures intact');
  }

  // Test 3: Creep multi-room memory consistency
  console.log('  Test 3: Creep memory consistency...');
  if (!testCreepMemoryConsistency()) {
    console.log('    ❌ Creep memory inconsistencies found');
    allTestsPassed = false;
  } else {
    console.log('    ✅ Creep memory consistent');
  }

  // Test 4: Performance check
  console.log('  Test 4: Performance check...');
  const metrics = monitorMultiRoomPerformance();
  if (metrics.cpuUsage > MULTI_ROOM_CONFIG.maxCpuUsage) {
    console.log(`    ⚠️ High CPU usage: ${metrics.cpuUsage.toFixed(2)} (limit: ${MULTI_ROOM_CONFIG.maxCpuUsage})`);
    allTestsPassed = false;
  } else {
    console.log(`    ✅ CPU usage within limits: ${metrics.cpuUsage.toFixed(2)}`);
  }

  console.log(`\n🏁 Diagnostics ${allTestsPassed ? 'PASSED' : 'FAILED'}`);
  return allTestsPassed;
}

/**
 * Tests memory structure integrity
 */
function testMemoryIntegrity(): boolean {
  try {
    // Check if multi-room memory structure exists
    if (MULTI_ROOM_CONFIG.enabled && !Memory.multiRoom) {
      return false;
    }

    // Check room safety cache structure
    if (Memory.multiRoom?.roomSafety) {
      for (const roomName in Memory.multiRoom.roomSafety) {
        const info = Memory.multiRoom.roomSafety[roomName];
        if (!info.status || !info.lastChecked || info.hostileCreeps === undefined) {
          return false;
        }
      }
    }

    // Check resource cache structure
    if (Memory.multiRoom?.resourceCache) {
      for (const homeRoom in Memory.multiRoom.resourceCache) {
        const cache = Memory.multiRoom.resourceCache[homeRoom];
        if (!cache.sources || !cache.lastUpdated || !cache.homeRoom) {
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    debugLog.error('Memory integrity test failed:', error);
    return false;
  }
}

/**
 * Tests creep memory consistency
 */
function testCreepMemoryConsistency(): boolean {
  try {
    const harvesters = getCreepsByRole('harvester');
    const haulers = getCreepsByRole('hauler');

    // Check harvester memory consistency
    for (const creep of harvesters) {
      if (creep.memory.multiRoom) {
        if (!creep.memory.multiRoom.homeRoom || creep.memory.multiRoom.failureCount === undefined) {
          return false;
        }
      }
    }

    // Check hauler memory consistency
    for (const creep of haulers) {
      if (creep.memory.multiRoom) {
        if (!creep.memory.multiRoom.homeRoom || creep.memory.multiRoom.isReturningHome === undefined) {
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    debugLog.error('Creep memory consistency test failed:', error);
    return false;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Gets performance history for analysis
 */
export function getPerformanceHistory(): PerformanceMetrics[] {
  return [...performanceHistory];
}

/**
 * Clears performance history
 */
export function clearPerformanceHistory(): void {
  performanceHistory = [];
  statsHistory = [];
  console.log('Performance history cleared');
}

/**
 * Exports multi-room statistics for external analysis
 */
export function exportMultiRoomStats(): string {
  const stats = {
    config: MULTI_ROOM_CONFIG,
    performance: performanceHistory.slice(-10), // Last 10 entries
    currentMetrics: monitorMultiRoomPerformance(),
    resourceCache: getResourceCacheStats(),
    timestamp: Game.time
  };

  return JSON.stringify(stats, null, 2);
}
