/**
 * Console Commands for Multi-Room Operations
 *
 * Provides runtime control over multi-room harvesting and hauling.
 * Commands are exported to global scope for use in Screeps console.
 */

import { MULTI_ROOM_CONFIG } from '../config/multi-room.config';
import { debugLog } from './Logger';
import { getResourceCacheStats, clearResourceCache } from './multi-room-resources';
import { cleanupSourceProfitabilityCache, clearSourceProfitabilityCache } from './sourceProfiler';
import { claimRoom, getClaimedRooms, getDiscoveredRooms, getRoomState, markRoomUnsafe, shouldClaimRoom } from './roomClaiming';

// ============================================================================
// TYPES AND MEMORY INTERFACE
// ============================================================================

declare global {
  interface Memory {
    multiRoomEnabled?: boolean;
  }

  // Export commands to global namespace
  namespace NodeJS {
    interface Global {
      toggleMultiRoom: () => void;
      enableMultiRoom: () => void;
      disableMultiRoom: () => void;
      getMultiRoomStatus: () => void;
      resetMultiRoomCache: () => void;
      // Room claiming
      claimRoom: (roomName: string) => string;
      getClaimableRooms: () => string[];
      getClaimedRooms: () => string[];
      getDiscoveredRooms: () => string[];
      getRoomStatus: () => string;
      markRoomUnsafe: (roomName: string, reason?: string) => string;
      debugRoomState: (roomName?: string) => string;
    }
  }
}

// ============================================================================
// CONSOLE COMMANDS
// ============================================================================

/**
 * Toggle multi-room operations on/off
 * Persists state in Memory for tick-to-tick consistency
 */
export function toggleMultiRoom(): void {
  const currentState = Memory.multiRoomEnabled ?? MULTI_ROOM_CONFIG.enabled;
  const newState = !currentState;

  Memory.multiRoomEnabled = newState;

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🔄 Multi-Room Operations: ${newState ? '✅ ENABLED' : '❌ DISABLED'}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  if (!newState) {
    console.log('⚠️  Existing multi-room creeps will complete current tasks');
    console.log('⚠️  New creeps will operate in single-room mode only');
  } else {
    console.log('✅ New creeps will attempt multi-room operations');
    console.log('✅ Safety checks and profitability scoring active');
  }

  debugLog.info(`Multi-room toggled: ${newState}`);
}

/**
 * Enable multi-room operations
 */
export function enableMultiRoom(): void {
  if (Memory.multiRoomEnabled === true) {
    console.log('ℹ️  Multi-room operations already enabled');
    return;
  }

  Memory.multiRoomEnabled = true;

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Multi-Room Operations ENABLED`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Exploration Depth: ${MULTI_ROOM_CONFIG.explorationDepth}`);
  console.log(`Max Harvesters: ${MULTI_ROOM_CONFIG.maxHarvesters}`);
  console.log(`Max Haulers: ${MULTI_ROOM_CONFIG.maxHaulers}`);

  debugLog.info('Multi-room enabled via console command');
}

/**
 * Disable multi-room operations
 */
export function disableMultiRoom(): void {
  if (Memory.multiRoomEnabled === false) {
    console.log('ℹ️  Multi-room operations already disabled');
    return;
  }

  Memory.multiRoomEnabled = false;

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`❌ Multi-Room Operations DISABLED`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Creeps will operate in single-room mode`);

  debugLog.info('Multi-room disabled via console command');
}

/**
 * Display current multi-room status and statistics
 */
export function getMultiRoomStatus(): void {
  const enabled = Memory.multiRoomEnabled ?? MULTI_ROOM_CONFIG.enabled;
  const cacheStats = getResourceCacheStats();

  // Count multi-room creeps
  const multiRoomHarvesters = Object.values(Game.creeps).filter(c =>
    c.memory.role === 'harvester' && c.memory.multiRoom?.isMultiRoom
  ).length;

  const multiRoomHaulers = Object.values(Game.creeps).filter(c =>
    c.memory.role === 'hauler' && c.memory.multiRoom?.isMultiRoom
  ).length;

  console.log(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓`);
  console.log(`┃   MULTI-ROOM OPERATIONS STATUS         ┃`);
  console.log(`┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`);
  console.log(``);
  console.log(`🔧 Status: ${enabled ? '✅ ENABLED' : '❌ DISABLED'}`);
  console.log(`📊 Configuration:`);
  console.log(`   └─ Exploration Depth: ${MULTI_ROOM_CONFIG.explorationDepth}`);
  console.log(`   └─ Max Harvesters: ${MULTI_ROOM_CONFIG.maxHarvesters}`);
  console.log(`   └─ Max Haulers: ${MULTI_ROOM_CONFIG.maxHaulers}`);
  console.log(`   └─ Min Source Energy: ${MULTI_ROOM_CONFIG.minSourceEnergy}`);
  console.log(`   └─ Migration Threshold: ${MULTI_ROOM_CONFIG.minSourceEnergyForMigration}`);
  console.log(``);
  console.log(`👷 Active Multi-Room Creeps:`);
  console.log(`   └─ Harvesters: ${multiRoomHarvesters}`);
  console.log(`   └─ Haulers: ${multiRoomHaulers}`);
  console.log(``);
  console.log(`💾 Resource Cache:`);
  console.log(`   └─ Rooms Cached: ${cacheStats.totalRooms}`);
  console.log(`   └─ Sources Tracked: ${cacheStats.totalSources}`);
  console.log(`   └─ Oldest Cache: ${cacheStats.oldestCache} ticks ago`);
  console.log(``);
  console.log(`🛠️  Commands:`);
  console.log(`   └─ toggleMultiRoom() - Toggle on/off`);
  console.log(`   └─ enableMultiRoom() - Enable operations`);
  console.log(`   └─ disableMultiRoom() - Disable operations`);
  console.log(`   └─ resetMultiRoomCache() - Clear all caches`);
  console.log(`┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`);
}

/**
 * Clear all multi-room caches for debugging
 */
export function resetMultiRoomCache(): void {
  clearResourceCache();
  clearSourceProfitabilityCache();
  cleanupSourceProfitabilityCache();

  // Clear room safety cache
  if (Memory.multiRoom?.roomSafety) {
    Memory.multiRoom.roomSafety = {};
  }

  // Clear room accessibility cache
  if (Memory.multiRoom?.roomAccessibility) {
    Memory.multiRoom.roomAccessibility = {};
  }

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🧹 Multi-Room Cache Reset Complete`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Resource cache cleared`);
  console.log(`✅ Source profitability cache cleared`);
  console.log(`✅ Room safety cache cleared`);
  console.log(`✅ Room accessibility cache cleared`);

  debugLog.info('Multi-room caches reset via console command');
}

/**
 * Manually claim a room if it meets criteria
 */
export function claimRoomCmd(roomName: string): string {
  if (!roomName) return 'Usage: claimRoom(roomName)';
  const homeRoom = Object.keys(Game.rooms).find(r => Game.rooms[r].controller?.my);
  if (!homeRoom) return 'Error: no home room found';

  const claimingConfig = (MULTI_ROOM_CONFIG as any).claiming || {};
  const criteria = claimingConfig.criteria || {};
  const decision = shouldClaimRoom(roomName, criteria, homeRoom);
  if (!decision.canClaim) return `Cannot claim ${roomName}: ${decision.reasons.join(', ')}`;

  claimRoom(roomName, homeRoom);
  return `Claimed ${roomName} for ${homeRoom}`;
}

export function getClaimableRooms(): string[] {
  const homeRoom = Object.keys(Game.rooms).find(r => Game.rooms[r].controller?.my);
  if (!homeRoom) return [];
  const claimingConfig = (MULTI_ROOM_CONFIG as any).claiming || {};
  const criteria = claimingConfig.criteria || {};
  const discovered = getDiscoveredRooms();
  return discovered.filter(room => shouldClaimRoom(room, criteria, homeRoom).canClaim);
}

export function getClaimedRoomsCmd(): string[] {
  return getClaimedRooms();
}

export function getDiscoveredRoomsCmd(): string[] {
  return getDiscoveredRooms();
}

export function getRoomStatus(): string {
  const state = getRoomState();
  return `Room Status:\n  Claimed: ${state.claimed.join(', ') || 'none'}\n  Discovered: ${state.discovered.join(', ') || 'none'}\n  Unsafe: ${state.unsafe.join(', ') || 'none'}`;
}

export function markRoomUnsafeCmd(roomName: string, reason: string = 'manual'): string {
  if (!roomName) return 'Usage: markRoomUnsafe(roomName, reason)';
  markRoomUnsafe(roomName, reason);
  return `Marked ${roomName} as unsafe`;
}

export function debugRoomState(roomName?: string): string {
  if (!Memory.rooms) return 'No room data tracked';
  if (roomName) return JSON.stringify(Memory.rooms[roomName] || {}, null, 2);
  return JSON.stringify(Memory.rooms, null, 2);
}

// ============================================================================
// GLOBAL EXPORT
// ============================================================================

/**
 * Initialize console commands by exporting to global scope
 * Call this during game initialization
 */
export function initializeConsoleCommands(): void {
  global.toggleMultiRoom = toggleMultiRoom;
  global.enableMultiRoom = enableMultiRoom;
  global.disableMultiRoom = disableMultiRoom;
  global.getMultiRoomStatus = getMultiRoomStatus;
  global.resetMultiRoomCache = resetMultiRoomCache;
  // Room claiming commands
  global.claimRoom = claimRoomCmd;
  global.getClaimableRooms = getClaimableRooms;
  global.getClaimedRooms = getClaimedRoomsCmd;
  global.getDiscoveredRooms = getDiscoveredRoomsCmd;
  global.getRoomStatus = getRoomStatus;
  global.markRoomUnsafe = markRoomUnsafeCmd;
  global.debugRoomState = debugRoomState;

  debugLog.info('Console commands initialized: toggleMultiRoom, enableMultiRoom, disableMultiRoom, getMultiRoomStatus, resetMultiRoomCache');
}

/**
 * Get the current multi-room enabled state (respects console toggle)
 * Use this in roles instead of MULTI_ROOM_CONFIG.enabled directly
 *
 * @returns true if multi-room is currently enabled
 */
export function isMultiRoomEnabled(): boolean {
  return Memory.multiRoomEnabled ?? MULTI_ROOM_CONFIG.enabled;
}
