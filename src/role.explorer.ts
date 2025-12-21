/**
 * Explorer Role
 * Scouts adjacent rooms to detect hostile attackers and assess safety for remote harvesting
 * Updates room exploration memory with safety status
 */

import { ExplorerMemory, RoomExplorationData, RoomSafetyStatus } from "./types";
import { debugLog } from "./utils/Logger";

/**
 * Initialize exploration memory if not present
 */
function initializeExplorationMemory(): void {
  if (!Memory.exploration) {
    Memory.exploration = {};
  }
}

/**
 * Get adjacent room names from current room
 */
function getAdjacentRooms(roomName: string): string[] {
  const room = Game.rooms[roomName];
  if (!room) {
    const exits = Game.map.describeExits(roomName);
    if (!exits) return [];
    return Object.values(exits);
  }

  const exits = Game.map.describeExits(roomName);
  if (!exits) return [];

  return Object.values(exits);
}

/**
 * Check if a creep has attack or ranged attack parts (is an attacker)
 */
function isAttacker(creep: Creep): boolean {
  return creep.getActiveBodyparts(ATTACK) > 0 || creep.getActiveBodyparts(RANGED_ATTACK) > 0;
}

/**
 * Scan current room for hostiles and update exploration memory
 */
function scanCurrentRoom(creep: Creep): void {
  const roomName = creep.room.name;
  initializeExplorationMemory();

  // Find hostile creeps with attack capabilities
  const hostiles = creep.room.find(FIND_HOSTILE_CREEPS);
  const attackers = hostiles.filter(isAttacker);

  // Count sources
  const sources = creep.room.find(FIND_SOURCES);

  // Check controller
  const controller = creep.room.controller;

  // Determine safety status
  let safetyStatus: RoomSafetyStatus;
  if (attackers.length > 0) {
    safetyStatus = RoomSafetyStatus.HOSTILE;
    debugLog.warn(`[EXPLORER] Room ${roomName} is HOSTILE: ${attackers.length} attackers detected`);
  } else {
    safetyStatus = RoomSafetyStatus.SAFE;
    debugLog.debug(`[EXPLORER] Room ${roomName} is SAFE`);
  }

  // Update exploration memory
  const explorationData: RoomExplorationData = {
    roomName,
    safetyStatus,
    lastScanned: Game.time,
    hostileCount: attackers.length,
    sourceCount: sources.length,
    controllerLevel: controller?.level,
    controllerOwner: controller?.owner?.username || controller?.reservation?.username,
    explorerName: creep.name,
    enabledForRemoteHarvest: false
  };
if(Memory.exploration) {
  Memory.exploration[roomName] = explorationData;
}

  debugLog.debug(`[EXPLORER] Scanned ${roomName}: ${sources.length} sources, ${attackers.length} attackers`);
}

/**
 * Find next room to explore (adjacent rooms not yet scanned or expired)
 */
function getNextRoomToExplore(creep: Creep, memory: ExplorerMemory): string | null {
  const homeRoom = memory.homeRoom;
  const adjacentRooms = getAdjacentRooms(homeRoom);

  initializeExplorationMemory();

  // Filter out already scanned rooms (within last 5000 ticks)
  const SCAN_EXPIRY = 5000;
  const unscannedRooms = adjacentRooms.filter(roomName => {
    const explorationData = Memory.exploration?.[roomName];
    if (!explorationData) return true; // Not scanned yet

    const age = Game.time - explorationData.lastScanned;
    return age > SCAN_EXPIRY; // Expired, needs re-scan
  });

  if (unscannedRooms.length === 0) {
    debugLog.debug(`[EXPLORER] All adjacent rooms scanned, marking exploration complete`);
    return null;
  }

  // Return first unscanned room
  return unscannedRooms[0];
}

/**
 * Main explorer role logic
 */
export function runExplorer(creep: Creep): void {
  const memory = creep.memory as ExplorerMemory;

  // Initialize baseline memory
  if (!memory.homeRoom) {
    memory.homeRoom = creep.room.name;
  }
  if (!memory.scannedRooms) memory.scannedRooms = [];
  if (memory.isReturning === undefined) memory.isReturning = false;
  if (memory.explorationComplete === undefined) memory.explorationComplete = false;

  // If currently in target room, perform scan and decide next state
  if (memory.targetRoom && creep.room.name === memory.targetRoom) {
    scanCurrentRoom(creep);

    if (!memory.scannedRooms.includes(creep.room.name)) {
      memory.scannedRooms.push(creep.room.name);
    }

    const data = Memory.exploration?.[creep.room.name];
    if (data && data.safetyStatus === RoomSafetyStatus.HOSTILE) {
      debugLog.warn(`[EXPLORER] ${creep.name} detected hostiles in ${creep.room.name}, returning home`);
      memory.isReturning = true;
      memory.targetRoom = undefined;
    } else {
      debugLog.debug(`[EXPLORER] ${creep.name} scan complete for ${creep.room.name}, returning home`);
      memory.isReturning = true;
      memory.targetRoom = undefined;
    }
  }

  // Handle returning to home
  if (memory.isReturning) {
    if (creep.room.name === memory.homeRoom) {
      memory.isReturning = false;
      memory.targetRoom = undefined;
    } else {
      const homePos = new RoomPosition(25, 25, memory.homeRoom);
      creep.moveTo(homePos, { reusePath: 10 });
      return;
    }
  }

  // If at home and no target, choose next room
  if (creep.room.name === memory.homeRoom && !memory.targetRoom) {
    const nextRoom = getNextRoomToExplore(creep, memory);
    if (!nextRoom) {
      memory.explorationComplete = true;
      debugLog.debug(`[EXPLORER] ${creep.name} completed exploration around ${memory.homeRoom}`);
      return;
    }
    memory.targetRoom = nextRoom;
    debugLog.debug(`[EXPLORER] ${creep.name} targeting adjacent room ${nextRoom}`);
  }

  // Move towards target room if set
  if (memory.targetRoom) {
    const targetPos = new RoomPosition(25, 25, memory.targetRoom);
    creep.moveTo(targetPos, { visualizePathStyle: { stroke: '#ffaa00' }, reusePath: 10 });
    return;
  }

  // Idle near center of home room
  if (creep.room.name !== memory.homeRoom) {
    const homePos = new RoomPosition(25, 25, memory.homeRoom);
    creep.moveTo(homePos, { reusePath: 10 });
  }
}
