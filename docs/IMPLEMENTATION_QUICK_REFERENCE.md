# Quick Reference: Tiga Strategy Implementation

## What Was Changed

### 1. **Spawn Sequence** (spawn.manager.ts)
The bot now follows Tiga's proven early-game spawning sequence:
1. **First Harvester** (200 energy) → 1 stationary harvester
2. **First Hauler** (150 energy) → needs ≥1 harvester
3. **Second Harvester** (200 energy) → needs ≥1 hauler
4. **Second Hauler** (150 energy) → completes the pair
5. **Scale Up** → continues with dynamic limits based on room level

**Key:** Harvesters are always spawned before haulers are doubled, ensuring supply meets demand.

---

### 2. **Hauler Queue System** (role.hauler.ts)
Harvesters drop energy, and haulers wait in a queue before picking it up.

**How it works:**
- Each source has a queue of waiting haulers
- Haulers only pick up energy when:
  - They're first in queue (position = 0)
  - AND energy accumulated ≥ 50 energy (ENERGY_THRESHOLD)
- Haulers see their queue position via `creep.say()` display

**Memory structure:**
```javascript
Memory.sources[sourceId].queue = {
  order: ["HaulerA", "HaulerB", "HaulerC"],    // Queue order
  accumulation: 75                              // Total energy at source
}
```

---

### 3. **Per-Source Team Tracking** (spawn.manager.ts)
Creeps are assigned to sources, not globally managed.

**How it works:**
- New harvesters auto-assign to source with fewest harvesters
- New haulers auto-assign to source with fewest haulers
- Each source tracks its team: harvesters + haulers

**Memory structure:**
```javascript
Memory.sources[sourceId].team = {
  harvesters: ["HarvesterA", "HarvesterB"],     // Source's harvesters
  haulers: ["HaulerA", "HaulerB", "HaulerC"],  // Source's haulers
  maxHaulers: 4                                  // Flexible limit
}
```

**How assignment works:**
```
Source 1: 2 harvesters, 3 haulers
Source 2: 2 harvesters, 2 haulers   ← New hauler goes here (lowest count)
Source 3: 1 harvester,  1 hauler    ← New harvester goes here (lowest count)
```

---

### 4. **Stationary Harvester** (role.harvester_stationary.ts)
Harvesters move to source and harvest until full, then drop all energy.

**Before:**
```typescript
if (creep.store[RESOURCE_ENERGY] > 5) {
    creep.drop(RESOURCE_ENERGY, 5)  // Drop 5 energy, keep harvesting
}
```

**After:**
```typescript
if (creep.store.getFreeCapacity() === 0) {
    creep.drop(RESOURCE_ENERGY)     // Drop ALL when full
} else {
    this.harvest(creep);            // Keep harvesting
}
```

**Benefit:** Larger energy drops mean fewer hauler trips and better queue efficiency.

---

### 5. **State Logging** (StateLogger.ts)
New logging utility for debugging and monitoring system behavior.

**Available logs:**
- `StateLogger.logStateChange()` - Track creep role state transitions
- `StateLogger.logQueuePosition()` - Monitor queue positions and thresholds
- `StateLogger.logTeamAssignment()` - Verify team assignments
- `StateLogger.logSourceAccumulation()` - Track energy buildup at sources
- `StateLogger.logSpawnSequence()` - Monitor spawn progression

**Usage in code:**
```typescript
StateLogger.logQueuePosition(creepName, sourceId, queuePos, queueLen, energyAcc, threshold);
```

---

## Memory Structure

The bot now uses this global memory structure:

```javascript
Memory.sources = {
  "5991d8217b6c350064fbc32f": {          // Source ID
    team: {
      harvesters: ["Harvester1624", "Harvester1625"],
      haulers: ["Hauler1626", "Hauler1627", "Hauler1628"],
      maxHaulers: 4
    },
    queue: {
      order: ["Hauler1626", "Hauler1627", "Hauler1628"],
      accumulation: 95
    }
  },
  // ... more sources
}
```

---

## How the System Works Together

### Energy Flow:
1. **Harvester** moves to source, harvests until full
2. **Harvester** drops full load of energy at source location
3. **Energy accumulates** at source (Memory.sources[id].queue.accumulation increments)
4. **Haulers wait** in queue, checking accumulation vs threshold
5. **First hauler** in queue picks up when energy ≥ 50
6. **Hauler** delivers to spawn/containers
7. **Queue rotates** - next hauler in queue can now pickup

### Example Timeline:
```
Tick 1:   Harvester drops 30 energy (accumulation = 30)
Tick 2:   Harvester drops 35 energy (accumulation = 65)
Tick 3:   Hauler[0] sees 65 ≥ 50 threshold, picks up, queue updates
Tick 4:   Hauler[1] now first in queue, waits for next drop
Tick 5:   Harvester drops 40 energy (accumulation = 40)
Tick 6:   Hauler[1] waits (40 < 50), Harvester drops 35 (accumulation = 75)
Tick 7:   Hauler[1] sees 75 ≥ 50, picks up, queue updates
```

---

## Debugging Tips

### Check Queue Status:
```javascript
// In game console:
console.log(JSON.stringify(Memory.sources, null, 2))

// Or specific source:
Object.values(Memory.sources)[0]
```

### Monitor Creep Queue Position:
- Creeps display their queue position via `creep.say()`
- Example: "Queue: 0" = first in line, "Queue: 2" = third in line

### Verify Team Assignments:
- Check game logs for "assigned to Source" messages
- Confirm all harvesters/haulers have `memory.sourceId` set

### Track Energy Accumulation:
- Enable StateLogger debug mode:
```typescript
StateLogger.setDebugMode(true)
```
- Monitor `Memory.sources[sourceId].queue.accumulation` values
- Adjust `ENERGY_THRESHOLD` if haulers are waiting too long

---

## Configuration

### Key Constants:

**role.hauler.ts:**
- `ENERGY_THRESHOLD = 50` - Energy needed before first hauler in queue moves
- `QUEUE_UPDATE_INTERVAL = 5` - Ticks between queue updates

**spawn.manager.ts:**
- Flexible hauler count per source (scales based on room level)
- Harvester count targets scale with room level

### To Adjust:
1. Increase `ENERGY_THRESHOLD` → haulers wait longer (more efficient but slower)
2. Decrease `ENERGY_THRESHOLD` → haulers move more often (faster but uses more energy)
3. Modify team assignment logic in `assignCreepToSourceTeam()` for load balancing

---

## Expected Behavior

### Early Game (RCL 1-2):
- Spawn 1 harvester, then 1 hauler, then 2 each
- Stationary harvester drops full batches
- Single hauler queue per source
- Minimal movement waste

### Growth Phase:
- Harvesters/haulers scale up
- Multiple harvesters per source
- Longer queues (3-4 haulers per source)
- Better energy throughput

### Efficiency Metrics:
- ✅ Harvesters always harvesting (stationary)
- ✅ Haulers wait efficiently instead of wandering
- ✅ Energy drops are large (full capacity)
- ✅ Queues prevent energy bottlenecks

---
