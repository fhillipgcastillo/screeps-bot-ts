/**
 * Builder Role - Constructs buildings and repairs structures
 * Migrated to class-based pattern
 */

import { SmartCreep } from "./types";
import { BuilderMemory, CreepRoleEnum, CreepStateEnum } from "./types";
import { findClosestContainer, getContainers } from "./utils";
import { debugLog } from "./utils/Logger";
import { getCachedContainers } from "./utils/energy-bootstrap";
import { getNextResourceTarget } from "./utils/resource-assignment";

/**
 * BuilderCreep class - extends SmartCreep with builder-specific behavior
 */
class BuilderCreep extends SmartCreep {
  declare memory: BuilderMemory;

  constructor(creep: Creep) {
    super(creep);
    this.validateMemory();
  }

  /**
   * Validate and initialize builder-specific memory
   */
  private validateMemory(): void {
    if (!this.memory.building) this.memory.building = false;
    if (!this.memory.harvesting) this.memory.harvesting = false;
  }

  /**
   * Main run method - executed every tick
   */
  public run(): void {
    try {
      this.updateWorkingState();
      this.executeState();
    } catch (error) {
      debugLog.error(`${this.creep.name} builder error:`, error);
    }
  }

  /**
   * Update working state based on energy levels
   */
  private updateWorkingState(): void {
    if (this.creep.store.getFreeCapacity() > 0 && !this.memory.building) {
      this.memory.harvesting = true;
      this.memory.building = false;
      this.setState(CreepStateEnum.COLLECTING);
    } else if (this.creep.store.getFreeCapacity() === 0 && !this.memory.building) {
      this.memory.building = true;
      this.memory.harvesting = false;
      this.setState(CreepStateEnum.BUILDING);
    } else if (this.creep.store.energy === 0 && this.memory.building) {
      this.memory.building = false;
      this.memory.harvesting = true;
      this.setState(CreepStateEnum.COLLECTING);
    }
  }

  /**
   * Execute behavior based on current state
   */
  private executeState(): void {
    const cachedContainers = getCachedContainers(this.creep.room.name);
    const validContainers = cachedContainers.filter(c => c.store.energy > 0);
    const containers = validContainers.length > 0 ? validContainers : getContainers(this.creep, 50);

    if (this.memory.harvesting && containers.length > 0) {
      this.collectFromContainers(containers);
    } else if (this.memory.harvesting) {
      this.collectEnergy();
    } else if (this.memory.building) {
      this.buildStructures();
    }
  }

  /**
   * Collect energy from containers
   */
  private collectFromContainers(containers: StructureContainer[]): void {
    const container = findClosestContainer(this.creep, containers);
    if (!container) {
      debugLog.debug(`${this.creep.name} no container found`);
      return;
    }

    const withdrawAction = this.creep.withdraw(container, RESOURCE_ENERGY);
    if (withdrawAction === ERR_NOT_IN_RANGE) {
      this.creep.moveTo(container, { visualizePathStyle: { stroke: '#ffaa00' } });
    }
  }

  /**
   * Collect energy from various sources (containers, extensions, spawn)
   */
  private collectEnergy(): void {
    const minEnergyNeeded = this.creep.store.getCapacity(RESOURCE_ENERGY) / 2;
    const containers = this.creep.room.find(FIND_STRUCTURES, {
      filter: (s) =>
        s.structureType === STRUCTURE_CONTAINER &&
        (s.store[RESOURCE_ENERGY] >= 300 || s.store[RESOURCE_ENERGY] >= minEnergyNeeded)
    }) as StructureContainer[];

    const extensions = this.creep.room.find(FIND_MY_STRUCTURES, {
      filter: (s) => s.structureType === STRUCTURE_EXTENSION && s.store[RESOURCE_ENERGY] > 0
    }) as StructureExtension[];

    if (containers.length > 0) {
      const container = getNextResourceTarget(this.creep.room, 'builder', containers) as StructureContainer;
      if (container) {
        const withdrawAction = this.creep.withdraw(container, RESOURCE_ENERGY);
        if (withdrawAction === ERR_NOT_IN_RANGE) {
          this.creep.moveTo(container, { visualizePathStyle: { stroke: '#ffaa00' } });
        }
      }
    } else if (extensions.length > 0) {
      const extension = getNextResourceTarget(this.creep.room, 'builder', extensions) as StructureExtension;
      if (extension && this.creep.withdraw(extension, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
        this.creep.moveTo(extension, { visualizePathStyle: { stroke: '#ffaa00' } });
      }
    } else {
      this.withdrawFromSpawn();
    }
  }

  /**
   * Withdraw energy from spawn as fallback
   */
  private withdrawFromSpawn(): void {
    const spawns = this.creep.room.find(FIND_MY_SPAWNS);
    if (spawns.length === 0) return;

    const spawn = spawns[0];
    if (this.creep.withdraw(spawn, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
      this.creep.moveTo(spawn, { visualizePathStyle: { stroke: '#ffaa00' } });
    }
  }

  /**
   * Get priority build target based on room level
   */
  private getBuildTarget(): ConstructionSite | null {
    this.memory.prevBuildTarget = this.memory.buildTarget;
    this.memory.buildTarget = undefined;

    const controller = this.creep.room.controller;
    const roomEnergyCapacity = this.creep.room.energyCapacityAvailable;
    const isEarlyGame = roomEnergyCapacity <= 300 && controller?.level && controller.level < 2;

    let target: ConstructionSite | null;

    if (isEarlyGame) {
      // Early game priority: containers, roads, extensions
      target = this.creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES, {
        filter: (structure) => {
          return (
            structure.structureType === STRUCTURE_CONTAINER ||
            structure.structureType === STRUCTURE_ROAD ||
            structure.structureType === STRUCTURE_EXTENSION
          );
        }
      });
    } else {
      // Mid-late game priority: all defensive and infrastructure
      target = this.creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES, {
        filter: (structure) => {
          return (
            structure.structureType === STRUCTURE_RAMPART ||
            structure.structureType === STRUCTURE_ROAD ||
            structure.structureType === STRUCTURE_CONTAINER ||
            structure.structureType === STRUCTURE_EXTENSION ||
            structure.structureType === STRUCTURE_SPAWN ||
            structure.structureType === STRUCTURE_TOWER
          );
        }
      });
    }

    if (target) {
      this.memory.buildTarget = target.id;
    }
    return target;
  }

  /**
   * Find existing build target from memory
   */
  private findTarget(): ConstructionSite | null {
    if (!this.memory.buildTarget) return null;

    const target = this.creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES, {
      filter: (structure) => structure.id === this.memory.buildTarget
    });
    return target;
  }

  /**
   * Build structures (main building logic)
   */
  private buildStructures(): void {
    let target: ConstructionSite | null = null;

    if (!this.memory.buildTarget || !Object.keys(Game.constructionSites).includes(this.memory.buildTarget)) {
      target = this.getBuildTarget();
    } else {
      target = this.findTarget();
    }

    if (target) {
      this.memory.buildTarget = target.id;
      const buildActionError = this.creep.build(target);

      if (buildActionError === ERR_NOT_IN_RANGE) {
        this.creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
      } else if (buildActionError === ERR_INVALID_TARGET) {
        this.memory.prevBuildTarget = this.memory.buildTarget;
        this.memory.buildTarget = undefined;
      } else if (buildActionError !== OK) {
        debugLog.warn(`${this.creep.name} build error: ${buildActionError}`);
      }
    } else {
      this.memory.prevBuildTarget = this.memory.buildTarget;
      this.memory.buildTarget = undefined;
    }
  }
}

// Export the class for instance caching
export { BuilderCreep };

/**
 * Factory export for backward compatibility with existing GameManager
 */
export default {
  run: (creep: Creep) => {
    new BuilderCreep(creep).run();
  }
};
