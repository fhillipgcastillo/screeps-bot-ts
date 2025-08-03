import { debugLog } from "./utils/Logger";

function getExitRoomNames(fromRoom: string) {
  return Game.map.describeExits(fromRoom);
}

function findOtherRoomsRoutes(spawn: StructureSpawn) {
  const spawnRoom = spawn.room.name;
  const exits = getExitRoomNames(spawnRoom);
  const exitsRoutes = [];

  for (let i in exits) {
    const exitName = exits[i as ExitKey];
    if (exitName) {
      exitsRoutes.push(Game.map.findRoute(exitName, spawnRoom));
    }
  }
  return exitsRoutes;
}
function findOtherRoomsExits(spawn: StructureSpawn) {
  const spawnRoom = spawn.room.name;
  const exits = getExitRoomNames(spawnRoom);
  const exitsInfo = [];

  for (let i in exits) {
    const exitName = exits[i as ExitKey];
    if (exitName) {
      exitsInfo.push(Game.map.findExit(Game.spawns.Spawn1.room.name, exitName));
    }
  }
  return exitsInfo;
}

// spawn an explorer
// Game.spawns.Spawn1.spawnCreep([WORK,  MOVE, MOVE], 'Explorer' + Game.time, { memory: { role: 'explorer', nextRole:'harvester' } });
// Game.spawns.Spawn1.spawnCreep([WORK,  MOVE, MOVE], 'Explorer' + Game.time, { memory: { role: 'explorer', nextRole:'hauler' } });

// getRoomStatus
// Object.values(Game.map.describeExits("W8N3")).forEach(m => { console.log(m, JSON.stringify(Game.map.getRoomStatus(m))); console.log(Object.keys()) })

function calculateDistance(pos1: RoomPosition, pos2: RoomPosition) {
  const roomDistance = Game.map.getRoomLinearDistance(pos1.roomName, pos2.roomName) * 50;
  const localDistance = Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2));
  return roomDistance + localDistance;
}

function findClosestPosition(creep: Creep, positions: RoomPosition[]) {
  let closestPos = null;
  let minDistance = Infinity;

  for (const pos of positions) {
    const distance = calculateDistance(creep.pos, pos);
    if (distance < minDistance) {
      minDistance = distance;
      closestPos = pos;
    }
  }

  return { closestPos, minDistance };
}

function sortPositionsByDistance(creep: Creep, positions: RoomPosition[]) {
  return positions.sort((posA, posB) => {
    const distanceA = calculateDistance(creep.pos, posA);
    const distanceB = calculateDistance(creep.pos, posB);
    return distanceA - distanceB; // Ascending order
  });
}

function findRoomExits(creep:Creep, spawn:StructureSpawn) {
  const exits = getExitRoomNames(spawn.room.name);
  let allExitInfo: RoomPosition[] = [];
  for (let e in exits) {
    const roomName = exits[e as ExitKey];
    if (roomName) {
      const exitDir: FindConstant | ERR_NO_PATH | ERR_INVALID_ARGS = Game.map.findExit(spawn.room, roomName);
      Game.rooms.find
      if (exitDir !== ERR_NO_PATH && exitDir !== ERR_INVALID_ARGS) {
        const exit = creep.pos.findClosestByRange(exitDir);
        if (exit) {
          allExitInfo.push(exit);
        }
      }
    }
  }
  return sortPositionsByDistance(creep, allExitInfo)
}

function explorer(creep: Creep, spawn: StructureSpawn) {
  creep.say("Expr");
  if (creep.room.name === spawn.room.name) {
    // console.log("findind exits");
    const exits = getExitRoomNames(spawn.room.name);
    let exitsPositions: RoomPosition[] = findRoomExits(creep, spawn);
    const target = exitsPositions[0];
    // const exit = creep.pos.findClosestByRange(Object.values(exits)[0]);
    // creep.moveTo(exit, { visualizePathStyle: { stroke: '#0066ff' } });
    creep.moveByPath(creep.pos.findPathTo(target));
  } else {
    let foundSources = creep.room.find(FIND_SOURCES);
    debugLog.debug("found source", foundSources)
    if (!creep.memory.sourceTarget) {
      let sourceTarget = creep.pos.findClosestByRange(foundSources);
      if (sourceTarget &&  creep.memory.nextRole) {
        creep.memory.role = creep.memory.nextRole;
        // creep.memory.nextRole = "harvester";
        // creep.memory.sourceTarget = sourceTarget?.id;
        creep.moveTo(sourceTarget)
      }

    } else {
      // creep.moveTo(sourceTarget)
    }

  }
}

export default {
  run: explorer,
}
