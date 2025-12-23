/**
 * Explorer Role - Scouts adjacent rooms to detect hostile attackers
 * Migrated to class-based pattern
 */

import { SmartCreep } from "./types";
import { MULTI_ROOM_CONFIG } from "./config/multi-room.config";
import { ExplorerMemory, RoomExplorationData, RoomSafetyStatus, CreepRoleEnum, CreepStateEnum } from "./types";
import { debugLog } from "./utils/Logger";

/**
 * ExplorerCreep class - extends SmartCreep with exploration behavior
 */
class ExplorerCreep extends SmartCreep {
  declare memory: ExplorerMemory;

  private static readonly SCAN_EXPIRY = 5000;

  constructor(creep: Creep) {
    super(creep);
    this.validateMemory();
  }

  /**
   * Validate and initialize explorer-specific memory
   */
  private validateMemory(): void {
    if (!this.memory.homeRoom) {
      this.memory.homeRoom = this.creep.room.name;
    }
    if (!this.memory.scannedRooms) {
      this.memory.scannedRooms = [];
    }
    if (this.memory.isReturning === undefined) this.memory.isReturning = false;
    if (this.memory.explorationComplete === undefined) this.memory.explorationComplete = false;
  }

  /**
   * Main run method - executed every tick
   */
  public run(): void {
    try {
      this.initializeExplorationMemory();

      // State: Scanning target room
      if (this.memory.targetRoom && this.creep.room.name === this.memory.targetRoom) {
        this.handleScanningState();
        return;
      }

      // State: Returning to home
      if (this.memory.isReturning) {
        this.handleReturningState();
        return;
      }

      // State: At home, selecting next target
      if (this.creep.room.name === this.memory.homeRoom && !this.memory.targetRoom) {
        this.handleSelectingTargetState();
        return;
      }

      // State: Transitioning to target room
      if (this.memory.targetRoom) {
        this.handleTransitioningState();
        return;
      }

      // Fallback: Idle at home
      this.handleIdleState();
    } catch (error) {
      debugLog.error(`${this.creep.name} explorer error:`, error);
    }
  }

  /**
   * Initialize global exploration memory
   */
  private initializeExplorationMemory(): void {
    if (!Memory.exploration) {
      Memory.exploration = {};
    }
  }

  /**
   * Handle scanning state - creep is in target room
   */
  private handleScanningState(): void {
    this.memory.transitionStartTick = undefined;
    this.scanCurrentRoom();

    if (!this.memory?.scannedRooms) {
      this.memory.scannedRooms = [];
    }

    if (!this.memory.scannedRooms.includes(this.creep.room.name)) {
      this.memory.scannedRooms.push(this.creep.room.name);
    }

    const data = Memory.exploration?.[this.creep.room.name];
    if (data && data.safetyStatus === RoomSafetyStatus.HOSTILE) {
      debugLog.warn(`[EXPLORER] ${this.creep.name} detected hostiles in ${this.creep.room.name}, returning home`);
    } else {
      debugLog.debug(`[EXPLORER] ${this.creep.name} scan complete for ${this.creep.room.name}, returning home`);
    }

    this.memory.isReturning = true;
    this.memory.targetRoom = undefined;
    this.setState(CreepStateEnum.IDLE);
  }

  /**
   * Handle returning to home room state
   */
  private handleReturningState(): void {
    if (this.creep.room.name === this.memory.homeRoom) {
      this.memory.isReturning = false;
      this.memory.targetRoom = undefined;
      this.memory.transitionStartTick = undefined;
      this.setState(CreepStateEnum.IDLE);
    } else {
      const homePos = new RoomPosition(25, 25, this.memory.homeRoom);
      this.creep.moveTo(homePos, { reusePath: 10 });
    }
  }

  /**
   * Handle selecting next target room state
   */
  private handleSelectingTargetState(): void {
    const nextRoom = this.getNextRoomToExplore();
    if (!nextRoom) {
      this.memory.explorationComplete = true;
      debugLog.debug(`[EXPLORER] ${this.creep.name} completed exploration around ${this.memory.homeRoom}`);
      return;
    }

    this.memory.targetRoom = nextRoom;
    this.memory.transitionStartTick = Game.time;
    this.setState(CreepStateEnum.EXPLORING);
    debugLog.debug(`[EXPLORER] ${this.creep.name} targeting adjacent room ${nextRoom}`);
  }

  /**
   * Handle transitioning to target room state
   */
  private handleTransitioningState(): void {
    if (!this.memory.targetRoom) return;

    const elapsed = this.memory.transitionStartTick ? Game.time - this.memory.transitionStartTick : 0;
    if (!this.memory.transitionStartTick) {
      this.memory.transitionStartTick = Game.time;
    }

    if (elapsed > MULTI_ROOM_CONFIG.roomTransitionTimeout) {
      this.handleTransitionTimeout();
      return;
    }

    const onBorder = this.creep.pos.x === 0 || this.creep.pos.x === 49 || this.creep.pos.y === 0 || this.creep.pos.y === 49;
    const targetPos = new RoomPosition(25, 25, this.memory.targetRoom);
    const moveResult = this.creep.moveTo(targetPos, { visualizePathStyle: { stroke: '#ffaa00' }, reusePath: 10 });

    if (moveResult !== OK && moveResult !== ERR_TIRED) {
      debugLog.warn(`[EXPLORER] ${this.creep.name} moveTo(${this.memory.targetRoom}) failed with ${moveResult} at ${this.creep.pos}`);
    } else if (MULTI_ROOM_CONFIG.debugEnabled && onBorder && Game.time % 20 === 0) {
      debugLog.debug(`[EXPLORER] ${this.creep.name} transitioning to ${this.memory.targetRoom} on border ${this.creep.pos}`);
    }
  }

  /**
   * Handle idle state - stay near home room center
   */
  private handleIdleState(): void {
    if (this.creep.room.name !== this.memory.homeRoom) {
      const homePos = new RoomPosition(25, 25, this.memory.homeRoom);
      this.creep.moveTo(homePos, { reusePath: 10 });
    }
    this.setState(CreepStateEnum.IDLE);
  }

  /**
   * Handle room transition timeout
   */
  private handleTransitionTimeout(): void {
    if (!this.memory.targetRoom) return;

    const elapsed = this.memory.transitionStartTick ? Game.time - this.memory.transitionStartTick : 0;
    debugLog.warn(
      `[EXPLORER] ${this.creep.name} room transition timeout: ${this.creep.room.name} → ${this.memory.targetRoom} ` +
      `(${elapsed}/${MULTI_ROOM_CONFIG.roomTransitionTimeout} ticks)`
    );

    this.initializeExplorationMemory();
    if (Memory.exploration) {
      Memory.exploration[this.memory.targetRoom] = {
        roomName: this.memory.targetRoom,
        safetyStatus: RoomSafetyStatus.EXPIRED,
        lastScanned: Game.time,
        hostileCount: 0,
        explorerName: this.creep.name
      } as RoomExplorationData;
    }

    this.memory.isReturning = true;
    this.memory.targetRoom = undefined;
    this.memory.transitionStartTick = undefined;
  }

  /**
   * Scan current room for hostiles and update exploration memory
   */
  private scanCurrentRoom(): void {
    const roomName = this.creep.room.name;

    const hostiles = this.creep.room.find(FIND_HOSTILE_CREEPS);
    const attackers = hostiles.filter(this.isAttacker);
    const sources = this.creep.room.find(FIND_SOURCES);
    const controller = this.creep.room.controller;

    const safetyStatus = attackers.length > 0 ? RoomSafetyStatus.HOSTILE : RoomSafetyStatus.SAFE;

    if (attackers.length > 0) {
      debugLog.warn(`[EXPLORER] Room ${roomName} is HOSTILE: ${attackers.length} attackers detected`);
    } else {
      debugLog.debug(`[EXPLORER] Room ${roomName} is SAFE`);
    }

    const explorationData: RoomExplorationData = {
      roomName,
      safetyStatus,
      lastScanned: Game.time,
      hostileCount: attackers.length,
      sourceCount: sources.length,
      controllerLevel: controller?.level,
      controllerOwner: controller?.owner?.username || controller?.reservation?.username,
      explorerName: this.creep.name,
      enabledForRemoteHarvest: false
    };

    if (Memory.exploration) {
      Memory.exploration[roomName] = explorationData;
    }

    debugLog.debug(`[EXPLORER] Scanned ${roomName}: ${sources.length} sources, ${attackers.length} attackers`);
  }

  /**
   * Check if a creep has attack or ranged attack parts
   */
  private isAttacker(creep: Creep): boolean {
    return creep.getActiveBodyparts(ATTACK) > 0 || creep.getActiveBodyparts(RANGED_ATTACK) > 0;
  }

  /**
   * Find next room to explore (adjacent rooms not yet scanned or expired)
   */
  private getNextRoomToExplore(): string | null {
    const adjacentRooms = this.getAdjacentRooms(this.memory.homeRoom);

    const unscannedRooms = adjacentRooms.filter(roomName => {
      const explorationData = Memory.exploration?.[roomName];
      if (!explorationData) return true;

      const age = Game.time - explorationData.lastScanned;
      return age > ExplorerCreep.SCAN_EXPIRY;
    });

    if (unscannedRooms.length === 0) {
      debugLog.debug(`[EXPLORER] All adjacent rooms scanned, marking exploration complete`);
      return null;
    }

    return unscannedRooms[0];
  }

  /**
   * Get adjacent room names from current room
   */
  private getAdjacentRooms(roomName: string): string[] {
    const exits = Game.map.describeExits(roomName);
    if (!exits) return [];
    return Object.values(exits);
  }
}

/**
 * Factory export for backward compatibility with existing GameManager
 */
export default {
  run: (creep: Creep) => {
    new ExplorerCreep(creep).run();
  }
};
