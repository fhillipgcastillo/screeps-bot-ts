import { MULTI_ROOM_CONFIG } from "../config/multi-room.config";
import { logger } from "../utils/Logger";

export interface RoomClaimingState {
  roomName: string;
  claimStatus: "unclaimed" | "claimed" | "unsafe" | "pending";
  safetyScore: number;
  lastEvaluated: number;
  claimedBy?: string;
  reasons?: string[];
}

export interface ClaimingCriteria {
  minSafetyScore: number;
  maxHostileCreeps: number;
  maxHostileStructures: number;
  maxEnergyDecayRate: number;
  minSourceCount: number;
  minAverageSourceEnergy: number;
}

export interface ClaimDecision {
  canClaim: boolean;
  safetyScore: number;
  reasons: string[];
}

function clamp(n: number, a = 0, b = 100) { return Math.max(a, Math.min(b, n)); }

export function calculateRoomSafetyScore(roomName: string): number {
  try {
    const room = Game.rooms[roomName];
    let score = 50; // base

    if (!room) {
      // Unknown room — assume neutral but slightly unsafe
      return 30;
    }

    // Owner/Reservation
    if (room.controller) {
      if (room.controller.owner) {
        // Owned by someone else
        score -= 60;
      } else if (room.controller.reservation) {
        score -= 30;
      } else {
        score += 10;
      }
    }

    // Hostile creeps
    const hostiles = room.find(FIND_HOSTILE_CREEPS);
    score -= hostiles.length * 25;

    // Hostile structures
    const hostileStructures = room.find(FIND_HOSTILE_STRUCTURES, { filter: s => s.structureType !== STRUCTURE_RAMPART /*&& s.structureType !== STRUCTURE_ROAD*/ });
    score -= hostileStructures.length * 20;

    // Recent combat (simple heuristic: hostile creeps killed recently stored in memory)
    if (Memory.rooms && Memory.rooms[roomName] && Memory.rooms[roomName]?.lastHostileSeen) {
      const age = Game.time - Memory.rooms[roomName]?.lastHostileSeen;
      if (age < 500) score -= 10;
    }

    // Sources
    const sources = room.find(FIND_SOURCES);
    if (sources.length === 0) score -= 30;
    else score += Math.min(20, sources.length * 5);

    return clamp(score);
  } catch (e) {
    logger.error(`calculateRoomSafetyScore error for ${roomName}: ${e}`);
    return 0;
  }
}

export function shouldClaimRoom(roomName: string, criteria: ClaimingCriteria, homeRoom: string): ClaimDecision {
  const reasons: string[] = [];
  const safety = calculateRoomSafetyScore(roomName);

  if (safety < criteria.minSafetyScore) {
    reasons.push(`safety ${safety} < ${criteria.minSafetyScore}`);
  }

  const room = Game.rooms[roomName];
  if (room) {
    const hostiles = room.find(FIND_HOSTILE_CREEPS).length;
    if (hostiles > criteria.maxHostileCreeps) {
      reasons.push(`hostiles ${hostiles} > ${criteria.maxHostileCreeps}`);
    }

    const hostileStructures = room.find(FIND_HOSTILE_STRUCTURES, { filter: s => s.structureType !== STRUCTURE_RAMPART /*&& s.structureType !== STRUCTURE_ROAD*/ }).length;
    if (hostileStructures > criteria.maxHostileStructures) {
      reasons.push(`hostileStructures ${hostileStructures} > ${criteria.maxHostileStructures}`);
    }

    const sources = room.find(FIND_SOURCES);
    if (sources.length < criteria.minSourceCount) {
      reasons.push(`sources ${sources.length} < ${criteria.minSourceCount}`);
    }

    // Average source energy estimation (simple current energy)
    if (sources.length > 0) {
      const avg = sources.reduce((s, src) => s + (src.energy ?? 0), 0) / sources.length;
      if (avg < criteria.minAverageSourceEnergy) {
        reasons.push(`avgSourceEnergy ${avg} < ${criteria.minAverageSourceEnergy}`);
      }
    }
  } else {
    // If not visible, be conservative
    reasons.push('room not visible');
  }

  const canClaim = reasons.length === 0;
  return { canClaim, safetyScore: safety, reasons };
}

export function claimRoom(roomName: string, claimingRoom: string): void {
  if (!Memory.rooms) Memory.rooms = {} as any;
  if (!Memory.rooms[roomName]) Memory.rooms[roomName] = {} as any;
  Memory.rooms[roomName].claimed = true;
  Memory.rooms[roomName].claimedBy = claimingRoom;
  Memory.rooms[roomName].claimedAt = Game.time;
  logger.info(`Room ${roomName} marked claimed by ${claimingRoom}`);
}

export function markRoomUnsafe(roomName: string, reason: string): void {
  if (!Memory.rooms) Memory.rooms = {} as any;
  if (!Memory.rooms[roomName]) Memory.rooms[roomName] = {} as any;
  Memory.rooms[roomName].unsafe = true;
  Memory.rooms[roomName].unsafeReason = reason;
  Memory.rooms[roomName].unsafeUntil = Game.time + (MULTI_ROOM_CONFIG.claiming?.unsafeRoomTTL ?? 1000);
  logger.warn(`Room ${roomName} marked unsafe: ${reason}`);
}

export function getClaimedRooms(): string[] {
  if (!Memory.rooms) return [];
  return Object.keys(Memory.rooms).filter(r => Memory.rooms[r].claimed);
}

export function getDiscoveredRooms(): string[] {
  if (!Memory.rooms) return [];
  return Object.keys(Memory.rooms).filter(r => Memory.rooms[r].discovered && !Memory.rooms[r].claimed && !Memory.rooms[r].unsafe);
}

export function getRoomState() {
  if (!Memory.rooms) Memory.rooms = {} as any;
  const claimed = Object.keys(Memory.rooms).filter(r => Memory.rooms[r].claimed);
  const discovered = Object.keys(Memory.rooms).filter(r => Memory.rooms[r].discovered && !Memory.rooms[r].claimed && !Memory.rooms[r].unsafe);
  const unsafe = Object.keys(Memory.rooms).filter(r => Memory.rooms[r].unsafe);
  return { claimed, discovered, unsafe };
}
