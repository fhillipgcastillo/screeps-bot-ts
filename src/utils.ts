// import * as _ from "lodash";
const bodyWeights = {
    MOVE: 50,
    WORK: 100,
    CARRY: 50,
    ATTACK: 80,
    RANGED_ATTACK: 150,
    HEAL: 250,
    CLAIM: 600,
    TOUGH: 20,
}
type BodyWeight = typeof bodyWeights;

export const getContainers = (creep: Creep, minEnergy = 50): StructureContainer[] => {
    return creep.room.find(FIND_STRUCTURES, {
        filter: (s) =>
            s.structureType === STRUCTURE_CONTAINER
            && s.store[RESOURCE_ENERGY] >= minEnergy
    });
};

export const findClosestContainer = (creep: Creep, containers: StructureContainer[]) => {
    return creep.pos.findClosestByRange(containers);
};

export const calculateBodyWeight = (bodyParts: BodyWeight[]) => {
    // TO DO
    // const bodyPartsWeight = bodyParts.map(bp => bodyWeights.get(bp))
};

export const makeAllHaulersTransfer = () => {
    _.filter(Game.creeps, (creep) => creep.memory.role == 'hauler').forEach(h => {
        h.memory.haulering = false;
        h.memory.transfering = true;
    })
}
export const makeAllHaulersChangeSource = () => {
    _.filter(Game.creeps, (creep) => creep.memory.role == 'hauler').forEach(h => { h.memory.sourceTarget = undefined; h.memory.transfering = false; })
}

declare global {
    let makeAllHaulersTransfer: () => void;
    let makeAllHaulersChangeSource: () => void;
}

export const makeAllHarvesterChangeSource = () => {
    _.filter(Game.creeps, (creep) => creep.memory.role == 'harvester').forEach(h => { h.memory.sourceTarget = undefined })
}

function others() {
    _.filter(Game.creeps, (creep) => creep.memory.role == 'hauler').forEach(h => {
        h.memory.prevTargets = undefined;
    })

    _.filter(Game.creeps, (creep) => creep.memory.role == 'harvester').forEach(h => {
        h.memory.prevTargets = undefined;
    })

    _.filter(Game.creeps, (creep) => creep.memory.role == 'upgrader').forEach(h => {
        h.memory.upgrading = false;
    })
    //  reset the builders
    _.filter(Game.creeps, (creep) => creep.memory.role == 'builder').forEach(h => {
        h.memory.harvesting = false;
        h.memory.building = true;
    })
    // find extensions structures
    Game.creeps["Harvester63959742"].room.find(FIND_MY_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_EXTENSION })

    // small builder
    // Game.spawns.Spawn1.spawnCreep([WORK, WORK, WORK, CARRY, MOVE, MOVE], 'Builder' + Game.time, { memory: { role: 'builder' } });
    // // better builder 500energy
    // Game.spawns.Spawn1.spawnCreep([WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE], 'Upgrader' + Game.time, { memory: { role: 'upgrader' } });

    // Game.spawns.Spawn1.spawnCreep([CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE], 'Hauler' + Game.time, { memory: { role: 'hauler' } });
}

// Game.spawns.Spawn1.spawnCreep([WORK, CARRY, MOVE, MOVE], 'Explorer' + Game.time, { memory: { role: 'explorer' } });
Game.map.describeExits("W52S5")
//W52S4,W51S5,W52S6,W53S5
// get status of other rooms around
Object.values(Game.map.describeExits("W52S5")).forEach(m => { console.log(m, JSON.stringify(Game.map.getRoomStatus(m))); console.log(Object.keys(Game.map.getRoomStatus(m))) })

Game.creeps["Builder63973072"]

// function findRoomExit(creep: Creep, anotherRoomName: Room) {
//     if (creep.room != anotherRoomName) {
//         const exitDir = Game.map.findExit(creep.room, anotherRoomName);
//         const exit = creep.pos.findClosestByRange(exitDir);
//         creep.moveTo(exit);
//     }
// }
