# Deeper Dive into Screeps: Worlds advanced spawn strategies
To create an effective and detailed spawn strategy, consider these elements for your implementation:

## 1. Spawn queue design
- Priority system: Implement a system to assign priorities to different creep roles. For example:
  - High priority: Emergency harvesters, room defenders, repairers (critical infrastructure).
  - Medium priority: Standard harvesters, upgraders, builders (necessary for growth and maintenance).
  - Low priority: Remote miners, haulers for remote mining, claimers.
- Requesting creeps: Creeps or structures (like towers low on energy or a dying harvester at a source) can submit
requests to the spawn queue. Include:
  - Role: The required role (e.g., 'harvester', 'builder').
  - Body parts: The desired body parts (or a function to determine the optimal body based on RCL and energy).
  - Memory: Pre-configured memory for the new creep (e.g., target source ID, home room, role).
  - Urgency: A priority level for the request.
- Queue management:
  - Maintain a queue (e.g., an array in Memory.spawnQueue) where requests are added.
  - Process the queue: Iterate through the queue, check if a spawn is available, and attempt to spawn the highest-priority creep.
  - Remove successful requests from the queue.

## 2. Dynamic creep body creation
- RCL-dependent bodies: The Game.spawns.Spawn1.spawnCreep() function creates a new creep based on the provided body parts and memory. This is crucial to optimize creep efficiency as your room control level (RCL) increases and your available energy capacity grows. You can use a function that determines the best creep body based on:
  - Room.energyCapacityAvailable: The total energy available in the room (spawn + extensions).
  - RCL: Higher RCL allows more body parts.
  - Role: Each role has different needs (e.g., 'work' parts for harvesters/upgraders, 'carry' parts for haulers, 'attack' or 'heal' for combat).

Example (simplified)
```javascript
function createCreepBody(room, role) {
    let maxEnergy = room.energyCapacityAvailable;
    let body = [];

    switch (role) {
        case 'harvester':
            // Prioritize WORK parts, then CARRY/MOVE
            while (maxEnergy >= 200 && body.filter(p => p === WORK).length < 5) { // Max 5 WORK for source saturation
                body.push(WORK);
                body.push(CARRY);
                body.push(MOVE);
                maxEnergy -= 200;
            }
            // Add more CARRY/MOVE if energy remains
            while (maxEnergy >= 100 && body.filter(p => p === MOVE).length < 10) {
                body.push(CARRY);
                body.push(MOVE);
                maxEnergy -= 100;
            }
            break;
        case 'upgrader':
            // Prioritize WORK for upgrading
            while (maxEnergy >= 100 && body.filter(p => p === WORK).length < 15) {
                body.push(WORK);
                body.push(CARRY);
                body.push(MOVE);
                maxEnergy -= 200;
            }
            break;
        // ... other roles
    }
    return body;
}
```
Use code with caution.


## 3. Energy management and safe mode
- "Cold start" / emergency spawning: Implement a specific module or function that activates when the room's energy reserves fall below a critical threshold (e.g., spawn.energy is low and no extensions are full).
  - This function should prioritize spawning the cheapest possible 'bootstrap' harvester (e.g., [WORK, CARRY, MOVE]) to bring energy back to the spawn.
  - All other spawn requests should be suspended until the emergency is resolved.
- Pre-filling extensions: For larger creeps, the spawn requires energy from both itself and its extensions. Your spawning code should wait until enough energy is available in the spawn and its extensions before requesting a large creep. You could check room.energyAvailable against the cost of the requested creep body.
- Predictive spawning: For roles like harvesters, the system should track their ticksToLive and the travel time to their work location.
  - Calculate when a replacement harvester should be spawned to arrive at the source before the current harvester expires, ensuring continuous energy flow.
  - Example: If a harvester at a source has 100 ticks to live and it takes 50 ticks for a new harvester to spawn and travel to the source, the replacement request should be queued at ticksToLive = 150.

## 4. Memory management for creep roles and tasks
- Clear creep memory on death: Regularly clear the Memory of dead creeps to save CPU usage when parsing the memory object each tick. You can achieve this by iterating through Memory.creeps and checking if Game.creeps[creepName] exists.
- Role assignment in memory: When spawning a creep, assign its role to creep.memory.role. This allows your main loop to easily call the appropriate role-specific logic (e.g., roleHarvester.run(creep)).
- Task-based memory: Beyond simple roles, you can implement a more dynamic task system where creeps store their current task (e.g., 'harvesting', 'building', 'upgrading') and associated targets in their memory.
  - This enables greater flexibility, allowing creeps to switch tasks if their current one is completed or becomes impossible.
  - Example: A builder finishes all construction sites and is reassigned to repair structures or upgrade the controller.

## 5. Multi-room expansion
- Claimer spawning: When expanding to new rooms, your spawn system needs to be able to create claimer creeps, which require the CLAIM body part.
  - `CLAIM` parts reduce creep lifetime to 500 ticks, so they should be paired efficiently with MOVE parts.
  - The claimer's memory should include the targetRoom to guide its movement.
- Remote mining creeps: For mining distant sources, spawn specialized remote miner and hauler creeps.
  - Remote miner memory should store the source ID and its assigned container ID.
  - Hauler memory should include the path to the remote source/container and the home storage/spawn.
- Spawn assist / resource sharing: At higher GCLs, consider using a centralized spawning room with high energy capacity and CPU to spawn creeps for other, less developed rooms.

## 6. Spawn performance and optimization
- Spawn uptime: Aim for 100% spawn uptime, meaning the spawn is always actively creating creeps when needed. This requires a consistent energy supply to the spawn and its extensions.
Body part cost calculation: Be aware that each body part costs a certain amount of energy (e.g., 50 for MOVE, CARRY, ATTACK, RANGED_ATTACK, HEAL; 10 for TOUGH; 100 for WORK; 600 for CLAIM).
- Spawn time: Each body part takes 3 ticks to spawn, so larger creeps take longer. This needs to be factored into predictive spawning logic.
- CPU efficiency: Optimize your spawn logic to minimize CPU usage. Avoid unnecessary loops and complex calculations each tick. Consider caching frequently used data.
By systematically implementing these components and carefully considering the interplay between RCL, energy, and creep roles, you can build a robust and efficient spawn strategy for your Screeps: Worlds colony.

