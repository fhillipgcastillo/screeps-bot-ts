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


export class GameManager {
  private gameState: string;
  private isPaused: boolean = false;
  private activeCreeps: Creep[] = [];
  private activeSpawns: StructureSpawn[] = [];
  public spawnManager: SpawnManager;
  public manualSpawner: ManualSpawner;

  constructor() {
    this.gameState = "initialized";
    this.spawnManager = new SpawnManager();
    this.manualSpawner = getManualSpawner(this.spawnManager);
  }

  /**
   * Main game loop method that is called every tick.
   */
  public tick(): void {
    // Check if game is paused - return early if so
    if (this.isPaused) {
      return;
    }

    // console.log(`Current game tick is ${Game.time}`);
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
      console.log(`Invalid role: ${creep.memory.role} for creep ${creep.name}`);
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
        console.log(`Unknown role: ${creep.memory.role}`);
    }
  }
  cleanUpMemory() {
    for (var creepName in Memory.creeps) {
      if (!Game.creeps[creepName]) {
        delete Memory.creeps[creepName];
        console.log('Clearing non-existing creep memory:', creepName);
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
    console.log("🛑 Game paused - bot operations stopped");
  }

  /**
   * Resume the game loop - allows tick execution to continue
   */
  public resumeGame(): void {
    this.isPaused = false;
    console.log("▶️ Game resumed - bot operations continuing");
  }

  /**
   * Toggle the pause state of the game
   */
  public togglePause(): void {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      console.log("🛑 Game paused - bot operations stopped");
    } else {
      console.log("▶️ Game resumed - bot operations continuing");
    }
  }

  /**
   * Check if the game is currently paused
   */
  public isGamePaused(): boolean {
    return this.isPaused;
  }
}

