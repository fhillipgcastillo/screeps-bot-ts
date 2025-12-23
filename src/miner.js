
// mineral miner extractor code example based on a hardcoded creep named Isabella
// reference documentation: https://docs.screeps.com/resources.html#Minerals

let isabella = Game.creeps['Isabella'];
let isabellaState = "idle";

() => {
    if (isabella) {
        let freeCarrySpace = isabella.store.getFreeCapacity();
        if (isabellaState === "idle") {
            isabellaState = "mining";
        }
        if (isabellaState === "mining") {
            let mineral = isabella.room.find(FIND_MINERALS)[0];
            if (mineral.mineralAmount > 0) {
                if (freeCarrySpace > 0) {
                    let isabellaAction = isabella.harvest(mineral);
                    if (isabellaAction === ERR_NOT_IN_RANGE) {
                        isabella.say(" 🚶‍♀️"+ JSON.stringify(mineral.pos));
                        isabella.moveTo(mineral);
                    } else {
                        isabella.say(" ⛏️"+isabellaAction);
                    }
                } else {
                    isabellaState = "depositing";
                }
            } else {
                isabellaState = "idle";
            }
        }
        if (isabellaState === "depositing") {
            let terminal = isabella.room.terminal || isabella.room.storage;
            if (terminal) {
                if (isabella.transfer(terminal, mineral.mineralType) === ERR_NOT_IN_RANGE) {
                    isabella.moveTo(terminal);
                } else {
                    isabellaState = "mining";
                }
            } else {
                isabellaState = "idle";
            }
        }
    }
}
