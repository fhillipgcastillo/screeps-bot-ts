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

export type eCreepState = "IDLE" | "HARVESTING" | "BUILDING" | "HAULING" | "UPGRADING" | "ATTACKING" | "HEALING";
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

    // Multi-room specific properties
    multiRoom?: {
        enabled: boolean;
        homeRoom: string;
        targetRoom?: string;
        isMultiRoom: boolean;
        roomTransitionStartTick?: number;
        failureCount: number;
        lastMultiRoomAttempt?: number;
    };
}

/**
 * Memory interface for hauler creeps
 */
export interface HaulerMemory extends BaseCreepMemory {
    role: "hauler";
    // Haulers use the common transfering and haulering flags

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
    nextRole?: CreepRole;
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
