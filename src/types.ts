// ============================================================================
// CREEP ROLE TYPES
// ============================================================================

/**
 * Union type for all valid creep roles in the game
 */
export type CreepRole =
    | "harvester"
    | "hauler"
    | "builder"
    | "upgrader"
    | "defender"
    | "ranger"
    | "explorer";

/**
 * Enum for creep roles - provides both type safety and runtime values
 */
export enum CreepRoleEnum {
    HARVESTER = "harvester",
    HAULER = "hauler",
    BUILDER = "builder",
    UPGRADER = "upgrader",
    DEFENDER = "defender",
    RANGER = "ranger",
    EXPLORER = "explorer"
}

/**
 * Type guard to check if a string is a valid creep role
 */
export function isValidCreepRole(role: string): role is CreepRole {
    return (Object.values(CreepRoleEnum) as string[]).includes(role);
}

// ============================================================================
// CREEP STATE TYPES
// ============================================================================

export type eCreepState = "IDLE" | "HARVESTING" | "BUILDING" | "HAULING" | "UPGRADING" | "ATTACKING" | "HEALING" | "COLLECTING" | "EXPLORING" | "TRANSFERRING";
export enum CreepStateEnum {
    IDLE = "IDLE",
    HARVESTING = "HARVESTING",
    BUILDING = "BUILDING",
    HAULING = "HAULING",
    UPGRADE = "UPGRADE",
    ATTACKING = "ATTACKING",
    HEALING = "HEALING",
    UPGRADING = "UPGRADING",
    TRANSFERRING = "TRANSFERRING",
    REPAIRING = "REPAIRING",
    COLLECTING = "COLLECTING",
    DEFENDING = "DEFENDING",
    EXPLORING = "EXPLORING",
}

// ============================================================================
// ROLE-SPECIFIC MEMORY INTERFACES
// ============================================================================

/**
 * Base interface for all creep memory - extends the global CreepMemory
 */
export interface BaseCreepMemory {
    role: CreepRole;
    room: string;
    working: boolean;

    // Common state flags
    harvesting?: boolean;
    building?: boolean;
    upgrading?: boolean;
    transfering?: boolean;
    haulering?: boolean;

    // Common target properties
    target?: Id<_HasId>;
    sourceTarget?: Id<Source>;
    prevSourceTarget?: Id<Source>;
    prevTargets?: Id<Source>[];
    resourceTarget?: Id<Resource | Structure | Tombstone | Ruin>;
    prevResourceTarget?: Id<Resource | Structure | Tombstone | Ruin>;
    prevResourceTargets?: Id<Resource | Structure | Tombstone | Ruin>[];

    // Index signature for additional properties
    [name: string]: any;
}

/**
 * Memory interface for harvester creeps
 */
export interface HarvesterMemory extends BaseCreepMemory {
    role: "harvester";
    sourceTargetId?: Id<Source>;
    lastStep?: boolean;

    // Distribution preferences
    preferredSourceId?: Id<Source>;

    // Multi-room specific properties
    multiRoom?: {
        enabled: boolean;
        homeRoom: string;
        targetRoom?: string;
        isMultiRoom: boolean;
        roomTransitionStartTick?: number;
        failureCount: number;
        lastMultiRoomAttempt?: number;
        lastProfitabilityCheck?: number;
    };
}

/**
 * Memory interface for hauler creeps
 */
export interface HaulerMemory extends BaseCreepMemory {
    role: "hauler";
    // Haulers use the common transfering and haulering flags

    // Distribution preferences
    preferredCollectionSource?: Id<Source>;

    // Multi-room specific properties
    multiRoom?: {
        enabled: boolean;
        homeRoom: string;
        collectionRoom?: string;
        returnPath?: string[];
        isReturningHome: boolean;
        failureCount: number;
        lastMultiRoomAttempt?: number;
    };
}

/**
 * Memory interface for builder creeps
 */
export interface BuilderMemory extends BaseCreepMemory {
    role: "builder";
    buildTarget?: Id<ConstructionSite>;
    prevBuildTarget?: Id<ConstructionSite>;
}

/**
 * Memory interface for upgrader creeps
 */
export interface UpgraderMemory extends BaseCreepMemory {
    role: "upgrader";
    // Upgraders primarily use the common upgrading flag
}

/**
 * Memory interface for defender creeps
 */
export interface DefenderMemory extends BaseCreepMemory {
    role: "defender";
    // Defenders may have specific combat-related memory in the future
}

/**
 * Memory interface for ranger creeps
 */
export interface RangerMemory extends BaseCreepMemory {
    role: "ranger";
    // Rangers may have specific combat-related memory in the future
}

/**
 * Memory interface for explorer creeps
 */
export interface ExplorerMemory extends BaseCreepMemory {
    role: "explorer";

    // Exploration state
    targetRoom?: string;           // Room currently being explored
    homeRoom: string;              // Home room to return to
    scannedRooms?: string[];       // List of rooms already scanned
    isReturning?: boolean;         // Whether explorer is returning home
    explorationComplete?: boolean; // Whether all adjacent rooms scanned
    transitionStartTick?: number;  // Tick when current transition started
}

/**
 * Union type for all role-specific memory interfaces
 */
export type RoleSpecificMemory =
    | HarvesterMemory
    | HaulerMemory
    | BuilderMemory
    | UpgraderMemory
    | DefenderMemory
    | RangerMemory
    | ExplorerMemory;

// ============================================================================
// CREEP BRAIN CLASSES
// ============================================================================

/**
 * Abstract base class for all creep AI implementations
 * Uses the new type-safe role system
 */
export abstract class CreepBrain {
    public creep: Creep;
    public memory: BaseCreepMemory;
    public state: eCreepState = "IDLE";

    constructor(creep: Creep) {
        this.creep = creep;
        this.memory = creep.memory as BaseCreepMemory;
    }

    abstract run(): void;
    abstract setRole(role: CreepRole): void;
    abstract getRole(): CreepRole;
    abstract handleTask(): void;
    abstract setState(state: eCreepState): void;

    // Optional methods for different behaviors
    harvest?(): void;
    build?(): void;
    upgrade?(): void;
    idle?(): void;
    hauler?(): void;
}

/**
 * Smart creep implementation with type-safe role and state management
 */
export class SmartCreep extends CreepBrain {
    run(): void {
        this.handleTask();
    }

    public setRole(role: CreepRole): void {
        this.memory.role = role;
    }

    public getRole(): CreepRole {
        return this.memory.role;
    }

    handleTask(): void {
        switch (this.state) {
            case CreepStateEnum.HARVESTING:
                this.harvest && this.harvest();
                break;
            case CreepStateEnum.HAULING:
                this.hauler && this.hauler();
                break;
            case CreepStateEnum.BUILDING:
                this.build && this.build();
                break;
            case CreepStateEnum.UPGRADING:
                this.upgrade && this.upgrade();
                break;
            case CreepStateEnum.ATTACKING:
                this.upgrade && this.upgrade();
                break;
            case CreepStateEnum.HEALING:
                this.upgrade && this.upgrade();
                break;
            case CreepStateEnum.IDLE:
            default:
                this.idle && this.idle();
                break;
        }
    }

    setState(state: eCreepState): void {
        this.state = state;
    }
}

// ============================================================================
// ROLE-SPECIFIC CREEP CLASSES
// ============================================================================

/**
 * Harvester creep implementation with type-safe memory
 */
export class Harvester extends SmartCreep {
    declare memory: HarvesterMemory;

    public override harvest(): void {
        // Implementation would go here
    }
}

/**
 * Hauler creep implementation with type-safe memory
 */
export class Hauler extends SmartCreep {
    declare memory: HaulerMemory;

    override hauler(): void {
        // Implementation would go here
    }
}

/**
 * Builder creep implementation with type-safe memory
 */
export class Builder extends SmartCreep {
    declare memory: BuilderMemory;

    override build(): void {
        // Implementation would go here
    }
}

/**
 * Upgrader creep implementation with type-safe memory
 */
export class Upgrader extends SmartCreep {
    declare memory: UpgraderMemory;

    override upgrade(): void {
        // Implementation would go here
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Type-safe function to get creep counts by role
 */
export function getCreepCountsByRole(): Record<CreepRole, number> {
    const counts = {
        harvester: 0,
        hauler: 0,
        builder: 0,
        upgrader: 0,
        defender: 0,
        ranger: 0,
        explorer: 0
    } as Record<CreepRole, number>;

    for (const creepName in Game.creeps) {
        const creep = Game.creeps[creepName];
        if (creep && isValidCreepRole(creep.memory.role)) {
            counts[creep.memory.role]++;
        }
    }

    return counts;
}

/**
 * Type-safe function to filter creeps by role
 */
export function getCreepsByRole<T extends CreepRole>(role: T): Creep[] {
    return _.filter(Game.creeps, (creep) => creep.memory.role === role);
}

// ============================================================================
// ROOM CLAIMING MEMORY INTERFACES
// ============================================================================

/**
 * Memory structure for tracking room claiming state
 */
export interface RoomClaimingMemory {
    roomName: string;
    claimed?: boolean;
    claimedBy?: string;
    claimTime?: number;
    safetyScore?: number;
    lastEvaluated?: number;
    unsafe?: boolean;
    unsafeUntil?: number;
    unsafeReason?: string;
    discovered?: boolean;
    discoveredTime?: number;
}

// NOTE: We intentionally do not declare `Memory.rooms` here to avoid
// conflicting modifiers with other Memory augmentations in the codebase.
// Room-level claiming state is attached to `RoomMemory` instead.

/**
 * Safety status for explored rooms
 */
export enum RoomSafetyStatus {
    UNKNOWN = "UNKNOWN",       // Not yet explored
    SAFE = "SAFE",             // No hostile attackers detected
    HOSTILE = "HOSTILE",       // Hostile attackers present
    EXPIRED = "EXPIRED"        // Safety data expired, needs re-scan
}

/**
 * Memory structure for tracking room exploration results
 */
export interface RoomExplorationData {
    roomName: string;
    safetyStatus: RoomSafetyStatus;
    lastScanned: number;               // Game.time of last scan
    hostileCount: number;              // Number of hostile creeps with ATTACK/RANGED_ATTACK
    sourceCount?: number;              // Number of sources found
    controllerLevel?: number;          // Controller level if present
    controllerOwner?: string;          // Controller owner if present
    explorerName?: string;             // Name of explorer that scanned this room
    enabledForRemoteHarvest?: boolean; // Whether remote harvesting is enabled
}

// Extend Screeps' RoomMemory to include claiming state used by our utilities
declare global {
    interface RoomMemory {
        // Whether this room has been marked claimed by our bot
        claimed?: boolean;
        // Which of our rooms claimed this room
        claimedBy?: string;
        // Game.time when the room was claimed
        claimedAt?: number;

        // Safety and evaluation metadata
        safetyScore?: number;
        lastEvaluated?: number;
        unsafe?: boolean;
        unsafeUntil?: number;
        unsafeReason?: string;

        // Discovery metadata
        discovered?: boolean;
        discoveredTime?: number;
        lastHostileSeen: number;
    }

    interface Memory {
        exploration?: {
            [roomName: string]: RoomExplorationData;
        };
    }
}

