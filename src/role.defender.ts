import { debugLog } from "./utils/Logger";

function run(creep:Creep): void {
    let enemiesInRoom = creep.room.find(FIND_HOSTILE_CREEPS);
    const enemyStructures = Game.spawns.Spawn1.room.find(FIND_HOSTILE_STRUCTURES);

    if (enemiesInRoom.length >= 1) {
        // creep.say("Enemy found");
        let enemyTarget = enemiesInRoom[0]

        if (attackOrMove(creep, enemyTarget) === ERR_INVALID_TARGET) {
            let newTargets = _.filter(enemiesInRoom, (en) => en.id !== enemyTarget.id);
            attackOrMove(creep, newTargets[0])
        }
    } else if(enemyStructures.length > 0) {
        let enemyTarget = enemyStructures[0]

        if (attackOrMove(creep, enemyTarget) === ERR_INVALID_TARGET) {
            let newTargets = _.filter(enemyStructures, (en) => en.id !== enemyTarget.id);
            attackOrMove(creep, newTargets[0])
        }
    } else {
        // dispawn or moveback
        debugLog.debug("defender nothing");
    }
}
function attackOrMove(creep:Creep, target: Creep | AnyStructure) {
    let enemyInRange = creep.attack(target);
    if (enemyInRange === ERR_NOT_IN_RANGE) {
        creep.moveTo(target, { visualizePathStyle: { stroke: "#ee0000" } })
    }
    return enemyInRange;
}
let roleDefender = {
    /** @param {Creep} creep **/
    run ,
    attackOrMove,
};

export default roleDefender;
