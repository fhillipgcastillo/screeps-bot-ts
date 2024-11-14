let roleDefender = {
    /** @param {Creep} creep **/
    run: function (creep) {
        let enemiesInRoom = creep.room.find(FIND_HOSTILE_CREEPS);
        const enemyStructures = Game.spawns.Spawn1.room.find(FIND_HOSTILE_STRUCTURES);

        if (enemiesInRoom.length >= 1) {
            // creep.say("Enemy found");
            let enemyTarget = enemiesInRoom[0]

            if (this.attackOrMove(creep, enemyTarget) == ERR_INVALID_TARGET) {
                let newTargets = _.filter(enemiesInRoom, (en) => en.id !== enemyTarget.id);
                this.attackOrMove(creep, newTargets[0])
            }
        } else if(enemyStructures.length > 0) {
            let enemyTarget = enemyStructures[0]

            if (this.attackOrMove(creep, enemyTarget) == ERR_INVALID_TARGET) {
                let newTargets = _.filter(enemyStructures, (en) => en.id !== enemyTarget.id);
                this.attackOrMove(creep, newTargets[0])
            }
        } else {
            // dispawn or moveback
            
        }
    },
    attackOrMove: (creep, target) => {
        let enemyInRange = creep.attack(target);
        if (enemyInRange == ERR_NOT_IN_RANGE) {
            creep.moveTo(target, { visualizePathStyle: { stroke: "#ee0000" } })
        }
        return enemyInRange;
    },
    autoDispawn: (creep) => {

    }
};

module.exports = roleDefender;