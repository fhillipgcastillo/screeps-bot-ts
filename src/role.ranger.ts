import { debugLog } from "./utils/Logger";

/** @param {Creep} creep **/
function run(creep: Creep) {
    let enemiesInRoom = creep.room.find(FIND_HOSTILE_CREEPS);
    const enemyStructures = Game.spawns.Spawn1.room.find(FIND_HOSTILE_STRUCTURES);
    if (enemiesInRoom.length > 0) {
        // creep.say("Enemy found");
        let enemyTarget = enemiesInRoom[0]

        const attackAction = attackOrMove(creep, enemyTarget);
        if (attackAction === ERR_INVALID_TARGET) {
            let newTargets = _.filter(enemiesInRoom, (en) => en.id !== enemyTarget.id);
            attackOrMove(creep, newTargets[0])
        }
    } else if (enemyStructures.length > 0) {
        let enemyTarget = enemyStructures[0]

        const attackAction = attackOrMove(creep, enemyTarget);
        if (attackAction === ERR_INVALID_TARGET) {
            let newTargets = _.filter(enemyStructures, (en) => en.id !== enemyTarget.id);
            attackOrMove(creep, newTargets[0])
        }
    }
}

function attackOrMove(creep: Creep, target: Creep | AnyStructure) {
    let enemyInRange = creep.rangedAttack(target);

    if (enemyInRange === ERR_NOT_IN_RANGE) {
        // creep.say("Mv2Etgt ");
        const moveAction = creep.moveTo(target, { visualizePathStyle: { stroke: "#ee0000" } })
        debugLog.debug(creep.name, "move action "+moveAction);
    }
    return enemyInRange;
};

const roleRanger = {
    run,
    attackOrMove,
};

export default roleRanger;
