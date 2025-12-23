import SpawnManager from "./spawn.manager";
import { ManualSpawner, getManualSpawner } from "./manual.spawner";
import { HarvesterCreep } from "./role.harvester_stationary";
import { HaulerCreep } from "./role.hauler";
import { UpgraderCreep } from "./role.upgrader";
import { BuilderCreep } from "./role.builder";
import { ExplorerCreep } from "./role.explorer";
import { DefenderCreep } from "./role.defender";
import { RangerCreep } from "./role.ranger";
import { CreepRoleEnum, isValidCreepRole, SmartCreep, CreepRole } from "./types";
import { updateVisualOverlay } from "./ui";
import { Logger, debugLog } from "./utils/Logger";
import { MULTI_ROOM_CONFIG, validateMultiRoomConfig } from "./config/multi-room.config";
import { cleanupRoomCaches, updateRoomSafetyCache } from "./utils/room-safety";
import { clearResourceCache, updateResourceDiscoveryCache } from "./utils/multi-room-resources";
import { logPerformanceStats, monitorMultiRoomPerformance } from "./utils/multi-room-debug";

// this avoid multiple logger instances
const logger = Logger.getInstance();

export class GameManager {
  private gameState: string;
  private isPaused: boolean = false;
  private debug: boolean = false;
  private activeCreeps: Creep[] = [];
  private activeSpawns: StructureSpawn[] = [];
  private creepInstances: Map<string, SmartCreep> = new Map();
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
    // Note: spawning pause is handled by SpawnManager; creeps should continue executing

    logger.debug(`Current game tick is ${Game.time}`);
    this.syncActiveCreeps();

    this.cleanUpMemory();
    // Game.map.visual.text("Target💥", new RoomPosition(10,16,Object.keys(Game.rooms)[0]), {color: '#FF0000', fontSize: 19});

    // auto spawn harvesters (SpawnManager respects spawn-pause state)
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

    // Periodically update room discovery list
    if (MULTI_ROOM_CONFIG.enabled && Game.time % 100 === 0) {
      this.updateRoomDiscoveryList();
    }
  }

  /**
   * Discover adjacent rooms from claimed rooms and update Memory.rooms
   */
  private updateRoomDiscoveryList(): void {
    try {
      if (!Memory.rooms) Memory.rooms = {} as any;

      // Start from claimed rooms (if none, use home rooms)
      const claimedRooms = Object.keys(Memory.rooms).filter(r => Memory.rooms[r].claimed);
      const sourceRooms = claimedRooms.length > 0 ? claimedRooms : Object.keys(Game.rooms);

      for (const baseRoom of sourceRooms) {
        const exits = Game.map.describeExits(baseRoom) as Record<string, string> | null;
        if (exits) {
          const exitKeys = Object.keys(exits);
          for (const dir of exitKeys) {
            const adj = exits[dir];
            if (!Memory.rooms[adj]) {
              Memory.rooms[adj] = { discovered: true, discoveredAt: Game.time, discoveredFrom: baseRoom } as any;
            }
          }
        }
      }

      // Re-enable rooms marked unsafe after TTL
      for (const roomName in Memory.rooms) {
        const data = Memory.rooms[roomName] as any;
        if (data.unsafe && data.unsafeUntil && Game.time > data.unsafeUntil) {
          data.unsafe = false;
          data.unsafeReason = undefined;
          if (MULTI_ROOM_CONFIG.debugEnabled) debugLog.debug(`Re-enabled evaluation for ${roomName}`);
        }
      }
    } catch (e) {
      logger.error('updateRoomDiscoveryList error:', e);
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

  /**
   * Factory method to create role-specific creep instances
   * @param creep - The creep to create an instance for
   * @returns New SmartCreep instance for the creep's role
   */
  private createCreepInstance(creep: Creep): SmartCreep {
    switch (creep.memory.role) {
      case CreepRoleEnum.HARVESTER:
        return new HarvesterCreep(creep);
      case CreepRoleEnum.HAULER:
        return new HaulerCreep(creep);
      case CreepRoleEnum.UPGRADER:
        return new UpgraderCreep(creep);
      case CreepRoleEnum.BUILDER:
        return new BuilderCreep(creep);
      case CreepRoleEnum.DEFENDER:
        return new DefenderCreep(creep);
      case CreepRoleEnum.RANGER:
        return new RangerCreep(creep);
      case CreepRoleEnum.EXPLORER:
        return new ExplorerCreep(creep);
      default:
        logger.error(`Cannot create instance for unknown role: ${creep.memory.role}`);
        // Fallback to base SmartCreep
        return new SmartCreep(creep);
    }
  }

  runCreep(creep: Creep, spawn: StructureSpawn): void {
    // Validate that the creep has a valid role
    if (!isValidCreepRole(creep.memory.role)) {
      logger.error(`Invalid role: ${creep.memory.role} for creep ${creep.name}`);
      return;
    }

    // Get or create cached instance for this creep
    let instance = this.creepInstances.get(creep.name);
    if (!instance) {
      instance = this.createCreepInstance(creep);
      this.creepInstances.set(creep.name, instance);
      debugLog.debug(`Created new instance for ${creep.name} (${creep.memory.role})`);
    }

    // Execute role behavior using cached instance
    instance.run();
  }
  cleanUpMemory() {
    // Clean up dead creep memory and cached instances
    for (var creepName in Memory.creeps) {
      if (!Game.creeps[creepName]) {
        delete Memory.creeps[creepName];
        this.creepInstances.delete(creepName);
        logger.debug('Clearing non-existing creep memory:', creepName);
      }
    }

    // Orphan cleanup: remove cached instances for non-existent creeps every 25 ticks
    if (Game.time % 25 === 0) {
      const orphanedInstances: string[] = [];
      this.creepInstances.forEach((instance, creepName) => {
        if (!Game.creeps[creepName]) {
          orphanedInstances.push(creepName);
        }
      });
      orphanedInstances.forEach(name => {
        this.creepInstances.delete(name);
        debugLog.debug(`Removed orphaned instance: ${name}`);
      });
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
    // try {
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
    // } catch (error) {
    //   logger.error('Error during multi-room memory cleanup:', error);
    // }
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
    // Backwards-compatible wrapper: pause spawning only
    this.spawnManager.pauseSpawning();
    logger.force("🛑 Spawning paused - active creeps continue");
  }

  /**
   * Resume the game loop - allows tick execution to continue
   */
  public resumeGame(): void {
    // Backwards-compatible wrapper: resume spawning
    this.spawnManager.resumeSpawning();
    logger.force("▶️ Spawning resumed - bot operations continuing");
  }

  /**
   * Toggle the pause state of the game
   */
  public togglePause(): void {
    // Toggle spawning pause state
    const paused = this.spawnManager.toggleSpawning();
    if (paused) {
      logger.force("🛑 Spawning paused - active creeps continue");
    } else {
      logger.force("▶️ Spawning resumed - bot operations continuing");
    }
  }

  // AUTO-SPAWN CONTROL
  // ============================================================================

  /**
   * Enable automatic spawning of creeps
   */
  public enableAutoSpawn(): void {
    this.spawnManager.enableAutoSpawn();
  }

  /**
   * Disable automatic spawning of creeps
   */
  public disableAutoSpawn(): void {
    this.spawnManager.disableAutoSpawn();
  }

  /**
   * Toggle automatic spawning of creeps
   * @returns current state of auto-spawning
   */
  public toggleAutoSpawn(): boolean {
    return this.spawnManager.toggleAutoSpawn();
  }

  /**
   * Check if auto-spawning is enabled
   */
  public isAutoSpawnEnabled(): boolean {
    return this.spawnManager.isAutoSpawnEnabled();
  }

  /**
   * Check if the game is currently paused
   */
  public isGamePaused(): boolean {
    // Backwards-compatible: report spawning pause state
    return this.spawnManager.isSpawningPaused();
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

  /**
   * Get diagnostic statistics about cached creep instances
   * @returns Object with total instances and breakdown by role
   */
  public getInstanceCacheStats(): { totalInstances: number; instancesByRole: Record<CreepRole, number> } {
    const stats: { totalInstances: number; instancesByRole: Record<CreepRole, number> } = {
      totalInstances: this.creepInstances.size,
      instancesByRole: {
        harvester: 0,
        hauler: 0,
        builder: 0,
        upgrader: 0,
        defender: 0,
        ranger: 0,
        explorer: 0
      }
    };

    this.creepInstances.forEach((instance) => {
      const role = instance.memory.role;
      if (role in stats.instancesByRole) {
        stats.instancesByRole[role]++;
      }
    });

    return stats;
  }
}

