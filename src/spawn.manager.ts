import { levelDefinitions, LevelDefinition } from "./levels.handler";
import { CreepRole, CreepRoleEnum, getCreepsByRole } from "./types";
import { debugLog, logger } from "./utils/Logger";
import {
  selectBestTemplate,
  canSafelySpawn,
  isInRecoveryMode,
  getEnergyReserveThreshold,
  updateContainerCache,
  getCachedContainers,
  getCurrentSpawnTier
} from "./utils/energy-bootstrap";
import { initializeMemoryHelpers, runConditionalCleanup } from "./utils/memoryHelpers";

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
  explorers: number;
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
 * Implements tiered spawn templates and energy reserves for robust early-game recovery
 */
export class SpawnManager {
  private static readonly DEBUG_INTERVAL = 5;
  private static readonly MINIMUM_HARVESTERS_THRESHOLD = 3;
  private static readonly MINIMUM_HAULERS_THRESHOLD = 4;
  private static readonly MINIMUM_CONTROLLER_LEVEL_FOR_ADVANCED = 2;

  private autoSpawnEnabled: boolean = true;
  private spawnPaused: boolean = false;

  /**
   * Constructor - initialize memory helpers and container caching systems
   */
  public constructor() {
    initializeMemoryHelpers();
  }

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
    if (!this.autoSpawnEnabled || this.spawnPaused) {
      return;
    }

    // Run conditional memory garbage collection
    const cleanupStats = runConditionalCleanup();
    if (cleanupStats) {
      debugLog.debug(`Memory cleanup: checked ${cleanupStats.creepsChecked}, removed ${cleanupStats.invalidCreepsRemoved} invalid`);
    }

    const globalCreepCounts = this.getGlobalCreepCounts();

    for (const spawnName in Game.spawns) {
      const spawn = Game.spawns[spawnName];
      if (spawn) {
        // Update container cache for this room
        updateContainerCache(spawn.room.name);
        this.processSpawn(spawn, globalCreepCounts);
      }
    }
  }

  /**
   * Pause spawning (active creeps continue executing their tasks)
   */
  public pauseSpawning(): void {
    this.spawnPaused = true;
    console.log('Spawning paused - active creeps continue');
  }

  /**
   * Resume spawning
   */
  public resumeSpawning(): void {
    this.spawnPaused = false;
    console.log('Spawning resumed');
  }

  /**
   * Toggle spawning pause state
   */
  public toggleSpawning(): boolean {
    this.spawnPaused = !this.spawnPaused;
    console.log(`Spawning ${this.spawnPaused ? 'paused' : 'resumed'}`);
    return this.spawnPaused;
  }

  /**
   * Check if spawning is currently paused
   */
  public isSpawningPaused(): boolean {
    return this.spawnPaused;
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
      rangers: getCreepsByRole(CreepRoleEnum.RANGER).length,
      explorers: getCreepsByRole(CreepRoleEnum.EXPLORER).length
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
      && counts.builders >= levelHandler.builders.min
      && counts.explorers >= levelHandler.explorers.min;
  }

  /**
   * Logs debug information about the current spawn state
   */
  public logDebugInfo(context: SpawnContext): void {
    if (Game.time % SpawnManager.DEBUG_INTERVAL === 0) {
      debugLog.debug(`Room Energy ${context.availableEnergy}/${context.energyCapacity}`);
      // debugLog.debug(`Spawn Tier: ${getCurrentSpawnTier(context.spawn.room, context.creepCounts.harvesters, context.creepCounts.haulers)}`);
      debugLog.debug(`Enough creeps: ${context.enoughCreeps}`);
      debugLog.debug(`Harvesters: ${context.creepCounts.harvesters}`);
      debugLog.debug(`Haulers: ${context.creepCounts.haulers}`);
      debugLog.debug(`Builders: ${context.creepCounts.builders}`);
      debugLog.debug(`Upgraders: ${context.creepCounts.upgraders}`);
      debugLog.debug(`Defenders: ${context.creepCounts.defenders}`);
      debugLog.debug(`Rangers: ${context.creepCounts.rangers}`);
      debugLog.debug(`Explorers: ${context.creepCounts.explorers}`);
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
   * Uses creep count-based emergency tier for fast recovery (harvesters < 2 OR haulers < 2)
   */
  private handleInitialSpawning(context: SpawnContext): void {
    const { spawn, levelHandler, creepCounts, availableEnergy, enoughCreeps } = context;
    const currentLevel = context.currentLevel;
    const inRecovery = isInRecoveryMode(spawn, creepCounts.harvesters);

    // CRITICAL: Emergency tier is based on CREEP COUNT, not energy
    // Force emergency tier (small bodies) if harvesters < 2 OR haulers < 2
    const forceEmergency = creepCounts.harvesters <= 2 || creepCounts.haulers <= 2;

    // Determine what to spawn based on priorities
    const spawnRole = this.getPrioritySpawnRole(creepCounts, levelHandler, enoughCreeps);

    if (spawnRole) {
      // Select template based on emergency or recovery mode
      const template = selectBestTemplate(availableEnergy, spawnRole, currentLevel, inRecovery, forceEmergency);

      if (template && canSafelySpawn(spawn, template, currentLevel)) {
        const result = this.spawnCreepWithTemplate(spawn, spawnRole, template);
        if (result !== OK) {
          debugLog.warn(`Failed to spawn ${spawnRole}: ${result}`);
        } else if (forceEmergency) {
          debugLog.debug(`[EMERGENCY] Spawned ${spawnRole} with small body (creep count < 2)`);
        }
        console.log(`Spawned ${spawnRole} using template ${template.tier} and resulted in code ${result}`);
      } else {
        console.log(`Cannot safely spawn ${spawnRole} at this time.`);
      }
    }
  }

  /**
   * Determine the priority role to spawn based on current needs
   * Returns the most critical missing role, or null if everything is satisfied
   *
   * BOOTSTRAP PRIORITY (when harvesters=0 and haulers=0):
   * 1. First harvester (to generate energy)
   * 2. First hauler (to transport energy efficiently)
   * 3. Then apply normal priority logic with energy reserves
   */
  private getPrioritySpawnRole(
    counts: CreepCounts,
    levelHandler: LevelDefinition,
    enoughCreeps: boolean
  ): CreepRole | null {
    // BOOTSTRAP: If we have zero workforce, prioritize harvester first
    if (counts.harvesters === 0) {
      return "harvester";
    }

    // BOOTSTRAP: If we have harvester but no hauler, prioritize hauler
    if (counts.haulers === 0) {
      return "hauler";
    }
    // Critical: scale harvesters to minimum after bootstrap
    if (counts.harvesters < levelHandler.harvesters.min) {
      return "harvester";
    }

    // Critical: scale haulers to minimum after bootstrap
    if (counts.haulers < levelHandler.haulers.min) {
      return "hauler";
    }

    // Important: builders for infrastructure
    if (counts.builders < levelHandler.builders.min) {
      return "builder";
    }

    // Important: upgraders for controller
    if (counts.upgraders < levelHandler.upgraders.min) {
      return "upgrader";
    }

    // Important: explorers for room scouting
    if (counts.explorers < levelHandler.explorers.min) {
      return "explorer";
    }

    // If we have minimums, scale up if not at max
    if (enoughCreeps) {
      if (counts.harvesters < levelHandler.harvesters.max) {
        return "harvester";
      }
      if (counts.haulers < levelHandler.haulers.max) {
        return "hauler";
      }
      if (counts.builders < levelHandler.builders.max) {
        return "builder";
      }
      if (counts.upgraders < levelHandler.upgraders.max) {
        return "upgrader";
      }
      if (counts.explorers < levelHandler.explorers.max) {
        return "explorer";
      }
    }

    return null;
  }

  /**
   * Spawns a creep using a tiered template for optimal body composition
   */
  private spawnCreepWithTemplate(spawn: StructureSpawn, role: CreepRole, template: any): ScreepsReturnCode {
    const name = `${role.charAt(0).toUpperCase() + role.slice(1)}${Game.time}`;
    const memory: CreepMemory = {
      role,
      room: spawn.room.name,
      working: false
    } as CreepMemory;

    const result = spawn.spawnCreep(template.body, name, { memory });

    if (result === OK) {
      debugLog.debug(`Spawned ${role} with template ${template.tier}: ${name} (${template.energyCost} energy)`);
    }

    return result;
  }

  /**
   * Spawn a minimal emergency creep (1 WORK + 1 MOVE + 1 CARRY = 200 energy)
   * Used as last-resort fallback when in recovery mode
   */
  private spawnEmergencyCreep(spawn: StructureSpawn, role: CreepRole): ScreepsReturnCode {
    const name = `${role.charAt(0).toUpperCase() + role.slice(1)}${Game.time}`;
    const memory: CreepMemory = {
      role,
      room: spawn.room.name,
      working: false
    } as CreepMemory;

    // Emergency body: always 1 WORK + 1 MOVE + 1 CARRY regardless of role
    const emergencyBody = [WORK, MOVE, CARRY];
    const result = spawn.spawnCreep(emergencyBody, name, { memory });

    if (result === OK) {
      debugLog.warn(`[RECOVERY] Spawned emergency ${role}: ${name}`);
    }

    return result;
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
   * Handles advanced spawning for level 2+ rooms with tiered template-based logic
   */
  private handleAdvancedSpawning(context: SpawnContext): void {
    const { spawn, levelHandler, creepCounts, availableEnergy, energyCapacity, enoughCreeps } = context;
    const currentLevel = context.currentLevel;

    // Check if we need emergency tier based on creep count
    const forceEmergency = creepCounts.harvesters < 2 || creepCounts.haulers < 2;

    // Get priority role to spawn
    const spawnRole = this.getPrioritySpawnRole(creepCounts, levelHandler, enoughCreeps);

    if (!spawnRole) {
      return; // No more creeps needed
    }

    // Select best template based on available energy
    const template = selectBestTemplate(availableEnergy, spawnRole, currentLevel, false, forceEmergency);

    if (template && canSafelySpawn(spawn, template, currentLevel)) {
      this.spawnCreepWithTemplate(spawn, spawnRole, template);
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
