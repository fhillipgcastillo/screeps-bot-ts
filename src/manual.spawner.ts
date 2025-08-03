import { CreepRole, CreepRoleEnum } from "./types";
import { SpawnManager } from "./spawn.manager";

/**
 * Interface for spawn operation results
 */
export interface SpawnResult {
  success: boolean;
  code: ScreepsReturnCode;
  message: string;
  creepName?: string;
  energyCost?: number;
  bodyParts?: BodyPartConstant[];
}

/**
 * Interface for spawn status information
 */
export interface SpawnStatus {
  available: boolean;
  spawning: boolean;
  currentSpawningCreep?: string;
  energyAvailable: number;
  energyCapacity: number;
  queueLength: number;
}

/**
 * Body part configurations organized by energy cost and creep type
 */
export class BodyConfigurations {
  // Energy cost constants for body parts
  private static readonly BODY_COSTS = {
    [MOVE]: 50,
    [WORK]: 100,
    [CARRY]: 50,
    [ATTACK]: 80,
    [RANGED_ATTACK]: 150,
    [HEAL]: 250,
    [CLAIM]: 600,
    [TOUGH]: 10
  };

  /**
   * Calculate the energy cost of a body configuration
   */
  public static calculateBodyCost(body: BodyPartConstant[]): number {
    return body.reduce((cost, part) => cost + this.BODY_COSTS[part], 0);
  }

  /**
   * Get optimal body configuration for a creep type based on available energy
   */
  public static getOptimalBody(role: CreepRole, availableEnergy: number, energyCapacity: number): BodyPartConstant[] {
    const configurations = this.getBodyConfigurations(role);

    // Find the best configuration that fits within available energy
    let bestConfig: BodyPartConstant[] = configurations.emergency;

    for (const config of [configurations.emergency, configurations.basic, configurations.advanced, configurations.optimal]) {
      const cost = this.calculateBodyCost(config);
      if (cost <= availableEnergy && cost <= energyCapacity) {
        bestConfig = config;
      } else {
        break;
      }
    }

    return bestConfig;
  }

  /**
   * Get all body configurations for a specific creep role
   */
  private static getBodyConfigurations(role: CreepRole): {
    emergency: BodyPartConstant[];
    basic: BodyPartConstant[];
    advanced: BodyPartConstant[];
    optimal: BodyPartConstant[];
  } {
    switch (role) {
      case CreepRoleEnum.HARVESTER:
        return {
          emergency: [WORK, WORK, MOVE],                                    // 250 energy
          basic: [WORK, WORK, MOVE, MOVE],                                  // 300 energy
          advanced: [WORK, WORK, WORK, MOVE],                               // 350 energy
          optimal: [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE]             // 500 energy
        };

      case CreepRoleEnum.HAULER:
        return {
          emergency: [CARRY, MOVE, MOVE],                                   // 150 energy
          basic: [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],                   // 300 energy
          advanced: [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],         // 350 energy
          optimal: [CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE] // 450 energy
        };

      case CreepRoleEnum.BUILDER:
        return {
          emergency: [WORK, CARRY, MOVE, MOVE],                             // 250 energy
          basic: [WORK, WORK, CARRY, MOVE],                                 // 300 energy
          advanced: [WORK, CARRY, WORK, CARRY, MOVE, MOVE],                 // 400 energy
          optimal: [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE]             // 500 energy
        };

      case CreepRoleEnum.UPGRADER:
        return {
          emergency: [WORK, CARRY, MOVE, MOVE],                             // 250 energy
          basic: [WORK, WORK, CARRY, MOVE],                                 // 300 energy
          advanced: [WORK, CARRY, CARRY, WORK, WORK, MOVE],                 // 450 energy
          optimal: [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE]             // 500 energy
        };

      case CreepRoleEnum.DEFENDER:
        return {
          emergency: [TOUGH, ATTACK, MOVE],                                 // 110 energy
          basic: [TOUGH, ATTACK, ATTACK, MOVE],                             // 190 energy
          advanced: [TOUGH, TOUGH, ATTACK, ATTACK, MOVE, MOVE],             // 280 energy
          optimal: [TOUGH, TOUGH, ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE] // 460 energy
        };

      case CreepRoleEnum.RANGER:
        return {
          emergency: [TOUGH, RANGED_ATTACK, MOVE],                          // 210 energy
          basic: [TOUGH, RANGED_ATTACK, MOVE],                              // 210 energy
          advanced: [TOUGH, TOUGH, RANGED_ATTACK, MOVE, MOVE],              // 310 energy
          optimal: [TOUGH, TOUGH, RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE, MOVE] // 560 energy
        };

      case CreepRoleEnum.EXPLORER:
        return {
          emergency: [WORK, MOVE, MOVE],                                    // 200 energy
          basic: [WORK, CARRY, MOVE, MOVE],                                 // 250 energy
          advanced: [WORK, CARRY, MOVE, MOVE, MOVE],                        // 300 energy
          optimal: [WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE]              // 450 energy
        };

      default:
        // Fallback to basic worker configuration
        return {
          emergency: [WORK, CARRY, MOVE],                                   // 200 energy
          basic: [WORK, CARRY, MOVE, MOVE],                                 // 250 energy
          advanced: [WORK, WORK, CARRY, MOVE, MOVE],                        // 350 energy
          optimal: [WORK, WORK, CARRY, CARRY, MOVE, MOVE]                   // 400 energy
        };
    }
  }
}

/**
 * Manual Spawner class providing public functions for manual creep spawning
 * Integrates with existing SpawnManager and provides convenient spawning methods
 */
export class ManualSpawner {
  private spawnManager: SpawnManager;

  constructor(spawnManager?: SpawnManager) {
    this.spawnManager = spawnManager || new SpawnManager();
  }

  /**
   * Get the status of a specific spawn
   */
  public getSpawnStatus(spawnName: string): SpawnStatus | null {
    const spawn = Game.spawns[spawnName];
    if (!spawn) {
      return null;
    }

    return {
      available: !spawn.spawning,
      spawning: !!spawn.spawning,
      currentSpawningCreep: spawn.spawning?.name,
      energyAvailable: spawn.room.energyAvailable,
      energyCapacity: spawn.room.energyCapacityAvailable,
      queueLength: spawn.spawning ? 1 : 0 // Screeps doesn't have queue, but this could be extended
    };
  }

  /**
   * Get the status of all spawns
   */
  public getAllSpawnStatuses(): Record<string, SpawnStatus> {
    const statuses: Record<string, SpawnStatus> = {};

    for (const spawnName in Game.spawns) {
      const status = this.getSpawnStatus(spawnName);
      if (status) {
        statuses[spawnName] = status;
      }
    }

    return statuses;
  }

  /**
   * Find the best available spawn for spawning a creep
   */
  public findBestSpawn(requiredEnergy?: number): StructureSpawn | null {
    let bestSpawn: StructureSpawn | null = null;
    let bestScore = -1;

    for (const spawnName in Game.spawns) {
      const spawn = Game.spawns[spawnName];
      if (!spawn || spawn.spawning) {
        continue;
      }

      // Check if spawn has enough energy if required
      if (requiredEnergy && spawn.room.energyAvailable < requiredEnergy) {
        continue;
      }

      // Score based on available energy and room conditions
      const score = spawn.room.energyAvailable + (spawn.room.energyCapacityAvailable * 0.1);

      if (score > bestScore) {
        bestScore = score;
        bestSpawn = spawn;
      }
    }

    return bestSpawn;
  }

  /**
   * Generic function to spawn any creep type with automatic body selection
   */
  public spawnCreep(
    creepType: CreepRole,
    spawnName?: string,
    customBody?: BodyPartConstant[],
    customName?: string
  ): SpawnResult {
    // Find spawn to use
    let spawn: StructureSpawn | null = null;

    if (spawnName) {
      spawn = Game.spawns[spawnName];
      if (!spawn) {
        return {
          success: false,
          code: ERR_INVALID_TARGET,
          message: `Spawn '${spawnName}' not found`
        };
      }
    } else {
      spawn = this.findBestSpawn();
      if (!spawn) {
        return {
          success: false,
          code: ERR_BUSY,
          message: "No available spawns found"
        };
      }
    }

    // Check if spawn is busy
    if (spawn.spawning) {
      return {
        success: false,
        code: ERR_BUSY,
        message: `Spawn '${spawn.name}' is currently spawning ${spawn.spawning.name}`
      };
    }

    // Determine body configuration
    const body = customBody || BodyConfigurations.getOptimalBody(
      creepType,
      spawn.room.energyAvailable,
      spawn.room.energyCapacityAvailable
    );

    const energyCost = BodyConfigurations.calculateBodyCost(body);

    // Check if we have enough energy
    if (spawn.room.energyAvailable < energyCost) {
      return {
        success: false,
        code: ERR_NOT_ENOUGH_ENERGY,
        message: `Not enough energy. Required: ${energyCost}, Available: ${spawn.room.energyAvailable}`,
        energyCost
      };
    }

    // Generate name
    const namePrefix = this.getNamePrefix(creepType);
    const creepName = customName || `${namePrefix}${Game.time}`;

    // Attempt to spawn the creep
    const result = this.spawnManager.spawnCreep(spawn, body, namePrefix, creepType);

    // Return result
    if (result === OK) {
      return {
        success: true,
        code: result,
        message: `Successfully spawned ${creepType} '${creepName}'`,
        creepName,
        energyCost,
        bodyParts: body
      };
    } else {
      return {
        success: false,
        code: result,
        message: `Failed to spawn ${creepType}: ${this.getErrorMessage(result)}`,
        energyCost,
        bodyParts: body
      };
    }
  }

  // ============================================================================
  // CONVENIENCE FUNCTIONS FOR SPECIFIC CREEP TYPES
  // ============================================================================

  /**
   * Spawn a harvester creep
   */
  public spawnHarvester(spawnName?: string, customBody?: BodyPartConstant[]): SpawnResult {
    return this.spawnCreep(CreepRoleEnum.HARVESTER, spawnName, customBody);
  }

  /**
   * Spawn a hauler creep
   */
  public spawnHauler(spawnName?: string, customBody?: BodyPartConstant[]): SpawnResult {
    return this.spawnCreep(CreepRoleEnum.HAULER, spawnName, customBody);
  }

  /**
   * Spawn a builder creep
   */
  public spawnBuilder(spawnName?: string, customBody?: BodyPartConstant[]): SpawnResult {
    return this.spawnCreep(CreepRoleEnum.BUILDER, spawnName, customBody);
  }

  /**
   * Spawn an upgrader creep
   */
  public spawnUpgrader(spawnName?: string, customBody?: BodyPartConstant[]): SpawnResult {
    return this.spawnCreep(CreepRoleEnum.UPGRADER, spawnName, customBody);
  }

  /**
   * Spawn a defender creep
   */
  public spawnDefender(spawnName?: string, customBody?: BodyPartConstant[]): SpawnResult {
    return this.spawnCreep(CreepRoleEnum.DEFENDER, spawnName, customBody);
  }

  /**
   * Spawn a ranger creep
   */
  public spawnRanger(spawnName?: string, customBody?: BodyPartConstant[]): SpawnResult {
    return this.spawnCreep(CreepRoleEnum.RANGER, spawnName, customBody);
  }

  /**
   * Spawn an explorer creep
   */
  public spawnExplorer(spawnName?: string, customBody?: BodyPartConstant[], nextRole?: CreepRole): SpawnResult {
    const result = this.spawnCreep(CreepRoleEnum.EXPLORER, spawnName, customBody);

    // Set the nextRole for explorer if specified
    if (result.success && result.creepName && nextRole) {
      const creep = Game.creeps[result.creepName];
      if (creep && creep.memory) {
        (creep.memory as any).nextRole = nextRole;
      }
    }

    return result;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get current creep counts by role
   */
  public getCurrentCreepCounts(): Record<CreepRole, number> {
    const counts: Record<CreepRole, number> = {
      harvester: 0,
      hauler: 0,
      builder: 0,
      upgrader: 0,
      defender: 0,
      ranger: 0,
      explorer: 0
    };

    for (const creepName in Game.creeps) {
      const creep = Game.creeps[creepName];
      if (creep && creep.memory.role) {
        counts[creep.memory.role]++;
      }
    }

    return counts;
  }

  /**
   * Check if we need more creeps of a specific type based on current counts and room level
   */
  public needsMoreCreeps(role: CreepRole, roomName?: string): boolean {
    const counts = this.getCurrentCreepCounts();
    const currentCount = counts[role];

    // Get room level to determine requirements
    let roomLevel = 1;
    if (roomName) {
      const room = Game.rooms[roomName];
      roomLevel = room?.controller?.level || 1;
    } else {
      // Use the first available room's level
      const firstRoom = Object.values(Game.rooms)[0];
      roomLevel = firstRoom?.controller?.level || 1;
    }

    const levelHandler = this.spawnManager.getLevelHandler(roomLevel);

    switch (role) {
      case CreepRoleEnum.HARVESTER:
        return currentCount < levelHandler.harvesters.max;
      case CreepRoleEnum.HAULER:
        return currentCount < levelHandler.haulers.max;
      case CreepRoleEnum.BUILDER:
        return currentCount < levelHandler.builders.max;
      case CreepRoleEnum.UPGRADER:
        return currentCount < levelHandler.upgraders.max;
      case CreepRoleEnum.DEFENDER:
        return currentCount < levelHandler.defenders.max;
      case CreepRoleEnum.RANGER:
        return currentCount < levelHandler.rangers.max;
      default:
        return true; // For explorer and other types, allow spawning
    }
  }

  /**
   * Get name prefix for a creep role
   */
  private getNamePrefix(role: CreepRole): string {
    switch (role) {
      case CreepRoleEnum.HARVESTER:
        return "Harvester";
      case CreepRoleEnum.HAULER:
        return "Hauler";
      case CreepRoleEnum.BUILDER:
        return "Builder";
      case CreepRoleEnum.UPGRADER:
        return "Upgrader";
      case CreepRoleEnum.DEFENDER:
        return "Defender";
      case CreepRoleEnum.RANGER:
        return "Ranger";
      case CreepRoleEnum.EXPLORER:
        return "Explorer";
      default:
        return "Creep";
    }
  }

  /**
   * Convert error code to human-readable message
   */
  private getErrorMessage(code: ScreepsReturnCode): string {
    switch (code) {
      case ERR_NOT_ENOUGH_ENERGY:
        return "Not enough energy";
      case ERR_INVALID_ARGS:
        return "Invalid arguments";
      case ERR_BUSY:
        return "Spawn is busy";
      case ERR_NOT_FOUND:
        return "Spawn not found";
      case ERR_INVALID_TARGET:
        return "Invalid target";
      case ERR_RCL_NOT_ENOUGH:
        return "Room Controller Level not high enough";
      default:
        return `Unknown error (${code})`;
    }
  }

  /**
   * Get detailed information about what body parts would be used for a creep type
   */
  public getBodyPreview(role: CreepRole, availableEnergy?: number, energyCapacity?: number): {
    body: BodyPartConstant[];
    cost: number;
    tier: string;
  } {
    // Use current room energy if not specified
    if (availableEnergy === undefined || energyCapacity === undefined) {
      const firstSpawn = Object.values(Game.spawns)[0];
      if (firstSpawn) {
        availableEnergy = availableEnergy || firstSpawn.room.energyAvailable;
        energyCapacity = energyCapacity || firstSpawn.room.energyCapacityAvailable;
      } else {
        availableEnergy = availableEnergy || 300;
        energyCapacity = energyCapacity || 300;
      }
    }

    const body = BodyConfigurations.getOptimalBody(role, availableEnergy, energyCapacity);
    const cost = BodyConfigurations.calculateBodyCost(body);

    // Determine tier based on cost
    let tier = "emergency";
    if (cost >= 500) tier = "optimal";
    else if (cost >= 400) tier = "advanced";
    else if (cost >= 300) tier = "basic";

    return { body, cost, tier };
  }
}

// ============================================================================
// GLOBAL INSTANCE AND CONVENIENCE EXPORTS
// ============================================================================

// Create a global instance that can be used throughout the codebase
let globalManualSpawner: ManualSpawner | null = null;

/**
 * Get the global ManualSpawner instance
 */
export function getManualSpawner(spawnManager?: SpawnManager): ManualSpawner {
  if (!globalManualSpawner) {
    globalManualSpawner = new ManualSpawner(spawnManager);
  }
  return globalManualSpawner;
}

// Export convenience functions that use the global instance
export const spawnCreep = (creepType: CreepRole, spawnName?: string, customBody?: BodyPartConstant[], customName?: string): SpawnResult => {
  return getManualSpawner().spawnCreep(creepType, spawnName, customBody, customName);
};

export const spawnHarvester = (spawnName?: string, customBody?: BodyPartConstant[]): SpawnResult => {
  return getManualSpawner().spawnHarvester(spawnName, customBody);
};

export const spawnHauler = (spawnName?: string, customBody?: BodyPartConstant[]): SpawnResult => {
  return getManualSpawner().spawnHauler(spawnName, customBody);
};

export const spawnBuilder = (spawnName?: string, customBody?: BodyPartConstant[]): SpawnResult => {
  return getManualSpawner().spawnBuilder(spawnName, customBody);
};

export const spawnUpgrader = (spawnName?: string, customBody?: BodyPartConstant[]): SpawnResult => {
  return getManualSpawner().spawnUpgrader(spawnName, customBody);
};

export const spawnDefender = (spawnName?: string, customBody?: BodyPartConstant[]): SpawnResult => {
  return getManualSpawner().spawnDefender(spawnName, customBody);
};

export const spawnRanger = (spawnName?: string, customBody?: BodyPartConstant[]): SpawnResult => {
  return getManualSpawner().spawnRanger(spawnName, customBody);
};

export const spawnExplorer = (spawnName?: string, customBody?: BodyPartConstant[], nextRole?: CreepRole): SpawnResult => {
  return getManualSpawner().spawnExplorer(spawnName, customBody, nextRole);
};

export const getSpawnStatus = (spawnName: string): SpawnStatus | null => {
  return getManualSpawner().getSpawnStatus(spawnName);
};

export const getAllSpawnStatuses = (): Record<string, SpawnStatus> => {
  return getManualSpawner().getAllSpawnStatuses();
};

export const getCurrentCreepCounts = (): Record<CreepRole, number> => {
  return getManualSpawner().getCurrentCreepCounts();
};

export const needsMoreCreeps = (role: CreepRole, roomName?: string): boolean => {
  return getManualSpawner().needsMoreCreeps(role, roomName);
};

export const getBodyPreview = (role: CreepRole, availableEnergy?: number, energyCapacity?: number) => {
  return getManualSpawner().getBodyPreview(role, availableEnergy, energyCapacity);
};
