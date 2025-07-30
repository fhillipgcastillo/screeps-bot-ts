// import * as _ from "lodash";
import { levelDefinitions } from "./levels.handler";

// const levelDefinitions = require("levels.handler");
// Game
// to do: need to extract te spawn of each role on their own methods/file.
const spawnManager = {
    run: function () {
        const harvesters = _.filter(Game.creeps, (creep) => creep.memory.role == 'harvester');
        const haulers = _.filter(Game.creeps, (creep) => creep.memory.role == 'hauler');
        const builders = _.filter(Game.creeps, (creep) => creep.memory.role == 'builder');
        const upgraders = _.filter(Game.creeps, (creep) => creep.memory.role == 'upgrader');
        const defenders = _.filter(Game.creeps, (creep) => creep.memory.role == 'defender');
        const rangers = _.filter(Game.creeps, (creep) => creep.memory.role == 'ranger');

        for (let name in Game.spawns) {
            const spawn = Game.spawns[name];
            if (spawn) {
                const currentLevel = spawn.room?.controller ? spawn.room?.controller.level : 1;
                const lvlString: string = currentLevel.toString();
                const levelHandler: { [name: string]: any } = levelDefinitions.hasOwnProperty(currentLevel.toString()) ? levelDefinitions[lvlString] : {};
                var enoughCreeps = harvesters.length >= levelHandler.harvesters.min
                    && haulers.length >= levelHandler.haulers.min
                    && upgraders.length >= levelHandler.upgraders.min
                    && builders.length >= levelHandler.builders.min;
                const avilableEnergy = spawn.room.energyAvailable;
                const energyCapacity = spawn.room.energyCapacityAvailable;


                if (Game.time % 5 == 0) {
                    console.log("Room Energy " + spawn.room.energyAvailable + "/" + spawn.room.energyCapacityAvailable);
                    console.log('Enough creeps: ' + enoughCreeps);
                    console.log('Harvesters: ' + harvesters.length);
                    console.log('Haulers: ' + haulers.length);
                    console.log('builders: ' + builders.length);
                    console.log('upgrader: ' + upgraders.length);
                    console.log('defenders: ' + defenders.length);
                    console.log('rangers: ' + rangers.length);
                }

                // TODO
                // Handle all the Spawners structures
                // calculate if we are in danger and if we don't have enought unnit defender/rangers, then spwn them over others
                // it need to be at least  3 harvester
                // if we are not in danger, workers will be the priority

                //auto spawn section
                // Level 1 controller
                if (currentLevel < 2 || harvesters.length < 3 || haulers.length < 4) {
                    this.handleInitialRC(spawn)
                } else if (currentLevel >= 2) {
                    var enemiesInRoom = spawn.room.find(FIND_HOSTILE_CREEPS);
                    if (enemiesInRoom.length <= 0) {
                        this.handleCL2(spawn);
                    } else if (enemiesInRoom.length > 0) {
                        // const enoughDefenders = 0;
                        console.log("enemies in the room");

                        if (energyCapacity <= 300) {
                            if (rangers.length < levelHandler.rangers.min) {
                                spawn.spawnCreep([TOUGH, RANGED_ATTACK, MOVE], 'Ranger' + Game.time, { memory: { role: 'ranger' } as CreepMemory });
                            } else if (defenders.length < levelHandler.defenders.min) {
                                spawn.spawnCreep([TOUGH, ATTACK, ATTACK, MOVE], 'Defender' + Game.time, { memory: { role: 'defender' } as CreepMemory });
                            }
                        } else if (energyCapacity >= 350) {
                            if (rangers.length < levelHandler.defenders.min) {
                                spawn.spawnCreep([TOUGH, RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE], 'Ranger' + Game.time, { memory: { role: 'ranger' } as CreepMemory });
                            } else if (defenders.length < 2) {
                                spawn.spawnCreep([TOUGH, ATTACK, ATTACK, MOVE, MOVE], 'Defender' + Game.time, { memory: { role: 'defender' } as CreepMemory });
                            }
                        } else {
                            if (rangers.length < levelHandler.rangers.max) {
                                spawn.spawnCreep([TOUGH, RANGED_ATTACK, MOVE], 'Ranger' + Game.time, { memory: { role: 'ranger' } as CreepMemory });
                            } else if (defenders.length < levelHandler.defenders.max) {
                                spawn.spawnCreep([TOUGH, ATTACK, MOVE], 'Defender' + Game.time, { memory: { role: 'defender' } as CreepMemory });
                            }
                        }
                    }
                }

                if (spawn.spawning) {
                    var spawningCreep = Game.creeps[spawn.spawning.name];
                    // console.log(Game.spawns['Spawn1'].spawning.name);
                    spawn.room.visual.text('🛠️' + spawningCreep.memory.role, spawn.pos.x + 1, spawn.pos.y, { align: 'left', opacity: 0.8 })
                }
            }
        }
    },
    handleInitialRC: function (spawn: StructureSpawn): void {
        // TODO: only store the amount of each one
        const harvesters = _.filter(Game.creeps, (creep) => creep.memory.role == 'harvester');
        const haulers = _.filter(Game.creeps, (creep) => creep.memory.role == 'hauler');
        const builders = _.filter(Game.creeps, (creep) => creep.memory.role == 'builder');
        const upgraders = _.filter(Game.creeps, (creep) => creep.memory.role == 'upgrader');
        // const defenders = _.filter(Game.creeps, (creep) => creep.memory.role == 'defender');
        // const rangers = _.filter(Game.creeps, (creep) => creep.memory.role == 'ranger');

        const currentLevel = spawn.room?.controller ? spawn.room?.controller.level : 1;
        const lvlString: string = currentLevel.toString();
        const levelHandler: { [name: string]: any } = levelDefinitions.hasOwnProperty(currentLevel.toString()) ? levelDefinitions[lvlString] : {};

        var enoughCreeps = harvesters.length >= levelHandler.harvesters.min
            && haulers.length >= levelHandler.haulers.min
            && upgraders.length >= levelHandler.upgraders.min
            && builders.length >= levelHandler.builders.min;
        const avilableEnergy = spawn.room.energyAvailable;
        const energyCapacity = spawn.room.energyCapacityAvailable;

        // when 0 harvester, create a quick cheap one so the first hauler spawn fast 200 body weight
        // when the first hauler as well need to have a cheap one (200 body weight)
        // when more that 1, then start consuming almomst all the energy, like 250 energy per spawn until level 2 or continue with cehap one until level 2?
        // when enough basic creeps (haulers and harvesters), auto render 1 container 1 right x or 2 next to te spawn position
        // after that start spawning the builders 2 or 3
        // after container is built, spawn the upgraders or jsut change the role of builders to upgraders or waint until certain point and start building Roads

        if ((avilableEnergy < 300
            || (
                harvesters.length <= levelHandler.harvesters.min
                || haulers.length <= levelHandler.haulers.min
                || builders.length <= levelHandler.builders.min
                || upgraders.length <= levelHandler.upgraders.min
            )
        )) {
            if (harvesters.length < 1 || harvesters.length < levelHandler.harvesters.min && haulers.length % 3 === 0) {
                // spawn.spawnCreep([WORK, WORK, MOVE, MOVE], 'Harvester' + Game.time, { memory: { role: 'harvester' } as CreepMemory });
                spawn.spawnCreep([WORK, WORK, MOVE], 'Harvester' + Game.time, { memory: { role: 'harvester' } as CreepMemory });
            } else if (haulers.length < levelHandler.haulers.min) {
                // spawn.spawnCreep([CARRY, MOVE, MOVE, MOVE], 'Hauler' + Game.time, { memory: { role: 'hauler' } as CreepMemory });
                spawn.spawnCreep([CARRY, MOVE, MOVE], 'Hauler' + Game.time, { memory: { role: 'hauler' } as CreepMemory });
            } else if (builders.length < levelHandler.builders.min) {
                spawn.spawnCreep([WORK, CARRY, MOVE, MOVE], 'Builder' + Game.time, { memory: { role: 'builder' } as CreepMemory });
            } else if (upgraders.length < levelHandler.upgraders.min) {
                spawn.spawnCreep([WORK, CARRY, MOVE, MOVE], 'Upgrader' + Game.time, { memory: { role: 'upgrader' } as CreepMemory });
            }
            return;
        } else if (enoughCreeps) {
            if (harvesters.length < levelHandler.harvesters.max) {
                spawn.spawnCreep([WORK, WORK, MOVE, MOVE], 'Harvester' + Game.time, { memory: { role: 'harvester' } as CreepMemory });
            } else if (haulers.length < levelHandler.haulers.max) {
                spawn.spawnCreep([CARRY, MOVE, MOVE, MOVE, MOVE], 'Hauler' + Game.time, { memory: { role: 'hauler' } as CreepMemory });
            } else if (builders.length < levelHandler.builders.max) {
                spawn.spawnCreep([WORK, CARRY, MOVE, MOVE], 'Builder' + Game.time, { memory: { role: 'builder' } as CreepMemory });
            } else if (upgraders.length < levelHandler.upgraders.max) {
                spawn.spawnCreep([WORK, CARRY, MOVE, MOVE], 'Upgrader' + Game.time, { memory: { role: 'upgrader' } as CreepMemory });
            }
            return;
        }
    },
    handleCL2: function (spawn: StructureSpawn) {
        const harvesters = _.filter(Game.creeps, (creep) => creep.memory.role == 'harvester');
        const haulers = _.filter(Game.creeps, (creep) => creep.memory.role == 'hauler');
        const builders = _.filter(Game.creeps, (creep) => creep.memory.role == 'builder');
        const upgraders = _.filter(Game.creeps, (creep) => creep.memory.role == 'upgrader');

        const currentLevel = spawn.room?.controller ? spawn.room?.controller.level : 1;
        const lvlString: string = currentLevel.toString();
        const levelHandler: { [name: string]: any } = levelDefinitions.hasOwnProperty(currentLevel.toString()) ? levelDefinitions[lvlString] : {};
        var enoughCreeps = harvesters.length >= levelHandler.harvesters.min
            && haulers.length >= levelHandler.haulers.min
            && upgraders.length >= levelHandler.upgraders.min
            && builders.length >= levelHandler.builders.min;
        const avilableEnergy = spawn.room.energyAvailable;
        const energyCapacity = spawn.room.energyCapacityAvailable;

        if (energyCapacity <= 300 && !enoughCreeps) {
            if (harvesters.length < levelHandler.harvesters.min && haulers.length % 3 === 0) {
                spawn.spawnCreep([WORK, WORK, MOVE, MOVE], 'Harvester' + Game.time, { memory: { role: 'harvester' } as CreepMemory });
            } else if (haulers.length < levelHandler.haulers.min) {
                spawn.spawnCreep([CARRY, CARRY, CARRY, MOVE, MOVE, MOVE], 'Hauler' + Game.time, { memory: { role: 'hauler' } as CreepMemory });
            } else if (builders.length < levelHandler.builders.min) {
                spawn.spawnCreep([WORK, WORK, CARRY, MOVE], 'Builder' + Game.time, { memory: { role: 'builder' } as CreepMemory });
            } else if (upgraders.length < levelHandler.upgraders.min) {
                spawn.spawnCreep([WORK, WORK, CARRY, MOVE], 'Upgrader' + Game.time, { memory: { role: 'upgrader' } as CreepMemory });
            }
            return;
        } else if (energyCapacity <= 300 && enoughCreeps) {
            if (harvesters.length < levelHandler.harvesters.max && harvesters.length > 1 && haulers.length > 4) {
                spawn.spawnCreep([WORK, WORK, MOVE, MOVE], 'Harvester' + Game.time, { memory: { role: 'harvester' } as CreepMemory });
            } else if (haulers.length < levelHandler.haulers.max) {
                spawn.spawnCreep([CARRY, CARRY, CARRY, MOVE, MOVE, MOVE], 'Hauler' + Game.time, { memory: { role: 'hauler' } as CreepMemory });
            } else if (builders.length < levelHandler.builders.max) {
                spawn.spawnCreep([WORK, CARRY, WORK, MOVE, MOVE], 'Builder' + Game.time, { memory: { role: 'builder' } as CreepMemory });
            } else if (upgraders.length < levelHandler.upgraders.max) {
                spawn.spawnCreep([WORK, CARRY, WORK, MOVE, MOVE], 'Upgrader' + Game.time, { memory: { role: 'upgrader' } as CreepMemory });
            }
            return;
        }
        if (energyCapacity >= 350 && energyCapacity <= 400 && !enoughCreeps) {
            if (harvesters.length < levelHandler.harvesters.min && haulers.length > 3) {
                spawn.spawnCreep([WORK, WORK, WORK, MOVE], 'Harvester' + Game.time, { memory: { role: 'harvester' } as CreepMemory });
            } else if (haulers.length < levelHandler.haulers.min) {
                spawn.spawnCreep([CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE], 'Hauler' + Game.time, { memory: { role: 'hauler' } as CreepMemory });
            } else if (builders.length < levelHandler.builders.min) {
                spawn.spawnCreep([WORK, CARRY, WORK, CARRY, MOVE, MOVE], 'Builder' + Game.time, { memory: { role: 'builder' } as CreepMemory });
            } else if (upgraders.length < levelHandler.upgraders.min) {
                spawn.spawnCreep([WORK, CARRY, WORK, CARRY, MOVE], 'Upgrader' + Game.time, { memory: { role: 'upgrader' } as CreepMemory });
            }
        } else {
            if (energyCapacity >= 351 && energyCapacity <= 400 && enoughCreeps) {
                if (harvesters.length < levelHandler.harvesters.max && harvesters.length > 1 && haulers.length > 4) {
                    spawn.spawnCreep([WORK, WORK, WORK, MOVE, MOVE], 'Harvester' + Game.time, { memory: { role: 'harvester' } as CreepMemory });
                }
                else if (haulers.length < levelHandler.haulers.max) {
                    spawn.spawnCreep([CARRY, CARRY, CARRY, MOVE, MOVE, MOVE], 'Hauler' + Game.time, { memory: { role: 'hauler' } as CreepMemory });
                } else if (builders.length < levelHandler.builders.max) {
                    spawn.spawnCreep([WORK, CARRY, CARRY, WORK, WORK, MOVE], 'Builder' + Game.time, { memory: { role: 'builder' } as CreepMemory });
                } else if (upgraders.length < levelHandler.upgraders.max) {
                    spawn.spawnCreep([WORK, CARRY, CARRY, WORK, WORK, MOVE], 'Upgrader' + Game.time, { memory: { role: 'upgrader' } as CreepMemory });
                }
            }
            return;
        }
        if (energyCapacity > 400 && energyCapacity < 450 && !enoughCreeps) {
            if (harvesters.length < levelHandler.harvesters.min && harvesters.length > 1 && haulers.length % 2) {
                spawn.spawnCreep([WORK, WORK, WORK, MOVE, MOVE], 'Harvester' + Game.time, { memory: { role: 'harvester' } as CreepMemory });
            } else if (builders.length < levelHandler.builders.min) {
                spawn.spawnCreep([WORK, CARRY, CARRY, WORK, WORK, MOVE], 'Builder' + Game.time, { memory: { role: 'builder' } as CreepMemory });
            } else if (upgraders.length < levelHandler.upgraders.min) {
                spawn.spawnCreep([WORK, CARRY, CARRY, WORK, WORK, MOVE], 'Upgrader' + Game.time, { memory: { role: 'upgrader' } as CreepMemory });
            }
        } else {
            if (energyCapacity >= 451 && energyCapacity <= 500 && enoughCreeps) {
                if (harvesters.length < levelHandler.harvesters.max && harvesters.length > 1 && haulers.length % 4) {
                    spawn.spawnCreep([WORK, WORK, WORK, WORK, MOVE, MOVE], 'Harvester' + Game.time, { memory: { role: 'harvester' } as CreepMemory });
                } else if (builders.length < levelHandler.builders.max) {
                    spawn.spawnCreep([WORK, WORK, CARRY, WORK, CARRY, MOVE], 'Builder' + Game.time, { memory: { role: 'builder' } as CreepMemory });
                } else if (upgraders.length < levelHandler.upgraders.max) {
                    spawn.spawnCreep([WORK, WORK, CARRY, WORK, CARRY, MOVE], 'Upgrader' + Game.time, { memory: { role: 'upgrader' } as CreepMemory });
                }
            }
            return;
        }
        if (energyCapacity >= 450 && energyCapacity < 500 && !enoughCreeps) {
            if (harvesters.length < levelHandler.harvesters.max) {
                spawn.spawnCreep([WORK, WORK, CARRY, WORK, CARRY, MOVE], 'Harvester' + Game.time, { memory: { role: 'harvester' } as CreepMemory });
            } else if (builders.length < levelHandler.builders.max) {
                spawn.spawnCreep([WORK, WORK, CARRY, WORK, CARRY, MOVE], 'Builder' + Game.time, { memory: { role: 'builder' } as CreepMemory });
            } else if (upgraders.length < levelHandler.upgraders.max) {
                spawn.spawnCreep([WORK, WORK, CARRY, WORK, CARRY, MOVE], 'Upgrader' + Game.time, { memory: { role: 'upgrader' } as CreepMemory });
            }
            return;
        } else if (energyCapacity >= 450 && energyCapacity < 500 && enoughCreeps) {
            if (harvesters.length < levelHandler.harvesters.max) {
                spawn.spawnCreep([WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE], 'Harvester' + Game.time, { memory: { role: 'harvester' } as CreepMemory });
            } else if (builders.length < levelHandler.builders.max) {
                spawn.spawnCreep([WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE], 'Builder' + Game.time, { memory: { role: 'builder' } as CreepMemory });
            } else if (upgraders.length < levelHandler.upgraders.max) {
                spawn.spawnCreep([WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE], 'Upgrader' + Game.time, { memory: { role: 'upgrader' } as CreepMemory });
            }
            return;
        }
        if (energyCapacity >= 500 && !enoughCreeps) {
            if (harvesters.length < levelHandler.harvesters.min && avilableEnergy >= 450) {
                spawn.spawnCreep([WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE], 'Harvester' + Game.time, { memory: { role: 'harvester' } as CreepMemory });
            } else if (haulers.length < levelHandler.haulers.min && avilableEnergy >= 450) {
                spawn.spawnCreep([CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE], 'Hauler' + Game.time, { memory: { role: 'hauler' } as CreepMemory });
            } else if (builders.length < levelHandler.builders.min && avilableEnergy >= 450) {
                spawn.spawnCreep([WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE], 'Builder' + Game.time, { memory: { role: 'builder' } as CreepMemory });
            } else if (upgraders.length < levelHandler.upgraders.min && avilableEnergy >= 450) {
                spawn.spawnCreep([WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE], 'Upgrader' + Game.time, { memory: { role: 'upgrader' } as CreepMemory });
            }
        } else if (energyCapacity >= 500 && enoughCreeps) {
            if (harvesters.length < levelHandler.harvesters.max && avilableEnergy >= 450) {
                spawn.spawnCreep([WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE], 'Harvester' + Game.time, { memory: { role: 'harvester' } as CreepMemory });
            } else if (haulers.length < levelHandler.haulers.max && avilableEnergy >= 450) {
                spawn.spawnCreep([CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE], 'Hauler' + Game.time, { memory: { role: 'hauler' } as CreepMemory });
            } else if (builders.length < levelHandler.builders.max && avilableEnergy >= 450) {
                spawn.spawnCreep([WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE], 'Builder' + Game.time, { memory: { role: 'builder' } as CreepMemory });
            } else if (upgraders.length < levelHandler.upgraders.max && avilableEnergy >= 450) {
                spawn.spawnCreep([WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE], 'Upgrader' + Game.time, { memory: { role: 'upgrader' } as CreepMemory });
            }
            return;
        }
        if (energyCapacity >= 550 && !enoughCreeps && avilableEnergy > 450) {
            console.log("> 550 not enf")
            if (upgraders.length < levelHandler.upgraders.min) {
                spawn.spawnCreep([WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE], 'Upgrader' + Game.time, { memory: { role: 'upgrader' } as CreepMemory });
            } else if (haulers.length < levelHandler.haulers.min) {
                spawn.spawnCreep([CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE], 'Hauler' + Game.time, { memory: { role: 'hauler' } as CreepMemory });
            } else if (harvesters.length < levelHandler.harvesters.min) {
                spawn.spawnCreep([WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE], 'Harvester' + Game.time, { memory: { role: 'harvester' } as CreepMemory });
            } else if (builders.length < levelHandler.builders.min) {
                spawn.spawnCreep([WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE], 'Builder' + Game.time, { memory: { role: 'builder' } as CreepMemory });
            }
        } else if (energyCapacity >= 550 && enoughCreeps) {
            if (upgraders.length < levelHandler.upgraders.max) {
                spawn.spawnCreep([WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE], 'Upgrader' + Game.time, { memory: { role: 'upgrader' } as CreepMemory });
            } else if (haulers.length < levelHandler.haulers.max) {
                spawn.spawnCreep([CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE], 'Hauler' + Game.time, { memory: { role: 'hauler' } as CreepMemory });
            } else if (harvesters.length < levelHandler.harvesters.max) {
                spawn.spawnCreep([WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE], 'Harvester' + Game.time, { memory: { role: 'harvester' } as CreepMemory });
            } else if (builders.length < levelHandler.builders.max) {
                spawn.spawnCreep([WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE], 'Builder' + Game.time, { memory: { role: 'builder' } as CreepMemory });
            }
        } else {
            console.log("No more energy")
        }
    }
};

export default spawnManager;
