import { SmartCreep } from "./types";
import { CreepRoleEnum, RangerMemory } from "./types";
import { debugLog } from "./utils/Logger";

/**
 * Ranger Role - Ranged combat unit for room defense
 *
 * Responsibilities:
 * - Ranged attack hostile creeps in room
 * - Ranged attack hostile structures when no creeps present
 * - Patrol when no targets available
 *
 * State: Simple reactive combat (no state machine)
 */
class RangerCreep extends SmartCreep {
  declare memory: RangerMemory;

  constructor(creep: Creep) {
    super(creep);
    this.setRole(CreepRoleEnum.RANGER);
  }

  /**
   * Main execution loop - called every tick
   */
  public run(): void {
    const target = this.findHostileTarget();

    if (target) {
      this.engageTarget(target);
    } else {
      this.patrol();
    }
  }

  /**
   * Find the closest hostile creep or structure
   * Prioritizes creeps over structures
   * @private
   */
  private findHostileTarget(): Creep | Structure | null {
    // Prioritize hostile creeps
    const hostileCreeps = this.creep.room.find(FIND_HOSTILE_CREEPS);
    if (hostileCreeps.length > 0) {
      return hostileCreeps[0];
    }

    // Then check for hostile structures
    const hostileStructures = this.creep.room.find(FIND_HOSTILE_STRUCTURES);
    if (hostileStructures.length > 0) {
      return hostileStructures[0];
    }

    return null;
  }

  /**
   * Engage and ranged attack a hostile target
   * Handles ERR_INVALID_TARGET by finding alternative targets
   * @private
   */
  private engageTarget(target: Creep | Structure): void {
    const attackResult = this.creep.rangedAttack(target);

    if (attackResult === ERR_NOT_IN_RANGE) {
      const moveResult = this.creep.moveTo(target, {
        visualizePathStyle: { stroke: '#ff0000' }
      });
      debugLog.debug(`${this.creep.name} moving to target: ${moveResult}`);
    } else if (attackResult === ERR_INVALID_TARGET) {
      debugLog.warn(`Invalid target for ${this.creep.name}, finding new target`);
      // Target is invalid, find another one next tick
    } else if (attackResult !== OK) {
      debugLog.warn(`Ranged attack failed for ${this.creep.name}: ${attackResult}`);
    }
  }

  /**
   * Patrol behavior when no targets present
   * Moves toward room controller or spawn for defensive positioning
   * @private
   */
  private patrol(): void {
    debugLog.debug(`${this.creep.name} patrolling - no targets`);

    // Patrol to controller for defensive positioning
    const controller = this.creep.room.controller;
    if (controller && controller.my) {
      this.creep.moveTo(controller, {
        visualizePathStyle: { stroke: '#00ff00' }
      });
    } else {
      // Fallback to spawn if no owned controller
      const spawn = this.creep.room.find(FIND_MY_SPAWNS)[0];
      if (spawn) {
        this.creep.moveTo(spawn, {
          visualizePathStyle: { stroke: '#00ff00' }
        });
      }
    }
  }
}

/**
 * Factory function for creating ranger instances
 * Maintains compatibility with current GameManager pattern
 */
export default {
  run: (creep: Creep): void => {
    const ranger = new RangerCreep(creep);
    ranger.run();
  }
};
