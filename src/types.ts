const IDLE_STATE = "IDLE";
const HARVEST_STATE = "IDLE";
const BUILD_STATE = "IDLE";
const HAULER_STATE = "IDLE";
const UPGRADE_STATE = "IDLE";
const ATTACK_STATE = "ATTACKING";
const HEAL_STATE = "HEADLING";

// defined Creep State type

abstract class CreepBrain {
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
    getCreep(): Creep {
        return this.creep;
    }
    public setRole(role: string) {
        this.memory.role = role;
    }
    public getRole(): string {
        return this.memory.role;
    }

    handleTask() {
        switch (this.state) {
            case HARVEST_STATE:
                this.harvest && this.harvest();
                break;
            case HAULER_STATE:
                this.hauler && this.hauler();
                break;
            case BUILD_STATE:
                this.build && this.build();
                break;
            case UPGRADE_STATE:
                this.upgrade && this.upgrade();
                break;
            case ATTACK_STATE:
                this.upgrade && this.upgrade();
                break;
            case HEAL_STATE:
                this.upgrade && this.upgrade();
                break;
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
