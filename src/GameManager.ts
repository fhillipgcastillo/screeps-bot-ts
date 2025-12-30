import SpawnManager from "./spawn.manager";
import { ManualSpawner, getManualSpawner } from "./manual.spawner";
import { RoleHarvester } from "./role.harvester_stationary";
import { RoleHauler } from "./role.hauler";
import { RoleUpgrader } from "./role.upgrader";
import { RoleBuilder } from "./role.builder";
import { RoleExplorer } from "./role.explorer";
import { RoleDefender } from "./role.defender";
import { RoleRanger } from "./role.ranger";
import { CreepRoleEnum, isValidCreepRole } from "./types";
import { updateVisualOverlay } from "./ui";
import { debugLog } from "./utils/logger";


export class GameManager {
  private gameState: string;
  private isPaused: boolean = false;
  private debug: boolean = false;
  private activeCreeps: Creep[] = [];
  private activeSpawns: StructureSpawn[] = [];
  public spawnManager: SpawnManager;
  public manualSpawner: ManualSpawner;

  // Role handler instances
  private roleHarvester: RoleHarvester;
  private roleHauler: RoleHauler;
  private roleUpgrader: RoleUpgrader;
  private roleBuilder: RoleBuilder;
  private roleExplorer: RoleExplorer;
  private roleDefender: RoleDefender;
  private roleRanger: RoleRanger;

  constructor() {
    this.gameState = "initialized";
    this.spawnManager = new SpawnManager();
    this.manualSpawner = getManualSpawner(this.spawnManager);

    // Initialize role handler instances
    this.roleHarvester = new RoleHarvester();
    this.roleHauler = new RoleHauler();
    this.roleUpgrader = new RoleUpgrader();
    this.roleBuilder = new RoleBuilder();
    this.roleExplorer = new RoleExplorer();
    this.roleDefender = new RoleDefender();
    this.roleRanger = new RoleRanger();

    // Initialize logger with debug state
    debugLog.setDebug(this.debug);
  }

  /**
   * Main game loop method that is called every tick.
   */
  public tick(): void {
    // Check if game is paused - return early if so
    if (this.isPaused) {
      return;
    }

    debugLog.debug(`Current game tick is ${Game.time}`);
    this.syncActiveCreeps();

    this.handleDyingCreeps();
    this.cleanUpMemory();
    // Game.map.visual.text("Target💥", new RoomPosition(10,16,Object.keys(Game.rooms)[0]), {color: '#FF0000', fontSize: 19});

    // auto spawn harvesters
    this.spawnManager.run();

    for (let name in Object.values(Game.spawns)) {
      const spawn = Game.spawns[name];

      // this.handleSafeMode(spawn);

      for (var creepName in this.activeCreeps) {
        var creep = this.activeCreeps[creepName];
        this.runCreep(creep, spawn);
      }
    }

    // Update visual overlay if enabled
    updateVisualOverlay();
  }
  handleSafeMode(spawn: StructureSpawn) {
    if (spawn.room?.controller) {
      // auto activate safe mode
      if (spawn.room.controller.level >= 2 && spawn.room.controller.safeModeAvailable) {
        spawn.room.controller.activateSafeMode();
      }
      // if (spawn.room.controller.level === 3) {
      const towers = spawn.room.find(FIND_STRUCTURES, {
        filter: (c) => c.structureType === STRUCTURE_TOWER
      }) as StructureTower[];
      for (let i in towers) {
        const tower = towers[i];
        if (tower) {
          // heal
          var closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, { filter: (structure) => structure.hits < structure.hitsMax })
          if (closestDamagedStructure) {
            tower.repair(closestDamagedStructure);
          }

          // attack
          var closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
          if (closestHostile) {
            tower.attack(closestHostile);
          }

        }
      }
    }
  }
  runCreep(creep: Creep, spawn: StructureSpawn): void {
    // Validate that the creep has a valid role
    if (!isValidCreepRole(creep.memory.role)) {
      debugLog.error(`Invalid role: ${creep.memory.role} for creep ${creep.name}`);
      return;
    }

    switch (creep.memory.role) {
      case CreepRoleEnum.HARVESTER:
        this.roleHarvester.run(creep);
        break;
      case CreepRoleEnum.HAULER:
        this.roleHauler.run(creep);
        break;
      case CreepRoleEnum.UPGRADER:
        this.roleUpgrader.run(creep);
        break;
      case CreepRoleEnum.BUILDER:
        this.roleBuilder.run(creep);
        break;
      case CreepRoleEnum.DEFENDER:
        this.roleDefender.run(creep);
        break;
      case CreepRoleEnum.RANGER:
        this.roleRanger.run(creep);
        break;
      case CreepRoleEnum.EXPLORER:
        this.roleExplorer.run(creep, spawn);
        break;
      default:
        // This should never happen due to the type guard above, but keeping for safety
        debugLog.error(`Unknown role: ${creep.memory.role}`);
    }
  }
  /**
   * Handles dying creeps - requests replacements and suicides after replacement spawns
   */
  handleDyingCreeps(): void {
    for (const creepName in Game.creeps) {
      const creep = Game.creeps[creepName];
      if (!creep || creep.spawning) {
        continue;
      }

      // Check if creep has less than 30 TTL and needs a replacement
      if (creep.ticksToLive && creep.ticksToLive < 30) {
        // Request replacement if not already requested
        if (!creep.memory.replacementRequested) {
          this.spawnManager.requestReplacement(creep);
        }

        // Suicide if replacement has spawned and is no longer spawning
        if (creep.memory.replacementSpawned && creep.memory.replacementName) {
          const replacement = Game.creeps[creep.memory.replacementName];
          if (replacement && !replacement.spawning) {
            debugLog.info(`${creep.name} suiciding - replacement ${creep.memory.replacementName} has spawned`);
            // Clean up team information before dying
            this.cleanUpCreepFromTeam(creep);
            creep.suicide();
          }
        }
      }
    }
  }

  /**
   * Remove creep from its source team when it dies
   */
  private cleanUpCreepFromTeam(creep: Creep): void {
    if (!creep.memory.sourceId || !Memory.sources) {
      return;
    }

    const sourceId = creep.memory.sourceId as Id<Source>;
    const sourceMemory = Memory.sources[sourceId];

    if (!sourceMemory || !sourceMemory.team) {
      return;
    }

    const team = sourceMemory.team;

    // Remove from harvesters array
    if (team.harvesters && Array.isArray(team.harvesters)) {
      const harvesterIndex = team.harvesters.indexOf(creep.name);
      if (harvesterIndex !== -1) {
        team.harvesters.splice(harvesterIndex, 1);
        debugLog.info(`Cleaned up ${creep.name} from harvesters team at Source${sourceId.slice(-4)}`);
      }
    }

    // Remove from haulers array
    if (team.haulers && Array.isArray(team.haulers)) {
      const haulerIndex = team.haulers.indexOf(creep.name);
      if (haulerIndex !== -1) {
        team.haulers.splice(haulerIndex, 1);
        debugLog.info(`Cleaned up ${creep.name} from haulers team at Source${sourceId.slice(-4)}`);
      }
    }

    // Remove from queue if present
    if (sourceMemory.queue && sourceMemory.queue.order && Array.isArray(sourceMemory.queue.order)) {
      const queueIndex = sourceMemory.queue.order.indexOf(creep.name);
      if (queueIndex !== -1) {
        sourceMemory.queue.order.splice(queueIndex, 1);
        debugLog.info(`Removed ${creep.name} from queue at Source${sourceId.slice(-4)}`);
      }
    }
  }

  cleanUpMemory() {
    for (var creepName in Memory.creeps) {
      if (!Game.creeps[creepName]) {
        // Creep is dead, clean it from team structures
        this.cleanUpDeadCreepFromTeams(creepName);
        delete Memory.creeps[creepName];
        debugLog.debug('Clearing non-existing creep memory:', creepName);
      }
    }
  }

  /**
   * Remove dead creep from all team structures in Memory.sources
   */
  private cleanUpDeadCreepFromTeams(deadCreepName: string): void {
    if (!Memory.sources) return;

    for (const sourceId in Memory.sources) {
      const sourceMemory = Memory.sources[sourceId];
      if (!sourceMemory || !sourceMemory.team) continue;

      const team = sourceMemory.team;

      // Remove from harvesters array
      if (team.harvesters && Array.isArray(team.harvesters)) {
        const harvesterIndex = team.harvesters.indexOf(deadCreepName);
        if (harvesterIndex !== -1) {
          team.harvesters.splice(harvesterIndex, 1);
          debugLog.debug(`Cleaned up dead ${deadCreepName} from harvesters team at Source${sourceId.slice(-4)}`);
        }
      }

      // Remove from haulers array
      if (team.haulers && Array.isArray(team.haulers)) {
        const haulerIndex = team.haulers.indexOf(deadCreepName);
        if (haulerIndex !== -1) {
          team.haulers.splice(haulerIndex, 1);
          debugLog.debug(`Cleaned up dead ${deadCreepName} from haulers team at Source${sourceId.slice(-4)}`);
        }
      }

      // Remove from queue if present
      if (sourceMemory.queue && sourceMemory.queue.order && Array.isArray(sourceMemory.queue.order)) {
        const queueIndex = sourceMemory.queue.order.indexOf(deadCreepName);
        if (queueIndex !== -1) {
          sourceMemory.queue.order.splice(queueIndex, 1);
          debugLog.debug(`Removed dead ${deadCreepName} from queue at Source${sourceId.slice(-4)}`);
        }
      }
    }
  }

  public getActiveScreeps(): Creep[] {
    return this.activeCreeps || [];
  }
  public getActiveSpawns(): StructureSpawn[] {
    return this.activeSpawns || [];
  }

  syncActiveCreeps(): void {
    this.activeCreeps = _.filter(Game.creeps, ((creep: Creep) => !creep.spawning));
  }

  // ============================================================================
  // PAUSE/RESUME FUNCTIONALITY
  // ============================================================================

  /**
   * Pause the game loop - stops all tick execution
   */
  public pauseGame(): void {
    this.isPaused = true;
    debugLog.force("🛑 Game paused - bot operations stopped");
  }

  /**
   * Resume the game loop - allows tick execution to continue
   */
  public resumeGame(): void {
    this.isPaused = false;
    debugLog.force("▶️ Game resumed - bot operations continuing");
  }

  /**
   * Toggle the pause state of the game
   */
  public togglePause(): void {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      debugLog.force("🛑 Game paused - bot operations stopped");
    } else {
      debugLog.force("▶️ Game resumed - bot operations continuing");
    }
  }

  /**
   * Check if the game is currently paused
   */
  public isGamePaused(): boolean {
    return this.isPaused;
  }

  // ============================================================================
  // DEBUG LOGGING FUNCTIONALITY
  // ============================================================================

  /**
   * Enable debug logging - shows debug messages in terminal
   */
  public enableDebug(): void {
    this.debug = true;
    debugLog.setDebug(true);
    console.log("🐛 Debug logging enabled - terminal output active");
  }

  /**
   * Disable debug logging - hides debug messages from terminal
   */
  public disableDebug(): void {
    this.debug = false;
    debugLog.setDebug(false);
    console.log("🔇 Debug logging disabled - terminal output muted");
  }

  /**
   * Toggle debug logging state
   */
  public toggleDebug(): void {
    this.debug = !this.debug;
    debugLog.setDebug(this.debug);
    if (this.debug) {
      console.log("🐛 Debug logging enabled - terminal output active");
    } else {
      console.log("🔇 Debug logging disabled - terminal output muted");
    }
  }

  /**
   * Check if debug logging is currently enabled
   */
  public isDebugEnabled(): boolean {
    return this.debug;
  }

  /**
   * Get the logger instance for direct access
   */
  public getLogger() {
    return debugLog;
  }
}

