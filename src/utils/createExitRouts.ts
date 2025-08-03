// the main goal of this is to build automatically a path of roads toward the room exits,
// for example from the spawn center towards the right exit

/* ## Research note
    to create a construction site we cna use `Room.createConstructionSite` method.
    I think we can combine find path with the find exits together.
    `Game.rooms.<RoomName>.createConstructionSite(10, 15, STRUCTURE_ROAD);`
    createConstructionSite(x, y, structureType, [name])
                        (pos, structureType, [name])
*/
