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
        // h.memory.transfering = true;
    })

    _.filter(Game.creeps, (creep) => creep.memory.role == 'harvester').forEach(h => {
        h.memory.prevTargets = undefined;
        // h.memory.transfering = true;
    })

    _.filter(Game.creeps, (creep) => creep.memory.role == 'hauler').forEach(h => {
        h.memory.upgrading = false;
    })

    // find extensions structures
    Game.creeps["Harvester63959742"].room.find(FIND_MY_STRUCTURES, {filter: (s) => s.structureType === STRUCTURE_EXTENSION})
}
