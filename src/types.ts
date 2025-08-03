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

// defined Creep State type

export abstract class CreepBrain {
    public creep: Creep;
    public memory: CreepMemory;
    public state: string = "IDLE";

    constructor(creep: Creep) {
        this.creep = creep;
        this.memory = creep.memory;
    }

    abstract run(): void;
    abstract setRole(role: string): void;
    abstract getRole(): string;
    abstract handleTask() : void;
    abstract setState(state: string): void;

    harvest?() { }
    build?() { }
    upgrade?() { }
    idle?() { }
    hauler?() { }
}

export class SmartCreep extends CreepBrain {
    run(): void {
        this.handleTask()
    }

    public setRole(role: string) {
        this.memory.role = role;
    }
    public getRole(): string {
        return this.memory.role;
    }

    handleTask() {
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
    setState(state: string){
        this.state = state;
    }
}

// considering to use static harvesters
export class Harvester extends SmartCreep {
    public override harvest(): void {

    }
}

export class Hauler extends SmartCreep {
    override hauler(): void {

    }
}
// const sCreep = new SmartCreep();
