// var roleHarvester = require('role.harvester');
var roleHarvester = require('role.harvester_stationary');
var roleHauler = require('role.hauler');
var roleUpgrader = require('role.upgrader');
var roleBuilder = require('role.builder');
var roleDefender = require('role.defender');
var roleRanger = require('role.ranger');
var spawnManager = require('spawn.manager');


module.exports.loop = function () {
    // clean up memory from death creeps
    const activeCreeps = _.filter(Game.creeps, (creep => !creep.spawning));

    for (var name in Memory.creeps) {
        if (!Game.creeps[name]) {
            delete Memory.creeps[name];
            console.log('Clearing non-existing creep memory:', name);
        }
    }
    
    // auto spawn harvesters
    spawnManager.run();
    
    //auto activate safe mode
    if(Game.spawns.Spawn1.room.controller.level >= 2 && Game.spawns.Spawn1.room.controller.safeModeAvailable) {
        Game.spawns.Spawn1.room.controller.activateSafeMode();
    } 
    if (Game.spawns.Spawn1.room.controller.level === 3) {
        var tower = Game.getObjectById('2702f7754f7e3bbdd0f32215');
        if (tower) {
            // heal
            var closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, { filter: (structure) => structure.hits < structure.hitsMax })
            if (closestDamagedStructure) {
                tower.repair(closestDamagedStructure);
            }

            // attack
            var closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
            if (closestHostile) {
                tower.attack(closestHostile);
            }

        }
    }

    for (var name in activeCreeps) {
        var creep = activeCreeps[name];
        if (creep.memory.role == 'harvester') {
            roleHarvester.run(creep);
        } else if (creep.memory.role == 'hauler') {
            roleHauler.run(creep);
        } else if (creep.memory.role == 'upgrader') {
            roleUpgrader.run(creep);
        } else if (creep.memory.role == 'builder') {
            roleBuilder.run(creep);
        } else if (creep.memory.role == 'defender') {
            roleDefender.run(creep);
        } else if ( creep.memory.role == 'ranger') {
            roleRanger.run(creep);
        }
    }
}