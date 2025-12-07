# Screeps Bot Evolution Roadmap

**Status**: Planning Phase
**Target**: Multi-room autonomous expansion with squad-based combat and dynamic strategy switching
**Timeline**: 5-7 weeks

---

## Overview

This roadmap outlines the transition from a single-room, reactive bot to a multi-room, intelligent system capable of:
- **Autonomous energy discovery** in adjacent rooms with safety checks
- **Strategic room claiming** (opportunistic: scout first, claim safe rooms, expand cautiously)
- **Coordinated squad-based combat** with defensive and aggressive tactics
- **Runtime strategy switching** via console commands with pause/resume control
- **Resilient spawn management** that recovers from 0 energy (complete workforce loss)
- **Persistent task queuing** for intelligent planning and forecasting

---

## Current State Assessment

### Strengths ✅
- Type-safe role system with 7 implemented creep types
- Modular architecture (clear separation of concerns)
- Comprehensive logging and debug utilities
- Anti-crowding logic for resource distribution
- Multi-room infrastructure exists (config, safety checks, utilities)

### Critical Issues ⚠️
1. **Spawn deadlock**: Energy < 300 leads to minimal-body-only spawning; recovery from workforce loss is uncertain
2. **Energy idle time**: Inefficient hauler routing and lack of proactive container pulling
3. **Level 3 progression gap**: Strategy documentation incomplete; no clear role scaling path
4. **Single-room assumption**: Core roles designed for one room; multi-room bolted on as afterthought
5. **Reactive-only decisions**: No planning or forecasting; all per-tick
6. **No coordination**: Creeps act independently; combat is solo-unit focused
7. **Memory instability**: Loose creep memory structure risks state corruption
8. **No strategy switching**: Cannot change behavior at runtime or respond to threats dynamically

### What's Working Well 🎯
- Modular role pattern makes adding new behaviors straightforward
- Configuration-driven approach (external level/room configs)
- Testing foundation and UI stats display
- Anti-crowding and resource distribution logic

---

## Design Decisions

### 1. Energy Bootstrap Strategy
**Choice**: Support restart-from-0 resilience
**Meaning**: Bot must recover if all creeps die (e.g., attacked and destroyed). Spawns may have 0 energy.
**Implementation Impact**:
- Implement tiered spawn templates: emergency (1 WORK + 1 MOVE + 1 CARRY) → normal → advanced
- Add energy reserve thresholds before attempting larger spawns
- Implement safe-spawn fallback when energy is scarce
- Requires careful minimum-role definitions and spawn-state validation tests

### 2. Multi-Room Energy Discovery
**Choice**: Autonomous discovery of adjacent sources
**Meaning**: Harvesters automatically find and migrate to new rooms when current sources deplete, respecting safety boundaries.
**Implementation Impact**:
- Room safety checks must block entry if enemies detected or unknown
- Creeps migrate autonomously when source becomes unprofitable
- Dynamic room list management (track discovered rooms, cache threats)
- Requires pathfinding and timeout handling for transitions

### 3. Expansion Strategy
**Choice**: Opportunistic (scout-first, claim safe rooms)
**Meaning**: Primary strategy focuses on claiming unclaimed rooms after scouting for threats. Later support defensive and aggressive strategies.
**Implementation Impact**:
- Scout creeps explore with safety-first approach
- Only claim rooms with no hostile structures/creeps
- Infrastructure scales as claimed rooms increase
- Aggressive/defensive strategies implemented as secondary options in future phases

### 4. Pause Semantics
**Choice**: Pause spawning only (active creeps continue work)
**Meaning**: Console pause stops new spawn requests; running creeps keep executing current tasks. Decay still applies.
**Implementation Impact**:
- Pause state affects only spawn queue processing
- Creeps ignore pause state; they continue movement, hauling, building, etc.
- Allows manual task injection (e.g., "explore room X") while creeps work
- Clean separation: pause affects planning layer, not execution layer

### 5. Task Priority System
**Choice**: Hybrid approach (explicit base priority + dynamic modifiers)
**Meaning**: Tasks have static priority categories (CRITICAL, HIGH, NORMAL, LOW). Dynamic scoring adjusts effective priority based on game state (e.g., +1 priority if room danger > threshold).
**Implementation Impact**:
- Base priority determines task category; straightforward FIFO scheduling
- Dynamic modifiers computed once per tick, applied contextually
- Lower complexity than fully dynamic system; higher responsiveness than static-only
- Easier to debug and reason about (explicit base priority + optional rules)

### 6. Memory Safety
**Choice**: Typed memory + centralized helpers
**Meaning**: Enforce strict typing on all memory structures; centralize read/write operations with validation and garbage collection.
**Implementation Impact**:
- Update `types.ts` with complete memory interfaces
- Create `src/utils/memoryHelpers.ts` with safe getters/setters
- Implement memory garbage collection: periodic cleanup of stale IDs
- All memory mutations go through helpers (prevents corruption)
- Add defensive checks (e.g., always validate object IDs exist before use)
- Slightly increases code verbosity but prevents silent state bugs

---

## Roadmap: 5 Phases

### Phase 1: Spawn Stability & Early-Game Fix - DONE
**Duration**: Weeks 1–2
**Goal**: Ensure bot recovers from 0 energy and progresses reliably through levels 1–2
**Key Changes**:
- Implement tiered spawn templates (emergency → normal → advanced) in `spawn.manager.ts`
- Add energy reserve logic: check minimum energy before spawning larger bodies
- Create `src/utils/energy-bootstrap.ts` with fallback patterns and safe-spawn thresholds
- Optimize energy distribution:
  - Add container caching layer to reduce FIND operations
  - Refactor `role.hauler.ts` to prioritize drops near sources
  - Update builder/upgrader to proactively pull from containers
- Verify level 1→2 progression with consistent testing

**Acceptance Criteria**:
- Bot recovers from 0 energy without manual intervention
- Level 2 reached reliably
- No energy deadlock scenarios
- Container caching improves performance by ~20%

**Files Involved**:
- `src/spawn.manager.ts` (refactor spawn logic)
- `src/role.hauler.ts` (prioritize drops)
- `src/role.builder.ts`, `src/role.upgrader.ts` (pull from containers)
- NEW: `src/utils/energy-bootstrap.ts` (fallback patterns)
- Tests: expand `test/unit/main.test.ts` for spawn scenarios

---

### Phase 2: Complete Multi-Room Integration
**Duration**: Weeks 2–3
**Goal**: Enable harvesters to autonomously discover and migrate to adjacent rooms with threat detection
**Key Changes**:
- Wire `room-safety.ts` checks into `role.harvester_stationary.ts` decision-making
- Implement room-transition pathfinding with timeout handling (e.g., 100-tick limit before fallback)
- Add adjacent-room auto-discovery: harvesters check nearby rooms for viable energy sources
- Build room safety status cache: track threats per room, auto-disable when enemies detected
- Extend `config/multi-room.config.ts` with dynamic room list (discovered vs. claimed rooms)
- Implement source profitability scoring (depletes over time → migration trigger)

**Acceptance Criteria**:
- Harvesters autonomously migrate to new rooms when current source depletes
- Room safety checks prevent entry into hostile rooms
- Threat detection auto-disables unsafe rooms until cleared
- Transition timeout prevents stuck creeps
- Multi-room scouting visible in logs and UI

**Files Involved**:
- `src/role.harvester_stationary.ts` (add room transition logic)
- `src/config/multi-room.config.ts` (dynamic room list)
- `src/utils/room-safety.ts` (enhance threat caching)
- `src/utils/createExitRouts.ts` (improve pathfinding)
- NEW: `src/utils/sourceProfiler.ts` (track source profitability)
- Tests: integration tests for multi-room transitions

---

### Phase 3: Task Queue & Intelligent Planning
**Duration**: Weeks 3–4
**Goal**: Replace reactive-per-tick decisions with a persistent job queue enabling forecasting and visibility
**Key Changes**:
- Create persistent task queue system in `src/utils/taskQueue.ts`:
  - Tasks: spawn requests, build jobs, haul tasks, upgrade jobs
  - Status tracking: PENDING → IN_PROGRESS → COMPLETED/FAILED
  - Priority: base category + dynamic modifiers (see Hybrid Priority Design)
- Refactor `src/GameManager.ts` from immediate execution to queue-driven dispatch:
  - Planning phase: analyze room state, queue tasks for this tick
  - Execution phase: dequeue and execute tasks in priority order
- Add spawn preview/pending display in `src/ui/GameStatsUI.ts` (show next 5 pending spawns, ETA)
- Implement dynamic priority modifiers:
  - Room danger > threshold → +1 priority for defense tasks
  - Container fill > 80% → +1 priority for haul tasks
  - Controller downgrade < 10k ticks → +1 priority for upgrade tasks

**Acceptance Criteria**:
- All spawning goes through task queue
- UI shows pending spawns and estimated completion times
- Tasks persist across ticks and are replayed if failed
- Priority modifiers respond correctly to game state changes
- No spawning regressions vs. Phase 1

**Files Involved**:
- NEW: `src/utils/taskQueue.ts` (core queue implementation)
- `src/GameManager.ts` (integrate queue into main loop)
- `src/ui/GameStatsUI.ts` (show pending tasks)
- `src/types.ts` (add Task interfaces)
- Tests: unit tests for queue behavior, priority calculation

---

### Phase 4: Strategy Switching & Console Control
**Duration**: Weeks 4–5
**Goal**: Enable runtime strategy selection and pause/resume control for manual intervention
**Key Changes**:
- Define strategy states enum in `src/types.ts`: EARLY_GAME, GROWTH, EXPANSION, DEFENSE, RECOVERY
- Create `src/strategyManager.ts` to hold role configurations per strategy:
  - Each strategy defines: target creep counts, priority ordering, role emphasis
  - Example: DEFENSE strategy emphasizes defenders/ranged units; EXPANSION emphasizes scouts
- Implement console commands (via global Memory):
  - `setStrategy(strategyName)` → switch active strategy
  - `pauseSpawning()` / `resumeSpawning()` → stop/resume spawn queue (creeps keep working)
  - `getStatus()` → print current strategy, pause state, queue depth
- Auto-switch on threat detection:
  - If hostile creep enters room → temporarily switch to DEFENSE strategy
  - Resume previous strategy after threat is eliminated
- Integrate pause state into spawn queue: skip dequeuing tasks when paused

**Acceptance Criteria**:
- Console commands work from Screeps game console
- Strategy switches update creep role priorities visibly
- Pause stops new spawns but active creeps continue work
- Threat auto-switches to DEFENSE and back seamlessly
- UI reflects current strategy and pause state

**Files Involved**:
- NEW: `src/strategyManager.ts` (strategy state + role config)
- `src/types.ts` (add StrategyState enum)
- `src/GameManager.ts` (integrate pause state, auto-threat-detection)
- `src/utils/taskQueue.ts` (respect pause state)
- `src/ui/GameStatsUI.ts` (show strategy + pause state)
- Tests: manual console testing, threat detection logic

---

### Phase 5: Squad Coordination & Combat Tactics
**Duration**: Weeks 5–7
**Goal**: Implement coordinated multi-creep squads for defensive and opportunistic offensive operations
**Key Changes**:
- Create squad system in `src/utils/squadManager.ts`:
  - Squad structure: leader ID + member IDs, squad type (DEFENSE/OFFENSE/SCOUT)
  - Squad lifetime: forms on demand (e.g., threat detected), dissolves when goal met
- Extend `src/types.ts` with squad memory interfaces (squadId, squadRole, isLeader)
- Implement squad behaviors:
  - **Coordinated movement**: members follow leader or waypoints
  - **Retreat thresholds**: if any member < 50% health, all retreat to safe location
  - **Formation logic**: spacing between members to avoid stacking (improves healing range coverage)
  - **Healing coordination**: if squad has healer, prioritize low-health members
- Update `src/role.defender.ts` and `src/role.ranger.ts`:
  - Check squad membership first; execute squad behavior if in squad
  - Fall back to solo behavior if not in squad
- Implement threat response:
  - Detect incoming hostile creeps (via room observers or manual scouting)
  - Auto-form defensive squads from available defenders/rangers
  - Trigger emergency defense spawn queue tasks

**Advanced Tactics** (optional, if time permits):
- Scout-ahead for offensive squads (find enemy structure locations)
- Calculated attacks on enemy spawns/extensions (only if odds favorable)
- Staged retreat and regroup (if squad health drops below threshold, consolidate before next push)

**Acceptance Criteria**:
- Defensive squads form and respond to threats cohesively
- Retreat logic prevents unnecessary deaths
- Formation spacing reduces overkill healing waste
- Offensive squads (EXPANSION strategy) scout new rooms before claiming
- No regressions in Phase 1–4 functionality
- Combat logs show squad actions and coordination

**Files Involved**:
- NEW: `src/utils/squadManager.ts` (squad formation and lifecycle)
- `src/types.ts` (squad memory interfaces)
- `src/role.defender.ts`, `src/role.ranger.ts` (squad-aware behavior)
- `src/GameManager.ts` (threat detection and auto-squad-formation)
- `src/utils/taskQueue.ts` (emergency defense spawn tasks)
- Tests: combat scenario simulations, squad cohesion tests

---

## Implementation Notes

### Memory Safety Strategy
All phases must adhere to typed memory + centralized helpers:
1. **Phase 1–2**: Establish `src/utils/memoryHelpers.ts` with safe getters/setters for creep memory
2. **Phase 3**: Extend helpers to support task memory and squad memory
3. **All phases**: Include garbage collection sweep (every 100 ticks) to clean stale object IDs
4. **All phases**: Validate object existence before use; log warnings for missing references

### Testing Approach
- Unit tests for spawn logic, energy thresholds, task priority
- Integration tests for multi-room transitions, room safety checks
- Combat scenario tests: single vs. squad, with/without healers
- Memory corruption tests: stale references, concurrent writes
- Performance tests: container caching impact, memory GC overhead

### Performance Optimization Strategy
1. **Phase 1**: Container and structure caching (reduce FIND calls by ~50%)
2. **Phase 2**: Room safety caching with invalidation on threat change
3. **Phase 3**: Task queue reduces repeated discovery logic (creeps know their task upfront)
4. **Phase 4**: Strategy switching allows disabling expensive logic in non-active roles
5. **Phase 5**: Squad AI can be batched (run squad AI once per squad, not per creep)

### Rollback/Recovery Plan
- Each phase should be implementable independently (don't break earlier phases)
- Maintain compatibility with existing role system
- Feature flags in config allow disabling new systems (fallback to Phase 1 behavior)
- Save snapshots of working states (branch checkpoints after each phase)

---

## Success Metrics

### By End of Phase 1
- [ ] Bot recovers from 0 energy
- [ ] Level 1→2 progression works reliably (10/10 attempts)
- [ ] Energy distribution delays reduced by 30%

### By End of Phase 2
- [ ] Harvesters migrate autonomously to new rooms
- [ ] Room safety blocks entry to hostile rooms
- [ ] Multi-room control points achieved (2–3 rooms managed)

### By End of Phase 3
- [ ] All spawning goes through task queue
- [ ] UI shows pending spawns with ETAs
- [ ] Dynamic priority adjustments visible in logs

### By End of Phase 4
- [ ] Console commands work reliably
- [ ] Strategy switch changes creep behavior
- [ ] Pause stops spawning; active creeps continue
- [ ] Threat detection auto-switches to DEFENSE

### By End of Phase 5
- [ ] Defensive squads respond to threats cohesively
- [ ] Retreat logic prevents unneeded deaths
- [ ] Offensive squads scout and claim new rooms safely
- [ ] Combat logs show squad coordination

---

## Next Steps

1. **Review & approve** this roadmap with stakeholders
2. **Establish branching strategy**: one feature branch per phase
3. **Set up testing harness**: automated tests for each phase's acceptance criteria
4. **Begin Phase 1**: spawn stability and energy bootstrap
5. **Weekly checkins**: validate progress against acceptance criteria before advancing

---

## Appendix: Key Terminology

- **Energy Bootstrap**: The process of recovering from 0 energy (complete workforce loss) by spawning minimal-cost creeps first
- **Room Safety**: Threat assessment for a room (enemies detected, structures present, safety score)
- **Source Profitability**: Metric indicating whether a harvester should remain at current source or migrate (based on remaining energy, distance, and crowding)
- **Task Queue**: Persistent collection of jobs (spawn, build, haul) with status tracking and priority
- **Hybrid Priority**: Static priority category (CRITICAL/HIGH/NORMAL/LOW) with dynamic modifiers applied per game state
- **Squad**: Coordinated group of creeps (2–5 typically) with shared goals and coordinated behavior
- **Strategy State**: High-level behavior mode (EARLY_GAME, GROWTH, EXPANSION, DEFENSE, RECOVERY) that defines role emphasis and priorities
- **Pause State**: Suspend spawn queue processing; running creeps continue execution; allows manual task injection
