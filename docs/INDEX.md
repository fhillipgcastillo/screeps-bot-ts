# Tiga Strategy Implementation - Documentation Index

## 📋 Overview

Your Screeps bot has been successfully refactored to implement **Tiga's proven early-game strategy**. This index guides you through all documentation and changes.

---

## 📚 Documentation Files (in /docs)

### 1. **[IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md)** ⭐ START HERE
**Best for:** Overall understanding, file locations, and what changed
- Complete summary of all phases
- File references with line numbers
- Memory structure overview
- Testing recommendations
- Configuration guide

### 2. **[implementation-strategy.md](implementation-strategy.md)**
**Best for:** Detailed strategic planning and implementation details
- Strategic framework from Tiga's analysis
- 5 phases with full implementation details
- Memory structure specifications
- Code changes by file
- Expected outcomes

### 3. **[IMPLEMENTATION_QUICK_REFERENCE.md](IMPLEMENTATION_QUICK_REFERENCE.md)**
**Best for:** Quick understanding of how the system works
- What was changed and why
- How each component works
- Example memory structures
- Timeline examples
- Debugging tips
- Configuration constants

---

## 🔧 Code Changes Summary

### New Files Created:
| File | Purpose |
|------|---------|
| `src/utils/logger/StateLogger.ts` | Comprehensive state logging utility |

### Files Modified:
| File | Changes |
|------|---------|
| `src/spawn.manager.ts` | Tiga's spawn sequence + per-source team assignment |
| `src/role.hauler.ts` | Queue system with 50+ energy threshold |
| `src/role.harvester_stationary.ts` | Auto-drop at full capacity |
| `src/utils/logger/index.ts` | Exported StateLogger |
| `src/types.ts` | Added Memory.sources type definitions |

---

## 🎯 The 5 Phases

### Phase 1: Spawn Sequence ✅
- **What:** Implement Tiga's proven spawn order (1H → 1U → 2H → 2U)
- **Where:** [src/spawn.manager.ts](../src/spawn.manager.ts#L185-L224)
- **Result:** Optimal early game progression

### Phase 2: Hauler Queue System ✅
- **What:** Queue-based hauler coordination with 50+ energy threshold
- **Where:** [src/role.hauler.ts](../src/role.hauler.ts#L155-L181)
- **Result:** Efficient energy pickup without greedy gathering

### Phase 3: Per-Source Team Tracking ✅
- **What:** Group harvesters and haulers by source
- **Where:** [src/spawn.manager.ts](../src/spawn.manager.ts#L527-L602)
- **Result:** Balanced team composition and automatic load balancing

### Phase 4: State Logging ✅
- **What:** Comprehensive logging for debugging and monitoring
- **Where:** [src/utils/logger/StateLogger.ts](../src/utils/logger/StateLogger.ts)
- **Result:** Full visibility into system behavior

### Phase 5: Stationary Harvester ✅
- **What:** Auto-drop at full capacity for larger energy batches
- **Where:** [src/role.harvester_stationary.ts](../src/role.harvester_stationary.ts#L5-L16)
- **Result:** Better queue efficiency

---

## 🚀 Quick Start Testing

### 1. Deploy the code
```bash
npm run build
npm run push
```

### 2. Monitor early game
- Watch spawn sequence: 1H → 1U → 2H → 2U
- Check Team.sources structure in game console

### 3. Check queue system
- Monitor creep.say() output for queue positions
- Verify energy accumulation in Memory.sources[sourceId].queue.accumulation

### 4. Enable logging (optional)
```javascript
// In game console:
const { StateLogger } = require('utils/logger/StateLogger');
StateLogger.setDebugMode(true);
```

### 5. Verify system health
```javascript
// In game console:
console.log(JSON.stringify(Memory.sources, null, 2))
```

---

## 📊 Memory Structure

```javascript
Memory.sources = {
  "5991d8217b6c350064fbc32f": {    // Source ID
    team: {
      harvesters: ["Harvester1624", "Harvester1625"],
      haulers: ["Hauler1626", "Hauler1627", "Hauler1628"],
      maxHaulers: 4
    },
    queue: {
      order: ["Hauler1626", "Hauler1627"],     // Queue sequence
      accumulation: 95                          // Total energy at source
    }
  }
}
```

---

## ⚙️ Configuration Constants

### Energy Threshold (role.hauler.ts)
```typescript
ENERGY_THRESHOLD = 50    // Adjust based on performance
                         // Higher = longer wait, more efficiency
                         // Lower = more movement, faster pickup
```

### Queue Update Interval (role.hauler.ts)
```typescript
QUEUE_UPDATE_INTERVAL = 5    // Ticks between queue updates
```

### Team Assignment (spawn.manager.ts)
```typescript
// Automatic per-source assignment
// Harvesters → source with fewest harvesters
// Haulers → source with fewest haulers
```

---

## 🔍 Debugging Guide

### Issue: Haulers not picking up energy
**Check:**
1. Queue position: `Memory.sources[sourceId].queue.order`
2. Energy accumulation: `Memory.sources[sourceId].queue.accumulation`
3. Verify threshold: should be ≥ 50

### Issue: Spawn sequence not following Tiga pattern
**Check:**
1. Game time and energy available
2. Current creep counts
3. Verify code in spawn.manager.ts lines 185-224

### Issue: Teams not balanced
**Check:**
1. Team structure: `Memory.sources[sourceId].team`
2. Verify assignment logic in spawn.manager.ts
3. Check for dead creeps not removed from memory

### View System Status
```javascript
// All sources at once:
console.log(JSON.stringify(Memory.sources, null, 2))

// Specific source energy:
Object.values(Memory.sources)[0].queue.accumulation

// Specific source queue:
Object.values(Memory.sources)[0].queue.order

// Specific team:
Object.values(Memory.sources)[0].team
```

---

## 📈 Expected Improvements

| Metric | Before | After |
|--------|--------|-------|
| Harvester efficiency | Varies | 100% (stationary) |
| Hauler coordination | Greedy | Queue-based |
| Energy drop size | 5 per tick | Full capacity |
| Early game speed | Flexible | Tiga's optimal |
| System visibility | Limited | Full logging |

---

## ✅ Compilation Status

**Status:** ✅ **COMPLETE**
- No critical errors
- All type definitions added
- StateLogger exported
- Ready for deployment

**Note:** TypeScript deprecation warnings in tsconfig.json are not critical and don't affect functionality.

---

## 🎓 Key Concepts

### Stationary Harvester
Harvester moves to source once and stays there, harvesting until full, then drops entire load. This is more efficient than running back and forth.

### Queue-Based Hauler
Instead of greedily grabbing the nearest dropped energy, haulers wait in an organized queue. Each hauler only picks up when:
1. They're first in queue
2. AND energy has accumulated to 50+

This reduces wasted movement and improves energy throughput.

### Per-Source Teams
Each source tracks its own harvester and hauler team. New creeps automatically join the team with the fewest members, providing automatic load balancing.

### State Logging
Comprehensive logging provides visibility into:
- Creep state changes
- Queue positions
- Team assignments
- Energy accumulation
- Spawn progression

---

## 🔗 Quick Links

| File | Purpose | Read First |
|------|---------|-----------|
| [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md) | Overall summary | ⭐⭐⭐ |
| [IMPLEMENTATION_QUICK_REFERENCE.md](IMPLEMENTATION_QUICK_REFERENCE.md) | How it works | ⭐⭐ |
| [implementation-strategy.md](implementation-strategy.md) | Detailed design | ⭐⭐ |
| [../src/spawn.manager.ts](../src/spawn.manager.ts) | Spawn logic | Code |
| [../src/role.hauler.ts](../src/role.hauler.ts) | Queue system | Code |
| [../src/role.harvester_stationary.ts](../src/role.harvester_stationary.ts) | Auto-drop | Code |

---

## 💬 Next Steps

1. **Review** [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md)
2. **Deploy** to your Screeps server
3. **Monitor** early game progression (50-100 ticks)
4. **Verify** queue system and team assignments
5. **Optimize** constants based on performance
6. **Expand** with additional roles (defense, building, etc.)

---

**Implementation Date:** December 29, 2025
**Status:** ✅ Complete and Ready for Testing
**Estimated Testing Time:** 30-60 minutes on Screeps server

---
