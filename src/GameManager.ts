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
import { logger, debugLog } from "./utils/Logger";


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
    logger.setDebug(this.debug);
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
        logger.error(`Unknown role: ${creep.memory.role}`);
    }
  }
  cleanUpMemory() {
    for (var creepName in Memory.creeps) {
      if (!Game.creeps[creepName]) {
        delete Memory.creeps[creepName];
        logger.debug('Clearing non-existing creep memory:', creepName);
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

