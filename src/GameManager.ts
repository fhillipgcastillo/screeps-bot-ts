import SpawnManager from "./spawn.manager";
import { ManualSpawner, getManualSpawner } from "./manual.spawner";
import roleHarvester from "./role.harvester_stationary";
import roleHauler from "./role.hauler";
import roleUpgrader from "./role.upgrader";
import roleBuilder from "./role.builder";
import roleExplorer from "role.explorer";
import roleDefender from "role.defender";
import roleRanger from "role.ranger";
import { CreepRoleEnum, isValidCreepRole } from "./types";
import { updateVisualOverlay } from "./ui";
import { logger, debugLog } from "./utils/Logger";
import { MULTI_ROOM_CONFIG } from "./config/multi-room.config";
import { cleanupRoomCaches, updateRoomSafetyCache } from "./utils/room-safety";
import { clearResourceCache, updateResourceDiscoveryCache } from "./utils/multi-room-resources";
import { logPerformanceStats, monitorMultiRoomPerformance } from "./utils/multi-room-debug";


export class GameManager {
  private gameState: string;
  private isPaused: boolean = false;
  private debug: boolean = false;
  private activeCreeps: Creep[] = [];
  private activeSpawns: StructureSpawn[] = [];
  public spawnManager: SpawnManager;
  public manualSpawner: ManualSpawner;

  constructor() {
    this.gameState = "initialized";
    this.spawnManager = new SpawnManager();
    this.manualSpawner = getManualSpawner(this.spawnManager);

    // Initialize logger with debug state
    logger.setDebug(this.debug);

    // Initialize multi-room system
    this.initializeMultiRoomSystem();
  }

  /**
   * Initializes the multi-room system and validates configuration
   */
  private initializeMultiRoomSystem(): void {
    if (MULTI_ROOM_CONFIG.enabled) {
      // Validate configuration
      const { validateMultiRoomConfig } = require('./config/multi-room.config');
      const isValid = validateMultiRoomConfig();

      if (!isValid) {
        logger.warn('Multi-room configuration validation failed - some features may not work correctly');
      } else if (MULTI_ROOM_CONFIG.debugEnabled) {
        logger.info('Multi-room system initialized successfully');
      }
    }
  }

  /**
   * Main game loop method that is called every tick.
   */
  public tick(): void {
    // Check if game is paused - return early if so
    if (this.isPaused) {
      return;
    }

    logger.debug(`Current game tick is ${Game.time}`);
    this.syncActiveCreeps();

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

    // Monitor multi-room performance and log stats
    if (MULTI_ROOM_CONFIG.enabled) {
      logPerformanceStats();

      // Check for performance issues
      const metrics = monitorMultiRoomPerformance();
      if (metrics.cpuUsage > MULTI_ROOM_CONFIG.maxCpuUsage) {
        logger.warn(`Multi-room CPU usage high: ${metrics.cpuUsage.toFixed(2)} (limit: ${MULTI_ROOM_CONFIG.maxCpuUsage})`);
      }
    }
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
      logger.error(`Invalid role: ${creep.memory.role} for creep ${creep.name}`);
      return;
    }

    switch (creep.memory.role) {
      case CreepRoleEnum.HARVESTER:
        roleHarvester.run(creep);
        break;
      case CreepRoleEnum.HAULER:
        roleHauler.run(creep);
        break;
      case CreepRoleEnum.UPGRADER:
        roleUpgrader.run(creep);
        break;
      case CreepRoleEnum.BUILDER:
        roleBuilder.run(creep);
        break;
      case CreepRoleEnum.DEFENDER:
        roleDefender.run(creep);
        break;
      case CreepRoleEnum.RANGER:
        roleRanger.run(creep);
        break;
      case CreepRoleEnum.EXPLORER:
        roleExplorer.run(creep, spawn);
        break;
      default:
        // This should never happen due to the type guard above, but keeping for safety
        logger.error(`Unknown role: ${creep.memory.role}`);
    }
  }
  cleanUpMemory() {
    // Clean up dead creep memory
    for (var creepName in Memory.creeps) {
      if (!Game.creeps[creepName]) {
        delete Memory.creeps[creepName];
        logger.debug('Clearing non-existing creep memory:', creepName);
      }
    }

    // Clean up multi-room memory periodically
    if (MULTI_ROOM_CONFIG.enabled && Game.time % 100 === 0) {
      this.cleanUpMultiRoomMemory();
    }
  }

  /**
   * Cleans up multi-room memory structures
   */
  private cleanUpMultiRoomMemory(): void {
    try {
      // Update room safety cache
      updateRoomSafetyCache();

      // Clean up expired room caches
      cleanupRoomCaches();

      // Update resource discovery cache
      updateResourceDiscoveryCache();

      // Validate and migrate creep multi-room memory
      this.validateCreepMultiRoomMemory();

      if (MULTI_ROOM_CONFIG.debugEnabled) {
        debugLog.debug('Multi-room memory cleanup completed');
      }
    } catch (error) {
      logger.error('Error during multi-room memory cleanup:', error);
    }
  }

  /**
   * Validates and migrates creep multi-room memory structures
   */
  private validateCreepMultiRoomMemory(): void {
    Object.values(Game.creeps).forEach(creep => {
      if (creep.memory.role === 'harvester' || creep.memory.role === 'hauler') {
        // Initialize multi-room memory if missing
        if (!creep.memory.multiRoom && MULTI_ROOM_CONFIG.enabled) {
          creep.memory.multiRoom = {
            enabled: MULTI_ROOM_CONFIG.enabled,
            homeRoom: creep.room.name,
            isMultiRoom: creep.memory.role === 'harvester' ? false : false,
            isReturningHome: creep.memory.role === 'hauler' ? false : undefined,
            failureCount: 0
          };
        }

        // Reset failure count if it's too high
        if (creep.memory.multiRoom && creep.memory.multiRoom.failureCount > MULTI_ROOM_CONFIG.maxFailures * 2) {
          creep.memory.multiRoom.failureCount = 0;
          debugLog.debug(`Reset failure count for ${creep.name}`);
        }

        // Clean up stale room transition data
        if (creep.memory.multiRoom?.roomTransitionStartTick) {
          const transitionAge = Game.time - creep.memory.multiRoom.roomTransitionStartTick;
          if (transitionAge > MULTI_ROOM_CONFIG.roomTransitionTimeout * 2) {
            creep.memory.multiRoom.roomTransitionStartTick = undefined;
            creep.memory.multiRoom.targetRoom = undefined;
            debugLog.debug(`Cleaned up stale transition data for ${creep.name}`);
          }
        }
      }
    });
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
    logger.force("🛑 Game paused - bot operations stopped");
  }

  /**
   * Resume the game loop - allows tick execution to continue
   */
  public resumeGame(): void {
    this.isPaused = false;
    logger.force("▶️ Game resumed - bot operations continuing");
  }

  /**
   * Toggle the pause state of the game
   */
  public togglePause(): void {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      logger.force("🛑 Game paused - bot operations stopped");
    } else {
      logger.force("▶️ Game resumed - bot operations continuing");
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
    logger.setDebug(true);
    console.log("🐛 Debug logging enabled - terminal output active");
  }

  /**
   * Disable debug logging - hides debug messages from terminal
   */
  public disableDebug(): void {
    this.debug = false;
    logger.setDebug(false);
    console.log("🔇 Debug logging disabled - terminal output muted");
  }

  /**
   * Toggle debug logging state
   */
  public toggleDebug(): void {
    this.debug = !this.debug;
    logger.setDebug(this.debug);
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
    return logger;
  }
}

