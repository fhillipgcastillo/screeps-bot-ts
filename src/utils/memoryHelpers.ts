/**
 * Memory Helpers Module
 * Provides type-safe getters/setters for creep memory with defensive validation
 * and garbage collection to prevent state corruption
 */

import { BaseCreepMemory, CreepRole, HarvesterMemory } from "../types";
import { debugLog } from "./Logger";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Safe memory access result with error information
 */
export interface MemoryAccessResult<T> {
  success: boolean;
  value?: T;
  error?: string;
}

/**
 * Memory cleanup statistics
 */
export interface MemoryCleanupStats {
  creepsChecked: number;
  invalidCreepsRemoved: number;
  staleMemoiesRemoved: number;
  targetsValidated: number;
  invalidTargetsCleared: number;
}

// ============================================================================
// GLOBAL MEMORY STRUCTURE
// ============================================================================

/**
 * Extend global Memory interface for our custom structures
 */
declare global {
  interface Memory {
    creepMemory?: {
      [key: string]: BaseCreepMemory;
    };
    memoryStats?: {
      lastCleanup: number;
      cleanupInterval: number;
      totalCreepsManaged: number;
    };
    containers?: {
      [roomName: string]: {
        roomName: string;
        containerIds: Id<StructureContainer>[];
        storageIds: Id<StructureStorage>[];
        lastUpdated: number;
        updateInterval: number;
      };
    };
  }
}

// ============================================================================
// SAFE MEMORY GETTERS & SETTERS
// ============================================================================

/**
 * Initialize memory helpers system on first run
 */
export function initializeMemoryHelpers(): void {
  if (!Memory.creepMemory) {
    Memory.creepMemory = {};
  }

  if (!Memory.memoryStats) {
    Memory.memoryStats = {
      lastCleanup: Game.time,
      cleanupInterval: 100,
      totalCreepsManaged: 0
    };
  }
}

/**
 * Get a creep's memory with safe access and validation
 * Returns a default safe memory object if creep memory is corrupt
 *
 * @param creep - The creep to get memory for
 * @returns Safe memory object guaranteed to have role and room
 */
export function getCreepMemory(creep: Creep): BaseCreepMemory {
  const mem = creep.memory as BaseCreepMemory;

  // Validate required fields
  if (!mem.role) {
    debugLog.warn(`WARN: Creep ${creep.name} missing role in memory`);
    mem.role = "hauler" as CreepRole; // Safe default
  }

  if (!mem.room) {
    mem.room = creep.room.name;
  }

  return mem;
}

/**
 * Safely set a creep's role in memory
 *
 * @param creep - The creep to set role for
 * @param role - The role to set
 */
export function setCreepRole(creep: Creep, role: CreepRole): void {
  const mem = getCreepMemory(creep);
  mem.role = role;
  mem.room = creep.room.name;
}

/**
 * Get a creep's target (resource, structure, etc.)
 * Validates that the target still exists before returning
 *
 * @param creep - The creep to get target for
 * @param targetKey - The memory key storing the target ID (e.g., 'target', 'sourceTarget')
 * @returns The target object or null if invalid/destroyed
 */
export function getCreepTarget<T extends _HasId>(
  creep: Creep,
  targetKey: string = 'target'
): T | null {
  const mem = getCreepMemory(creep);
  const targetId = mem[targetKey] as Id<T> | undefined;

  if (!targetId) {
    return null;
  }

  const target = Game.getObjectById(targetId);
  if (!target) {
    // Target destroyed or despawned
    debugLog.info(`INFO: Target ${targetId} no longer exists for creep ${creep.name}`);
    clearCreepTarget(creep, targetKey);
    return null;
  }

  return target as T;
}

/**
 * Safely set a creep's target in memory
 *
 * @param creep - The creep to set target for
 * @param target - The target object to set (must have .id)
 * @param targetKey - The memory key to store in (e.g., 'target', 'sourceTarget')
 */
export function setCreepTarget<T extends _HasId>(
  creep: Creep,
  target: T | null | undefined,
  targetKey: string = 'target'
): void {
  const mem = getCreepMemory(creep);

  if (!target) {
    clearCreepTarget(creep, targetKey);
    return;
  }

  mem[targetKey] = target.id;
}

/**
 * Clear a creep's target from memory
 *
 * @param creep - The creep to clear target for
 * @param targetKey - The memory key to clear
 */
export function clearCreepTarget(creep: Creep, targetKey: string = 'target'): void {
  const mem = getCreepMemory(creep);
  delete mem[targetKey];
}

/**
 * Get creep working state safely
 * Defaults to false if not set
 *
 * @param creep - The creep to get state for
 * @returns True if creep is in working state
 */
export function isCreepWorking(creep: Creep): boolean {
  const mem = getCreepMemory(creep);
  return mem.working === true;
}

/**
 * Set creep working state
 *
 * @param creep - The creep to set state for
 * @param working - Whether the creep should be working
 */
export function setCreepWorking(creep: Creep, working: boolean): void {
  const mem = getCreepMemory(creep);
  mem.working = working;
}

/**
 * Get a harvester's source target
 * Validates that the source still exists
 *
 * @param creep - The harvester creep
 * @returns The source object or null
 */
export function getHarvesterSource(creep: Creep): Source | null {
  return getCreepTarget<Source>(creep, 'sourceTarget');
}

/**
 * Set a harvester's source target
 *
 * @param creep - The harvester creep
 * @param source - The source object or null to clear
 */
export function setHarvesterSource(creep: Creep, source: Source | null): void {
  setCreepTarget(creep, source, 'sourceTarget');
}

// ============================================================================
// MEMORY GARBAGE COLLECTION
// ============================================================================

/**
 * Run garbage collection on all creep memories
 * Removes stale references and validates all memory structures
 *
 * @returns Statistics about cleanup performed
 */
export function runMemoryGarbageCollection(): MemoryCleanupStats {
  const stats: MemoryCleanupStats = {
    creepsChecked: 0,
    invalidCreepsRemoved: 0,
    staleMemoiesRemoved: 0,
    targetsValidated: 0,
    invalidTargetsCleared: 0
  };

  // Check all creep memories in Memory.creepMemory
  if (Memory.creepMemory) {
    for (const creepName in Memory.creepMemory) {
      stats.creepsChecked++;

      // Check if creep still exists
      if (!Game.creeps[creepName]) {
        debugLog.info(`Removing memory for dead creep: ${creepName}`);
        delete Memory.creepMemory[creepName];
        stats.invalidCreepsRemoved++;
        continue;
      }

      const mem = Memory.creepMemory[creepName];

      // Validate critical fields
      if (!mem.role || !mem.room) {
        debugLog.warn(`WARN: Creep ${creepName} has corrupt core memory`);
      }

      // Check target IDs
      const targetKeys = ['target', 'sourceTarget', 'resourceTarget', 'prevResourceTarget'];
      for (const key of targetKeys) {
        if (mem[key]) {
          const target = Game.getObjectById(mem[key]);
          stats.targetsValidated++;

          if (!target) {
            debugLog.warn(`Clearing stale target ${key}: ${mem[key]} for creep ${creepName}`);
            delete mem[key];
            stats.invalidTargetsCleared++;
          }
        }
      }
    }
  }

  // Clean up creep memory for all active game creeps
  for (const creepName in Game.creeps) {
    if (!Memory.creepMemory) {
      Memory.creepMemory = {};
    }
    // Ensure each active creep has a memory record
    if (!Memory.creepMemory[creepName]) {
      Memory.creepMemory[creepName] = {
        role: Game.creeps[creepName].memory.role || ("hauler" as CreepRole),
        room: Game.creeps[creepName].room.name,
        working: false
      };
    }
  }

  // Update cleanup stats
  if (Memory.memoryStats) {
    Memory.memoryStats.lastCleanup = Game.time;
  }

  return stats;
}

/**
 * Should we run garbage collection this tick?
 * Returns true if enough ticks have passed since last cleanup
 *
 * @returns True if cleanup should run
 */
export function shouldRunCleanup(): boolean {
  if (!Memory.memoryStats) {
    return false;
  }

  const timeSinceCleanup = Game.time - Memory.memoryStats.lastCleanup;
  return timeSinceCleanup >= Memory.memoryStats.cleanupInterval;
}

/**
 * Run conditional garbage collection based on interval
 * Safe to call every tick - will only run when due
 *
 * @returns Cleanup stats if cleanup was performed, undefined otherwise
 */
export function runConditionalCleanup(): MemoryCleanupStats | undefined {
  if (shouldRunCleanup()) {
    return runMemoryGarbageCollection();
  }
  return undefined;
}

// ============================================================================
// MEMORY VALIDATION & DIAGNOSTICS
// ============================================================================

/**
 * Validate all creep memories and return diagnostic information
 *
 * @returns Array of validation issues found
 */
export function validateAllMemories(): string[] {
  const issues: string[] = [];

  // Check each game creep
  for (const creepName in Game.creeps) {
    const creep = Game.creeps[creepName];
    const mem = creep.memory as BaseCreepMemory;

    if (!mem.role) {
      issues.push(`Creep ${creepName} missing role`);
    }

    if (!mem.room) {
      issues.push(`Creep ${creepName} missing room`);
    }

    // Check for invalid target references
    if (mem.target && !Game.getObjectById(mem.target)) {
      issues.push(`Creep ${creepName} has stale target: ${mem.target}`);
    }

    if (mem.sourceTarget && !Game.getObjectById(mem.sourceTarget)) {
      issues.push(`Creep ${creepName} has stale sourceTarget: ${mem.sourceTarget}`);
    }
  }

  return issues;
}

/**
 * Get memory diagnostics and statistics
 *
 * @returns Object with memory usage and statistics
 */
export function getMemoryDiagnostics(): {
  totalCreeps: number;
  activeCreeps: number;
  staleMemorites: number;
  lastCleanupTick: number;
  issues: string[];
} {
  const issues = validateAllMemories();
  const totalCreeps = Object.keys(Memory.creepMemory || {}).length;
  const activeCreeps = Object.keys(Game.creeps).length;
  const staleMemorites = totalCreeps - activeCreeps;
  const lastCleanupTick = Memory.memoryStats?.lastCleanup || -1;

  return {
    totalCreeps,
    activeCreeps,
    staleMemorites,
    lastCleanupTick,
    issues
  };
}

// ============================================================================
// COMMON OPERATIONS
// ============================================================================

/**
 * Safely get a resource from a target structure/resource object
 * Used for retrieving energy, minerals, etc. from containers/dropped resources
 *
 * @param target - The target object (Structure, Resource, Tombstone, or Ruin)
 * @param resourceType - The resource type to check
 * @returns Amount of resource available or 0 if unavailable
 */
export function getResourceAmount(
  target: Structure | Resource | Tombstone | Ruin | null | undefined,
  resourceType: ResourceConstant = RESOURCE_ENERGY
): number {
  if (!target) return 0;

  if (target instanceof Resource) {
    return target.resourceType === resourceType ? target.amount : 0;
  }

  if ('store' in target && target.store) {
    return target.store[resourceType] || 0;
  }

  return 0;
}

/**
 * Clear a creep's state completely (useful for role reassignment)
 * Removes all role-specific memory fields
 *
 * @param creep - The creep to clear
 */
export function clearCreepState(creep: Creep): void {
  const mem = getCreepMemory(creep);

  // Clear role-specific fields
  delete mem.target;
  delete mem.sourceTarget;
  delete mem.prevSourceTarget;
  delete mem.resourceTarget;
  delete mem.prevResourceTarget;
  delete mem.harvesting;
  delete mem.building;
  delete mem.upgrading;
  delete mem.haulering;

  // Keep core fields
  mem.working = false;
  mem.role = mem.role || ("hauler" as CreepRole);
  mem.room = creep.room.name;
}
