import { SmartCreep } from "./types";
import { CreepRoleEnum, UpgraderMemory, CreepStateEnum } from "./types";
import { debugLog } from "./utils/Logger";
import { getCachedContainers } from "./utils/energy-bootstrap";
import { getNextResourceTarget } from "./utils/resource-assignment";

/**
 * Upgrader Role - Upgrades room controller
 *
 * Responsibilities:
 * - Collect energy from containers, extensions, or spawn
 * - Upgrade room controller
 *
 * State Transitions:
 * - HARVESTING → UPGRADING (when full)
 * - UPGRADING → HARVESTING (when empty)
 */
class UpgraderCreep extends SmartCreep {
  declare memory: UpgraderMemory;

  constructor(creep: Creep) {
    super(creep);
    this.setRole(CreepRoleEnum.UPGRADER);
    this.setState(CreepStateEnum.IDLE);
  }

  /**
   * Main execution loop - called every tick
   */
  public run(): void {
    try {
      this.validateMemory();
      this.updateWorkingState();
      this.handleTask();
    } catch (error) {
      debugLog.error(`${this.creep.name} upgrader error:`, error);
    }
  }

  /**
   * Validate and initialize memory structure
   * @private
   */
  private validateMemory(): void {
    if (!this.memory.room) {
      this.memory.room = this.creep.room.name;
    }
    if (this.memory.working === undefined) {
      this.memory.working = false;
    }
    if (this.memory.upgrading === undefined) {
      this.memory.upgrading = false;
    }
    if (this.memory.harvesting === undefined) {
      this.memory.harvesting = false;
    }
  }

  /**
   * Update working state based on energy levels
   * @private
   */
  private updateWorkingState(): void {
    const isEmpty = this.creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0;
    const isFull = this.creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0;

    if (isEmpty && this.memory.upgrading) {
      this.memory.upgrading = false;
      this.memory.harvesting = true;
      this.memory.working = false;
      this.setState(CreepStateEnum.HARVESTING);
    } else if (isFull && !this.memory.upgrading) {
      this.memory.upgrading = true;
      this.memory.harvesting = false;
      this.memory.working = true;
      this.setState(CreepStateEnum.UPGRADING);
    } else if (this.creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0 && !this.memory.upgrading) {
      this.memory.harvesting = true;
      this.memory.upgrading = false;
    }
  }

  /**
   * Handle task execution based on state
   */
  public override handleTask(): void {
    if (this.memory.harvesting) {
      this.collectEnergy();
    } else if (this.memory.upgrading) {
      this.upgradeController();
    }
  }

  /**
   * Upgrade the room controller
   * @private
   */
  private upgradeController(): void {
    const controller = this.creep.room.controller;
    if (!controller) {
      debugLog.warn(`${this.creep.name} - No controller in room ${this.creep.room.name}`);
      return;
    }

    const upgradeResult = this.creep.upgradeController(controller);

    if (upgradeResult === ERR_NOT_IN_RANGE) {
      this.creep.moveTo(controller, {
        visualizePathStyle: { stroke: '#ffffff' }
      });
    } else if (upgradeResult !== OK) {
      debugLog.warn(`${this.creep.name} upgrade failed: ${upgradeResult}`);
    }
  }

  /**
   * Collect energy from containers, extensions, or spawn
   * Prioritizes containers to preserve extensions for spawning
   * @private
   */
  private collectEnergy(): void {
    const minEnergyNeeded = this.creep.store.getCapacity(RESOURCE_ENERGY) / 2;

    // Find containers using cached container system
    const containers = getCachedContainers(this.creep.room.name).filter(
      (container) =>
        container.store[RESOURCE_ENERGY] >= 300 ||
        container.store[RESOURCE_ENERGY] >= minEnergyNeeded
    );

    // Find extensions with energy
    const extensions = this.creep.room.find(FIND_MY_STRUCTURES, {
      filter: (s) =>
        s.structureType === STRUCTURE_EXTENSION &&
        s.store[RESOURCE_ENERGY] > 0
    }) as StructureExtension[];

    // Prioritize containers over extensions
    if (containers.length > 0) {
      this.withdrawFromStructures(containers, 'upgrader');
    } else if (extensions.length > 0) {
      this.withdrawFromStructures(extensions, 'upgrader');
    } else {
      this.withdrawFromSpawn();
    }
  }

  /**
   * Withdraw energy from structures using round-robin assignment
   * @private
   */
  private withdrawFromStructures(
    structures: (StructureContainer | StructureExtension)[],
    role: string
  ): void {
    const target = getNextResourceTarget(this.creep.room, role, structures);

    if (target) {
      const withdrawResult = this.creep.withdraw(target as any, RESOURCE_ENERGY);

      if (withdrawResult === ERR_NOT_IN_RANGE) {
        this.creep.moveTo(target, {
          visualizePathStyle: { stroke: '#ffaa00' }
        });
      } else if (withdrawResult !== OK && withdrawResult !== ERR_FULL) {
        debugLog.debug(`${this.creep.name} withdraw failed: ${withdrawResult}`);
      }
    }
  }

  /**
   * Fallback to withdraw from spawn when no other sources available
   * @private
   */
  private withdrawFromSpawn(): void {
    const spawn = this.creep.room.find(FIND_MY_SPAWNS)[0];

    if (!spawn) {
      debugLog.warn(`${this.creep.name} - No spawn found in room ${this.creep.room.name}`);
      return;
    }

    const withdrawResult = this.creep.withdraw(spawn, RESOURCE_ENERGY);

    if (withdrawResult === ERR_NOT_IN_RANGE) {
      this.creep.moveTo(spawn, {
        visualizePathStyle: { stroke: '#ffaa00' }
      });
    } else if (withdrawResult !== OK && withdrawResult !== ERR_FULL) {
      debugLog.debug(`${this.creep.name} withdraw from spawn failed: ${withdrawResult}`);
    }
  }
}

/**
 * Factory function for creating upgrader instances
 * Maintains compatibility with current GameManager pattern
 */
export default {
  run: (creep: Creep): void => {
    const upgrader = new UpgraderCreep(creep);
    upgrader.run();
  }
};
