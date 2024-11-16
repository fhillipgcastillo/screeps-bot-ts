function explorer(creep: Creep) {
  if (creep.room.name !== "W51S5") {
    const exitDir: FindConstant | ERR_NO_PATH | ERR_INVALID_ARGS = Game.map.findExit(creep.room, "W51S5");
    if (exitDir !== ERR_NO_PATH && exitDir !== ERR_INVALID_ARGS) {
      const exit = creep.pos.findClosestByRange(exitDir);
      if (exit) {
        creep.moveTo(exit, { visualizePathStyle: { stroke: '#0066ff' } });
      }
    }
  } else {
    let foundSources = creep.room.find(FIND_SOURCES);
    console.log("found source", foundSources)
    if (!creep.memory.sourceTarget) {
      let sourceTarget = creep.pos.findClosestByRange(foundSources);
      if (sourceTarget) {
        creep.memory.role = "harvester";
        creep.memory.sourceTarget = sourceTarget?.id;
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
