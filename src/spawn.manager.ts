import { levelDefinitions, LevelDefinition } from "./levels.handler";
import { CreepRole, CreepRoleEnum, getCreepsByRole } from "./types";
import { debugLog } from "./utils/Logger";

/**
 * Interface defining the structure for creep counts by role
 */
interface CreepCounts {
  harvesters: number;
  haulers: number;
  builders: number;
  upgraders: number;
  defenders: number;
  rangers: number;
}

/**
 * Interface defining spawn context information
 */
interface SpawnContext {
  spawn: StructureSpawn;
  currentLevel: number;
  levelHandler: LevelDefinition;
  creepCounts: CreepCounts;
  availableEnergy: number;
  energyCapacity: number;
  enoughCreeps: boolean;
  enemiesInRoom: Creep[];
}

/**
 * SpawnManager class responsible for managing creep spawning across all spawns
 * Implements object-oriented design principles with proper encapsulation and separation of concerns
 */
export class SpawnManager {
  private static readonly DEBUG_INTERVAL = 5;
  private static readonly MINIMUM_HARVESTERS_THRESHOLD = 3;
  private static readonly MINIMUM_HAULERS_THRESHOLD = 4;
  private static readonly MINIMUM_CONTROLLER_LEVEL_FOR_ADVANCED = 2;

  private autoSpawnEnabled: boolean = true;

  /**
   * Enable auto-spawning mechanism
   */
  public enableAutoSpawn(): void {
    this.autoSpawnEnabled = true;
    console.log('Auto-spawning enabled');
  }

  /**
   * Disable auto-spawning mechanism
   */
  public disableAutoSpawn(): void {
    this.autoSpawnEnabled = false;
    console.log('Auto-spawning disabled');
  }

  /**
   * Toggle auto-spawning mechanism
   * @returns current state of auto-spawning
   */
  public toggleAutoSpawn(): boolean {
    this.autoSpawnEnabled = !this.autoSpawnEnabled;
    console.log(`Auto-spawning ${this.autoSpawnEnabled ? 'enabled' : 'disabled'}`);
    return this.autoSpawnEnabled;
  }

  /**
   * Get current state of auto-spawning
   */
  public isAutoSpawnEnabled(): boolean {
    return this.autoSpawnEnabled;
  }

  /**
   * Main entry point for spawn management - processes all spawns in the game
   */
  public run(): void {
    if (!this.autoSpawnEnabled) {
      return;
    }
    const globalCreepCounts = this.getGlobalCreepCounts();

    for (const spawnName in Game.spawns) {
      const spawn = Game.spawns[spawnName];
      if (spawn) {
        this.processSpawn(spawn, globalCreepCounts);
      }
    }
  }

  /**
   * Processes a single spawn and determines what creeps to spawn
   */
  private processSpawn(spawn: StructureSpawn, globalCreepCounts: CreepCounts): void {
    const context = this.createSpawnContext(spawn, globalCreepCounts);

    this.logDebugInfo(context);
    this.handleSpawning(context);
    this.displaySpawningVisual(spawn);
  }

  /**
   * Creates a comprehensive context object for spawn decision making
   */
  private createSpawnContext(spawn: StructureSpawn, creepCounts: CreepCounts): SpawnContext {
    const currentLevel = spawn.room?.controller?.level ?? 1;
    const levelHandler = this.getLevelHandler(currentLevel);
    const availableEnergy = spawn.room.energyAvailable;
    const energyCapacity = spawn.room.energyCapacityAvailable;
    const enoughCreeps = this.hasEnoughCreeps(creepCounts, levelHandler);
    const enemiesInRoom = spawn.room.find(FIND_HOSTILE_CREEPS);

    return {
      spawn,
      currentLevel,
      levelHandler,
      creepCounts,
      availableEnergy,
      energyCapacity,
      enoughCreeps,
      enemiesInRoom
    };
  }

  /**
   * Gets the current count of all creep types globally using type-safe role filtering
   */
  public getGlobalCreepCounts(): CreepCounts {
    return {
      harvesters: getCreepsByRole(CreepRoleEnum.HARVESTER).length,
      haulers: getCreepsByRole(CreepRoleEnum.HAULER).length,
      builders: getCreepsByRole(CreepRoleEnum.BUILDER).length,
      upgraders: getCreepsByRole(CreepRoleEnum.UPGRADER).length,
      defenders: getCreepsByRole(CreepRoleEnum.DEFENDER).length,
      rangers: getCreepsByRole(CreepRoleEnum.RANGER).length
    };
  }

  /**
   * Gets the level handler configuration for the given controller level
   */
  public getLevelHandler(level: number): LevelDefinition {
    const levelString = level.toString();
    return levelDefinitions.hasOwnProperty(levelString) ? levelDefinitions[levelString] : levelDefinitions["1"];
  }

  /**
   * Determines if we have enough creeps based on minimum requirements
   */
  public hasEnoughCreeps(counts: CreepCounts, levelHandler: LevelDefinition): boolean {
    return counts.harvesters >= levelHandler.harvesters.min
      && counts.haulers >= levelHandler.haulers.min
      && counts.upgraders >= levelHandler.upgraders.min
      && counts.builders >= levelHandler.builders.min;
  }

  /**
   * Logs debug information about the current spawn state
   */
  public logDebugInfo(context: SpawnContext): void {
    if (Game.time % SpawnManager.DEBUG_INTERVAL === 0) {
      debugLog.debug(`Room Energy ${context.availableEnergy}/${context.energyCapacity}`);
      debugLog.debug(`Enough creeps: ${context.enoughCreeps}`);
      debugLog.debug(`Harvesters: ${context.creepCounts.harvesters}`);
      debugLog.debug(`Haulers: ${context.creepCounts.haulers}`);
      debugLog.debug(`Builders: ${context.creepCounts.builders}`);
      debugLog.debug(`Upgraders: ${context.creepCounts.upgraders}`);
      debugLog.debug(`Defenders: ${context.creepCounts.defenders}`);
      debugLog.debug(`Rangers: ${context.creepCounts.rangers}`);
    }
  }

  /**
   * Main spawning logic dispatcher
   */
  private handleSpawning(context: SpawnContext): void {
    // Handle initial room controller level or emergency situations
    if (this.shouldHandleInitialSpawning(context)) {
      this.handleInitialSpawning(context);
    }
    // Handle advanced spawning for level 2+ rooms
    else if (context.currentLevel >= SpawnManager.MINIMUM_CONTROLLER_LEVEL_FOR_ADVANCED) {
      if (context.enemiesInRoom.length > 0) {
        this.handleDefensiveSpawning(context);
      } else {
        this.handleAdvancedSpawning(context);
      }
    }
  }

  /**
   * Determines if we should use initial spawning logic
   */
  private shouldHandleInitialSpawning(context: SpawnContext): boolean {
    return context.currentLevel < SpawnManager.MINIMUM_CONTROLLER_LEVEL_FOR_ADVANCED
      || context.creepCounts.harvesters < SpawnManager.MINIMUM_HARVESTERS_THRESHOLD
      || context.creepCounts.haulers < SpawnManager.MINIMUM_HAULERS_THRESHOLD;
  }
  /**
   * Handles initial spawning for early game or emergency situations
   */
  private handleInitialSpawning(context: SpawnContext): void {
    const { spawn, levelHandler, creepCounts, availableEnergy, enoughCreeps } = context;

    // Handle emergency or low energy situations
    if (availableEnergy < 300 || !enoughCreeps) {
      this.spawnEmergencyCreeps(spawn, levelHandler, creepCounts);
    } else if (enoughCreeps) {
      this.spawnOptimalCreeps(spawn, levelHandler, creepCounts);
    }
  }

  /**
   * Spawns emergency creeps with minimal energy requirements
   */
  public spawnEmergencyCreeps(spawn: StructureSpawn, levelHandler: LevelDefinition, counts: CreepCounts): void {
    if (counts.harvesters < 1 || (counts.harvesters < levelHandler.harvesters.min && counts.haulers % 3 === 0)) {
      this.spawnCreep(spawn, [WORK, WORK, MOVE], 'Harvester', CreepRoleEnum.HARVESTER);
    } else if (counts.haulers < levelHandler.haulers.min) {
      this.spawnCreep(spawn, [CARRY, MOVE, MOVE], 'Hauler', CreepRoleEnum.HAULER);
    } else if (counts.builders < levelHandler.builders.min) {
      this.spawnCreep(spawn, [WORK, CARRY, MOVE, MOVE], 'Builder', CreepRoleEnum.BUILDER);
    } else if (counts.upgraders < levelHandler.upgraders.min) {
      this.spawnCreep(spawn, [WORK, CARRY, MOVE, MOVE], 'Upgrader', CreepRoleEnum.UPGRADER);
    }
  }

  /**
   * Spawns optimal creeps when we have enough basic creeps
   */
  private spawnOptimalCreeps(spawn: StructureSpawn, levelHandler: LevelDefinition, counts: CreepCounts): void {
    if (counts.harvesters < levelHandler.harvesters.max) {
      this.spawnCreep(spawn, [WORK, WORK, MOVE, MOVE], 'Harvester', CreepRoleEnum.HARVESTER);
    } else if (counts.haulers < levelHandler.haulers.max) {
      this.spawnCreep(spawn, [CARRY, MOVE, MOVE, MOVE, MOVE], 'Hauler', CreepRoleEnum.HAULER);
    } else if (counts.builders < levelHandler.builders.max) {
      this.spawnCreep(spawn, [WORK, CARRY, MOVE, MOVE], 'Builder', CreepRoleEnum.BUILDER);
    } else if (counts.upgraders < levelHandler.upgraders.max) {
      this.spawnCreep(spawn, [WORK, CARRY, MOVE, MOVE], 'Upgrader', CreepRoleEnum.UPGRADER);
    }
  }

  /**
   * Handles defensive spawning when enemies are present
   */
  private handleDefensiveSpawning(context: SpawnContext): void {
    const { spawn, levelHandler, creepCounts, energyCapacity } = context;

    debugLog.warn("Enemies in the room - spawning defensive units");

    if (energyCapacity <= 300) {
      this.spawnBasicDefenders(spawn, levelHandler, creepCounts);
    } else if (energyCapacity >= 350) {
      this.spawnAdvancedDefenders(spawn, levelHandler, creepCounts);
    } else {
      this.spawnFallbackDefenders(spawn, levelHandler, creepCounts);
    }
  }

  /**
   * Spawns basic defensive units for low energy capacity
   */
  private spawnBasicDefenders(spawn: StructureSpawn, levelHandler: LevelDefinition, counts: CreepCounts): void {
    if (counts.rangers < levelHandler.rangers.min) {
      this.spawnCreep(spawn, [TOUGH, RANGED_ATTACK, MOVE], 'Ranger', CreepRoleEnum.RANGER);
    } else if (counts.defenders < levelHandler.defenders.min) {
      this.spawnCreep(spawn, [TOUGH, ATTACK, ATTACK, MOVE], 'Defender', CreepRoleEnum.DEFENDER);
    }
  }

  /**
   * Spawns advanced defensive units for higher energy capacity
   */
  private spawnAdvancedDefenders(spawn: StructureSpawn, levelHandler: LevelDefinition, counts: CreepCounts): void {
    if (counts.rangers < levelHandler.rangers.min) {
      this.spawnCreep(spawn, [TOUGH, RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE], 'Ranger', CreepRoleEnum.RANGER);
    } else if (counts.defenders < 2) {
      this.spawnCreep(spawn, [TOUGH, ATTACK, ATTACK, MOVE, MOVE], 'Defender', CreepRoleEnum.DEFENDER);
    }
  }

  /**
   * Spawns fallback defensive units
   */
  private spawnFallbackDefenders(spawn: StructureSpawn, levelHandler: LevelDefinition, counts: CreepCounts): void {
    if (counts.rangers < levelHandler.rangers.max) {
      this.spawnCreep(spawn, [TOUGH, RANGED_ATTACK, MOVE], 'Ranger', CreepRoleEnum.RANGER);
    } else if (counts.defenders < levelHandler.defenders.max) {
      this.spawnCreep(spawn, [TOUGH, ATTACK, MOVE], 'Defender', CreepRoleEnum.DEFENDER);
    }
  }
  /**
   * Handles advanced spawning for level 2+ rooms with complex energy-based logic
   */
  private handleAdvancedSpawning(context: SpawnContext): void {
    const { spawn, levelHandler, creepCounts, availableEnergy, energyCapacity, enoughCreeps } = context;

    // Handle different energy capacity ranges
    if (energyCapacity <= 300) {
      this.handleLowEnergySpawning(spawn, levelHandler, creepCounts, enoughCreeps);
    } else if (energyCapacity >= 350 && energyCapacity <= 400) {
      this.handleMidEnergySpawning(spawn, levelHandler, creepCounts, availableEnergy, enoughCreeps);
    } else if (energyCapacity > 400 && energyCapacity < 500) {
      this.handleHighEnergySpawning(spawn, levelHandler, creepCounts, availableEnergy, enoughCreeps);
    } else if (energyCapacity >= 500) {
      this.handleVeryHighEnergySpawning(spawn, levelHandler, creepCounts, availableEnergy, enoughCreeps);
    }
  }

  /**
   * Handles spawning for low energy capacity (≤300)
   */
  private handleLowEnergySpawning(spawn: StructureSpawn, levelHandler: LevelDefinition, counts: CreepCounts, enoughCreeps: boolean): void {
    if (!enoughCreeps) {
      if (counts.harvesters < levelHandler.harvesters.min && counts.haulers % 3 === 0) {
        this.spawnCreep(spawn, [WORK, WORK, MOVE, MOVE], 'Harvester', CreepRoleEnum.HARVESTER);
      } else if (counts.haulers < levelHandler.haulers.min) {
        this.spawnCreep(spawn, [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE], 'Hauler', CreepRoleEnum.HAULER);
      } else if (counts.builders < levelHandler.builders.min) {
        this.spawnCreep(spawn, [WORK, WORK, CARRY, MOVE], 'Builder', CreepRoleEnum.BUILDER);
      } else if (counts.upgraders < levelHandler.upgraders.min) {
        this.spawnCreep(spawn, [WORK, WORK, CARRY, MOVE], 'Upgrader', CreepRoleEnum.UPGRADER);
      }
    } else {
      if (counts.harvesters < levelHandler.harvesters.max && counts.harvesters > 1 && counts.haulers > 4) {
        this.spawnCreep(spawn, [WORK, WORK, MOVE, MOVE], 'Harvester', CreepRoleEnum.HARVESTER);
      } else if (counts.haulers < levelHandler.haulers.max) {
        this.spawnCreep(spawn, [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE], 'Hauler', CreepRoleEnum.HAULER);
      } else if (counts.builders < levelHandler.builders.max) {
        this.spawnCreep(spawn, [WORK, CARRY, WORK, MOVE, MOVE], 'Builder', CreepRoleEnum.BUILDER);
      } else if (counts.upgraders < levelHandler.upgraders.max) {
        this.spawnCreep(spawn, [WORK, CARRY, WORK, MOVE, MOVE], 'Upgrader', CreepRoleEnum.UPGRADER);
      }
    }
  }

  /**
   * Handles spawning for mid energy capacity (350-400)
   */
  private handleMidEnergySpawning(spawn: StructureSpawn, levelHandler: LevelDefinition, counts: CreepCounts, availableEnergy: number, enoughCreeps: boolean): void {
    if (!enoughCreeps) {
      if (counts.harvesters < levelHandler.harvesters.min && counts.haulers > 3) {
        this.spawnCreep(spawn, [WORK, WORK, WORK, MOVE], 'Harvester', CreepRoleEnum.HARVESTER);
      } else if (counts.haulers < levelHandler.haulers.min) {
        this.spawnCreep(spawn, [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE], 'Hauler', CreepRoleEnum.HAULER);
      } else if (counts.builders < levelHandler.builders.min) {
        this.spawnCreep(spawn, [WORK, CARRY, WORK, CARRY, MOVE, MOVE], 'Builder', CreepRoleEnum.BUILDER);
      } else if (counts.upgraders < levelHandler.upgraders.min) {
        this.spawnCreep(spawn, [WORK, CARRY, WORK, CARRY, MOVE], 'Upgrader', CreepRoleEnum.UPGRADER);
      }
    } else {
      if (counts.harvesters < levelHandler.harvesters.max && counts.harvesters > 1 && counts.haulers > 4) {
        this.spawnCreep(spawn, [WORK, WORK, WORK, MOVE, MOVE], 'Harvester', CreepRoleEnum.HARVESTER);
      } else if (counts.haulers < levelHandler.haulers.max) {
        this.spawnCreep(spawn, [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE], 'Hauler', CreepRoleEnum.HAULER);
      } else if (counts.builders < levelHandler.builders.max) {
        this.spawnCreep(spawn, [WORK, CARRY, CARRY, WORK, WORK, MOVE], 'Builder', CreepRoleEnum.BUILDER);
      } else if (counts.upgraders < levelHandler.upgraders.max) {
        this.spawnCreep(spawn, [WORK, CARRY, CARRY, WORK, WORK, MOVE], 'Upgrader', CreepRoleEnum.UPGRADER);
      }
    }
  }
  /**
   * Handles spawning for high energy capacity (400-500)
   */
  private handleHighEnergySpawning(spawn: StructureSpawn, levelHandler: LevelDefinition, counts: CreepCounts, availableEnergy: number, enoughCreeps: boolean): void {
    if (!enoughCreeps) {
      if (counts.harvesters < levelHandler.harvesters.min && counts.harvesters > 1 && counts.haulers % 2) {
        this.spawnCreep(spawn, [WORK, WORK, WORK, MOVE, MOVE], 'Harvester', CreepRoleEnum.HARVESTER);
      } else if (counts.builders < levelHandler.builders.min) {
        this.spawnCreep(spawn, [WORK, CARRY, CARRY, WORK, WORK, MOVE], 'Builder', CreepRoleEnum.BUILDER);
      } else if (counts.upgraders < levelHandler.upgraders.min) {
        this.spawnCreep(spawn, [WORK, CARRY, CARRY, WORK, WORK, MOVE], 'Upgrader', CreepRoleEnum.UPGRADER);
      }
    } else {
      if (counts.harvesters < levelHandler.harvesters.max && counts.harvesters > 1 && counts.haulers % 4) {
        this.spawnCreep(spawn, [WORK, WORK, WORK, WORK, MOVE, MOVE], 'Harvester', CreepRoleEnum.HARVESTER);
      } else if (counts.builders < levelHandler.builders.max) {
        this.spawnCreep(spawn, [WORK, WORK, CARRY, WORK, CARRY, MOVE], 'Builder', CreepRoleEnum.BUILDER);
      } else if (counts.upgraders < levelHandler.upgraders.max) {
        this.spawnCreep(spawn, [WORK, WORK, CARRY, WORK, CARRY, MOVE], 'Upgrader', CreepRoleEnum.UPGRADER);
      }
    }

    // Additional logic for 450-500 range
    if (availableEnergy >= 450) {
      if (counts.harvesters < levelHandler.harvesters.max) {
        this.spawnCreep(spawn, [WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE], 'Harvester', CreepRoleEnum.HARVESTER);
      } else if (counts.builders < levelHandler.builders.max) {
        this.spawnCreep(spawn, [WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE], 'Builder', CreepRoleEnum.BUILDER);
      } else if (counts.upgraders < levelHandler.upgraders.max) {
        this.spawnCreep(spawn, [WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE], 'Upgrader', CreepRoleEnum.UPGRADER);
      }
    }
  }

  /**
   * Handles spawning for very high energy capacity (≥500)
   */
  private handleVeryHighEnergySpawning(spawn: StructureSpawn, levelHandler: LevelDefinition, counts: CreepCounts, availableEnergy: number, enoughCreeps: boolean): void {
    if (availableEnergy >= 450) {
      if (!enoughCreeps) {
        this.spawnVeryHighEnergyMinimumCreeps(spawn, levelHandler, counts);
      } else {
        this.spawnVeryHighEnergyOptimalCreeps(spawn, levelHandler, counts);
      }
    }

    // Handle 550+ energy capacity
    if (spawn.room.energyCapacityAvailable >= 550 && availableEnergy > 450) {
      this.handleUltraHighEnergySpawning(spawn, levelHandler, counts, enoughCreeps);
    }
  }

  /**
   * Spawns minimum required creeps for very high energy capacity
   */
  private spawnVeryHighEnergyMinimumCreeps(spawn: StructureSpawn, levelHandler: LevelDefinition, counts: CreepCounts): void {
    if (counts.harvesters < levelHandler.harvesters.min) {
      this.spawnCreep(spawn, [WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE], 'Harvester', CreepRoleEnum.HARVESTER);
    } else if (counts.haulers < levelHandler.haulers.min) {
      this.spawnCreep(spawn, [CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE], 'Hauler', CreepRoleEnum.HAULER);
    } else if (counts.builders < levelHandler.builders.min) {
      this.spawnCreep(spawn, [WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE], 'Builder', CreepRoleEnum.BUILDER);
    } else if (counts.upgraders < levelHandler.upgraders.min) {
      this.spawnCreep(spawn, [WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE], 'Upgrader', CreepRoleEnum.UPGRADER);
    }
  }

  /**
   * Spawns optimal creeps for very high energy capacity
   */
  private spawnVeryHighEnergyOptimalCreeps(spawn: StructureSpawn, levelHandler: LevelDefinition, counts: CreepCounts): void {
    if (counts.harvesters < levelHandler.harvesters.max) {
      this.spawnCreep(spawn, [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE], 'Harvester', CreepRoleEnum.HARVESTER);
    } else if (counts.haulers < levelHandler.haulers.max) {
      this.spawnCreep(spawn, [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE], 'Hauler', CreepRoleEnum.HAULER);
    } else if (counts.builders < levelHandler.builders.max) {
      this.spawnCreep(spawn, [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE], 'Builder', CreepRoleEnum.BUILDER);
    } else if (counts.upgraders < levelHandler.upgraders.max) {
      this.spawnCreep(spawn, [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE], 'Upgrader', CreepRoleEnum.UPGRADER);
    }
  }

  /**
   * Handles ultra high energy capacity spawning (550+)
   */
  private handleUltraHighEnergySpawning(spawn: StructureSpawn, levelHandler: LevelDefinition, counts: CreepCounts, enoughCreeps: boolean): void {
    if (!enoughCreeps) {
      debugLog.debug("> 550 not enough creeps");
      if (counts.upgraders < levelHandler.upgraders.min) {
        this.spawnCreep(spawn, [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE], 'Upgrader', CreepRoleEnum.UPGRADER);
      } else if (counts.haulers < levelHandler.haulers.min) {
        this.spawnCreep(spawn, [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE], 'Hauler', CreepRoleEnum.HAULER);
      } else if (counts.harvesters < levelHandler.harvesters.min) {
        this.spawnCreep(spawn, [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE], 'Harvester', CreepRoleEnum.HARVESTER);
      } else if (counts.builders < levelHandler.builders.min) {
        this.spawnCreep(spawn, [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE], 'Builder', CreepRoleEnum.BUILDER);
      }
    } else {
      if (counts.upgraders < levelHandler.upgraders.max) {
        this.spawnCreep(spawn, [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE], 'Upgrader', CreepRoleEnum.UPGRADER);
      } else if (counts.haulers < levelHandler.haulers.max) {
        this.spawnCreep(spawn, [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE], 'Hauler', CreepRoleEnum.HAULER);
      } else if (counts.harvesters < levelHandler.harvesters.max) {
        this.spawnCreep(spawn, [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE], 'Harvester', CreepRoleEnum.HARVESTER);
      } else if (counts.builders < levelHandler.builders.max) {
        this.spawnCreep(spawn, [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE], 'Builder', CreepRoleEnum.BUILDER);
      }
    }
  }

  /**
   * Utility method to spawn a creep with proper naming and memory setup
   * Uses type-safe CreepRole for better type checking
   */
  public spawnCreep(spawn: StructureSpawn, body: BodyPartConstant[], namePrefix: string, role: CreepRole): ScreepsReturnCode {
    const name = `${namePrefix}${Game.time}`;
    const memory: CreepMemory = {
      role,
      room: spawn.room.name,
      working: false
    } as CreepMemory;
    return spawn.spawnCreep(body, name, { memory });
  }

  /**
   * Displays visual indicator for spawning creeps
   */
  public displaySpawningVisual(spawn: StructureSpawn): void {
    if (spawn.spawning) {
      const spawningCreep = Game.creeps[spawn.spawning.name];
      if (spawningCreep) {
        spawn.room.visual.text(
          '🛠️' + spawningCreep.memory.role,
          spawn.pos.x + 1,
          spawn.pos.y,
          { align: 'left', opacity: 0.8 }
        );
      }
    }
  }
}


// Export the singleton instance as default
export default SpawnManager;
