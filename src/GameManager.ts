import spawnManager from "./spawn.manager";
import roleHarvester from "./role.harvester_stationary";
import roleHauler from "./role.hauler";
import roleUpgrader from "./role.upgrader";
import roleBuilder from "./role.builder";
import roleExplorer from "role.explorer";
import roleDefender from "role.defender";
import roleRanger from "role.ranger";


export class GameManager {
  private gameState: string;
  private activeCreeps: Creep[] = [];
  private activeSpawns: StructureSpawn[] = [];

  constructor() {
    this.gameState = "initialized";
  }

  /**
   * Main game loop method that is called every tick.
   */
  public tick(): void {
    // console.log(`Current game tick is ${Game.time}`);
    this.syncActiveCreeps();

    this.cleanUpMemory();
    // Game.map.visual.text("Target💥", new RoomPosition(10,16,Object.keys(Game.rooms)[0]), {color: '#FF0000', fontSize: 19});

    // auto spawn harvesters
    spawnManager.run();
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
    switch (creep.memory.role) {
      case 'harvester':
        roleHarvester.run(creep);
        break;
      case 'hauler':
        roleHauler.run(creep);
        break;
      case 'upgrader':
        roleUpgrader.run(creep);
        break;
      case 'builder':
        roleBuilder.run(creep);
        break;
      case 'defender':
        roleDefender.run(creep);
        break;
      case 'ranger':
        roleRanger.run(creep);
        break;
      case 'explorer':
        roleExplorer.run(creep, spawn);
        break;
      default:
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
}

