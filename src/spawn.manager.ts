import { levelDefinitions, LevelDefinition } from "./levels.handler";
import { CreepRole, CreepRoleEnum, getCreepsByRole } from "./types";
import { debugLog } from "./utils/logger";

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
 * Interface for replacement spawn requests
 */
interface ReplacementRequest {
  role: CreepRole;
  dyingCreepName: string;
  body: BodyPartConstant[];
}

/**
 * SpawnManager class responsible for managing creep spawning across all spawns
 * Implements object-oriented design principles with proper encapsulation and separation of concerns
 */
export class SpawnManager {
  private static readonly DEBUG_INTERVAL = 5;
  private static readonly MINIMUM_HARVESTERS_THRESHOLD = 2;
  private static readonly MINIMUM_HAULERS_THRESHOLD = 4;
  private static readonly MINIMUM_CONTROLLER_LEVEL_FOR_ADVANCED = 2;
  private static readonly DYING_THRESHOLD = 30;

  // Track replacement requests
  private replacementRequests: ReplacementRequest[] = [];

  /**
   * Request a replacement creep for a dying creep
   */
  public requestReplacement(creep: Creep): void {
    if (!creep.memory.replacementRequested) {
      const body = creep.body.map(part => part.type);
      this.replacementRequests.push({
        role: creep.memory.role,
        dyingCreepName: creep.name,
        body: body
      });
      creep.memory.replacementRequested = true;
      debugLog.info(`Replacement requested for dying ${creep.memory.role}: ${creep.name}`);
    }
  }

  /**
   * Main entry point for spawn management - processes all spawns in the game
   */
  public run(): void {
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
    const availableEnergy = spawn.room.energyAvailable; // room's current available energy
    const energyCapacity = spawn.room.energyCapacityAvailable; // room's maximum energy capacity
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
      debugLog.info(`Room Energy ${context.availableEnergy}/${context.energyCapacity}`);
      debugLog.info(`Enough creeps: ${context.enoughCreeps}`);
      debugLog.info(`Harvesters: ${context.creepCounts.harvesters}`);
      debugLog.info(`Haulers: ${context.creepCounts.haulers}`);
      debugLog.info(`Builders: ${context.creepCounts.builders}`);
      debugLog.info(`Upgraders: ${context.creepCounts.upgraders}`);
      debugLog.info(`Defenders: ${context.creepCounts.defenders}`);
      debugLog.info(`Rangers: ${context.creepCounts.rangers}`);
    }
  }

  /**
   * Main spawning logic dispatcher
   */
  private handleSpawning(context: SpawnContext): void {
    // Check if spawn is already spawning before attempting any spawn operations
    if (context.spawn.spawning) {
      return;
    }

    // Priority 1: Handle replacement requests first
    if (this.replacementRequests.length > 0) {
      const handled = this.handleReplacementSpawning(context.spawn);
      if (handled) {
        return;
      }
    }

    // Tiga's spawn sequence per source: H → U → H → U → U → U
    // This pattern repeats for each energy source for optimal early game progression
    // With 2 sources: H,U,H,U,U,U (source 1) then H,U,H,U,U,U (source 2)
    const { spawn, creepCounts, availableEnergy } = context;

    // Spawn pattern: H → U → H → U → U → U per source
    // Total creeps before pattern repeats: 6 per source (2H + 4U)
    const totalCreeps = creepCounts.harvesters + creepCounts.haulers;
    const sourcesCount = spawn.room.find(FIND_SOURCES).length;
    const creepsPerSourceTeam = 6; // 2 Harvesters + 4 Haulers

    // Determine what to spawn based on pattern position
    if (totalCreeps < sourcesCount * creepsPerSourceTeam) {
      const patternPosition = totalCreeps % creepsPerSourceTeam; // 0-5

      switch (patternPosition) {
        // Position 0 & 2: Harvester (H at 0, H at 2)
        case 0:
        case 2:
          if (availableEnergy >= 200) {
            this.spawnCreep(spawn, [WORK, WORK, MOVE], 'Harvester', CreepRoleEnum.HARVESTER);
            return;
          }
          break;
        // Position 1, 3, 4, 5: Hauler (U at 1, 3, 4, 5)
        case 1:
        case 3:
        case 4:
        case 5:
          if (availableEnergy >= 150) {
            this.spawnCreep(spawn, [CARRY, MOVE, MOVE], 'Hauler', CreepRoleEnum.HAULER);
            return;
          }
          break;
      }
    }

    // If all teams are not complete, don't proceed to builders/upgraders
    if (!this.areAllTeamsComplete(spawn.room)) {
      return;
    }

    // Handle advanced spawning for level 2+ rooms
    if (context.currentLevel >= SpawnManager.MINIMUM_CONTROLLER_LEVEL_FOR_ADVANCED) {
      if (context.enemiesInRoom.length > 0) {
        this.handleDefensiveSpawning(context);
      } else {
        this.handleAdvancedSpawning(context);
      }
    }
  }

  /**
   * Checks if all source teams are complete (have all required members)
   * Returns false if any team is missing harvesters or haulers
   */
  private areAllTeamsComplete(room: Room): boolean {
    const sources = room.find(FIND_SOURCES);
    if (sources.length === 0) return true;

    if (!Memory.sources) return false;

    for (const source of sources) {
      const sourceMemory = Memory.sources[source.id];
      if (!sourceMemory || !sourceMemory.team) {
        return false; // Team structure not yet initialized
      }

      const team = sourceMemory.team;
      const harvestersReady = team.harvesters && team.harvesters.length === 2;
      const haulersReady = team.haulers && team.haulers.length === 4;

      // Check if team is missing members
      if (!harvestersReady || !haulersReady) {
        debugLog.debug(`Team at Source${source.id.slice(-4)} incomplete: ${team.harvesters?.length || 0}/2 H, ${team.haulers?.length || 0}/4 U`);
        return false;
      }
    }

    return true;
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

    const result = spawn.spawnCreep(body, name, { memory });

    // Assign creep to a source team if it's a harvester or hauler (Phase 4)
    if (result === OK && (role === CreepRoleEnum.HARVESTER || role === CreepRoleEnum.HAULER)) {
      const newCreep = Game.creeps[name];
      if (newCreep) {
        this.assignCreepToSourceTeam(newCreep, role);
      }
    }

    return result;
  }

  /**
   * Assigns a newly spawned harvester or hauler to a source team
   * Tracks team composition in Memory.sources[sourceId].team
   *
   * Harvester assignment: 2 per source (fill one source completely before moving to next)
   * Hauler assignment: 4 per source (only to sources with harvesters), picks source with fewest haulers
   */
  private assignCreepToSourceTeam(creep: Creep, role: CreepRole): void {
    const sources = creep.room.find(FIND_SOURCES);
    if (sources.length === 0) return;

    if (!Memory.sources) Memory.sources = {};

    let targetSourceId: string | undefined;

    if (role === CreepRoleEnum.HARVESTER) {
      // Assign harvester: 2 per source, fill one source completely before moving to next
      // Iterate sources in order and pick the first source with < 2 harvesters
      for (const source of sources) {
        if (!Memory.sources[source.id]) {
          Memory.sources[source.id] = { queue: { order: [], accumulation: 0 }, team: { harvesters: [], haulers: [], maxHaulers: 4 } };
        }
        const team = Memory.sources[source.id].team;
        if (!team.harvesters) team.harvesters = [];

        // Assign to first source not yet full (< 2 harvesters)
        if (team.harvesters.length < 2) {
          targetSourceId = source.id;
          break; // Use first available source, don't search further
        }
      }
    } else if (role === CreepRoleEnum.HAULER) {
      // Assign hauler: ONLY to sources that have harvesters, max 4 per source
      // Pick the source with fewest haulers (among those with harvesters)
      let minHaulers = Infinity;
      for (const source of sources) {
        if (!Memory.sources[source.id]) {
          Memory.sources[source.id] = { queue: { order: [], accumulation: 0 }, team: { harvesters: [], haulers: [], maxHaulers: 4 } };
        }
        const team = Memory.sources[source.id].team;
        if (!team.harvesters) team.harvesters = [];
        if (!team.haulers) team.haulers = [];

        // Only assign to sources with harvesters AND less than 4 haulers
        if (team.harvesters.length > 0 && team.haulers.length < 4 && team.haulers.length < minHaulers) {
          minHaulers = team.haulers.length;
          targetSourceId = source.id;
        }
      }
    }

    if (targetSourceId) {
      creep.memory.sourceId = targetSourceId;
      const team = Memory.sources[targetSourceId].team;

      if (role === CreepRoleEnum.HARVESTER) {
        if (!team.harvesters) team.harvesters = [];
        team.harvesters.push(creep.name);
        debugLog.info(`${creep.name} (Harvester) assigned to Source${targetSourceId.slice(-4)} - [${team.harvesters.length}/2]`);
      } else if (role === CreepRoleEnum.HAULER) {
        if (!team.haulers) team.haulers = [];
        team.haulers.push(creep.name);
        debugLog.info(`${creep.name} (Hauler) assigned to Source${targetSourceId.slice(-4)} - [${team.haulers.length}/4]`);
      }
    } else {
      debugLog.warn(`Could not assign ${role} - no available sources (check team conditions)`);
    }
  }

  /**
   * Handles spawning of replacement creeps
   */
  private handleReplacementSpawning(spawn: StructureSpawn): boolean {
    if (this.replacementRequests.length === 0) {
      return false;
    }

    const request = this.replacementRequests[0];
    const name = `${request.role.charAt(0).toUpperCase() + request.role.slice(1)}${Game.time}`;
    const memory: CreepMemory = {
      role: request.role,
      room: spawn.room.name,
      working: false
    } as CreepMemory;

    const result = spawn.spawnCreep(request.body, name, { memory });

    if (result === OK) {
      debugLog.info(`Spawning replacement ${request.role}: ${name} for ${request.dyingCreepName}`);
      // Mark the dying creep that replacement has spawned
      const dyingCreep = Game.creeps[request.dyingCreepName];
      if (dyingCreep) {
        dyingCreep.memory.replacementSpawned = true;
        dyingCreep.memory.replacementName = name;
      }
      // Remove the request from the queue
      this.replacementRequests.shift();
      return true;
    } else if (result === ERR_NOT_ENOUGH_ENERGY) {
      // Wait for more energy, keep the request in queue
      return false;
    } else {
      // Remove invalid requests
      debugLog.error(`Failed to spawn replacement for ${request.dyingCreepName}: ${result}`);
      this.replacementRequests.shift();
      return false;
    }
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
