# Plan D: Phased Implementation Strategy (All Plans in Priority Order)

## Executive Summary

This document provides a comprehensive execution strategy for implementing Plans A, B, and C in the correct order to maximize value, manage risk, and prepare for Phases 4–5.

**Recommended Sequence:**
1. **Week 1: Plan C** (Pause Semantics Fix) — Quick win; unblocks Phase 4
2. **Week 2–3: Plan A** (Complete Phase 2) — Finish multi-room expansion
3. **Week 4–5: Plan B** (Phase 3 Architecture) — Major refactor; foundation for 4–5

**Total Timeline: ~5–6 weeks** to complete all foundational work before phases 3–5.

---

## Detailed Execution Strategy

### Priority 1: Plan C — Pause Semantics Fix (Week 1)

#### Why First?
- ✅ Quick win (2–2.5 hours total)
- ✅ Fixes Phase 1 correctness issue (violates ROADMAP design decision)
- ✅ Unblocks Phase 4 console control
- ✅ Low risk (isolated to GameManager + SpawnManager)
- ✅ Zero impact on phases 3–5 work (can proceed in parallel)

#### Scope
```
File Changes:
- src/GameManager.ts (remove pause early return, delegate to SpawnManager)
- src/spawn.manager.ts (add spawnPaused flag, update run() check)
- src/main.ts (export pause commands to global)
- src/ui/GameStatsUI.ts (display pause state)
- docs/MANUAL_SPAWNING_DOCUMENTATION.md (correct semantics)
```

#### Deliverables
```
✅ pauseSpawning() — stops spawn queue
✅ resumeSpawning() — resumes spawn queue
✅ Active creeps continue work when paused
✅ Console commands work from game console
✅ UI shows spawning pause state
✅ Documentation accurate
```

#### Execution Plan
1. **Monday**: Implement changes (2 hours)
2. **Monday PM**: Test (console, unit tests) (1 hour)
3. **Tuesday**: Documentation + fix any issues (30 min)
4. **Status**: Ready to deploy

#### Testing Checklist
```
□ pauseSpawning() stops spawning
□ Active creeps continue moving while paused
□ resumeSpawning() allows spawning again
□ UI shows "⏸️ PAUSED" state
□ Console commands callable from game console
□ No regressions in spawn logic
```

#### Success Criteria Met
- Pause stops only spawn queue (not execution)
- Semantics match ROADMAP Design Decision #4
- Foundation for Phase 4 ready

---

### Priority 2: Plan A — Complete Phase 2 Multi-Room Integration (Weeks 2–3)

#### Why Second?
- ✅ Builds on working Phase 2 foundation (70% done)
- ✅ Completes expansion strategy (opportunistic claiming)
- ✅ Quick value (rooms start getting claimed autonomously)
- ✅ Enables Phase 5 multi-territory squads
- ✅ Can proceed in parallel with Plan B (independent systems)

#### Scope
```
File Changes:
- src/utils/roomClaiming.ts (NEW — 400–500 lines)
- src/role.harvester_stationary.ts (integrate claiming into profitability check)
- src/config/multi-room.config.ts (add claiming criteria)
- src/GameManager.ts (add room discovery update)
- src/utils/consoleCommands.ts (add room management commands)
- src/main.ts (export commands to global)
- src/ui/GameStatsUI.ts (display room state)
```

#### Deliverables
```
✅ Harvesters claim safe adjacent rooms autonomously
✅ Room safety score calculated
✅ Dynamic room list (claimed, discovered, unsafe)
✅ Level-based claiming criteria
✅ Console commands: claimRoom(), getClaimableRooms(), getRoomStatus()
✅ UI displays room state
```

#### Execution Plan (5–7 hour sprint)

**Day 1 (3–4 hours):**
1. Create `roomClaiming.ts` utility (safety scoring, claim decision logic)
2. Write unit tests for room claiming functions
3. Integrate into harvester profitability check

**Day 2 (2–3 hours):**
1. Add claiming configuration to `multi-room.config.ts`
2. Add console commands
3. Update UI display
4. Integration testing

**Day 3 (1 hour):**
1. Final testing + fixes
2. Documentation

#### Testing Checklist
```
□ Safety score calculation works (0–100 range)
□ Rooms below minimum safety not claimed
□ Rooms with hostile creeps not claimed
□ Harvesters migrate to new rooms when profitable
□ Console commands work: claimRoom(), getClaimableRooms()
□ UI shows claimed, discovered, unsafe rooms
□ Unsafe room re-evaluation after TTL
□ No Phase 1/2 regressions
```

#### Success Criteria Met
- Phase 2 completion (100% of roadmap goals)
- Autonomous room expansion working
- Multiple rooms under bot control
- Console control available

---

### Priority 3: Plan B — Phase 3 Task Queue Architecture (Weeks 4–5)

#### Why Third?
- ✅ Foundation for phases 3–5 (must be done before them)
- ✅ Major refactor (requires careful planning)
- ✅ Blocks phases 4–5 (sequential dependency)
- ✅ Can be done after Plan A completes (independent)

#### Scope
```
File Changes:
- src/types.ts (Task interfaces, enums)
- src/utils/taskQueue.ts (NEW — 600–700 lines)
- src/GameManager.ts (major refactor: tick → planPhase/queuePhase/executePhase)
- src/ui/GameStatsUI.ts (queue visualization)
```

#### Deliverables
```
✅ Task queue service with priority buckets
✅ Task types: Spawn, Build, Haul, Upgrade
✅ Three-phase GameManager tick (plan → queue → execute)
✅ Dynamic priority modifiers
✅ UI shows pending tasks and queue stats
✅ All existing functionality preserved
```

#### Execution Plan (8–11 hour sprint)

**Day 1 (4 hours — Stages 1–2):**
1. Define Task interfaces in `types.ts`
2. Create TaskQueue service with priority buckets
3. Write comprehensive unit tests
4. **STOP & REVIEW** — Ensure design is solid before refactoring GameManager

**Day 2 (4 hours — Stage 3):**
1. Refactor GameManager tick() into 3 phases
2. Route spawn logic through queue
3. Implement dynamic priority modifiers
4. Heavy testing (integration tests)

**Day 3 (3 hours — Stages 4–5):**
1. UI updates for queue visibility
2. Memory persistence helpers
3. Final testing + documentation

#### Testing Checklist
```
□ Queue enqueue/dequeue works correctly
□ Priority ordering enforced (CRITICAL → LOW)
□ Task status transitions correct (PENDING → IN_PROGRESS → COMPLETED)
□ GameManager tick completes all 3 phases
□ Spawn logic routes through queue
□ Dynamic modifiers boost priority correctly
□ UI shows queue stats and pending tasks
□ No Phase 1/2 regressions
□ All existing tests pass
□ Performance acceptable (no CPU spike)
```

#### Success Criteria Met
- Task queue architecture complete
- Three-phase tick working
- Foundation for phases 4–5 ready
- Queue visibility in UI

#### Important Notes
- **Branching**: Use feature branch; do NOT merge to main until thoroughly tested
- **Review**: Get stakeholder review of architecture before finalizing
- **Risk**: This is the riskiest change; ensure comprehensive testing
- **Recovery**: Can always rollback to previous working state if issues arise

---

## Risk Management & Contingency

### Risk 1: Phase 3 Refactor Breaks Existing Functionality

**Probability:** Medium
**Impact:** High (bot stops working)

**Mitigation:**
- Comprehensive unit tests before GameManager changes
- Feature branch; merge only after full validation
- Keep old spawn logic available as fallback
- Test with actual game before rolling out

**Contingency:**
- Rollback to previous commit
- Debug specific failing systems
- Consider partial rollout (queue for spawning only, keep old execution)

### Risk 2: Queue Performance Issues (CPU spike)

**Probability:** Low
**Impact:** Medium (bot slows down)

**Mitigation:**
- Profile queue operations before/after
- Use efficient data structures (priority buckets, not full sort)
- Limit queue dequeue rate (max 5 tasks/tick)
- Monitor CPU usage in UI

**Contingency:**
- Reduce dequeue rate
- Implement queue batching
- Fall back to reactive mode if needed

### Risk 3: Phase 2 Claiming Causes Unwanted Behavior

**Probability:** Low
**Impact:** Medium (bot claims wrong rooms)

**Mitigation:**
- Conservative default claiming criteria (high safety threshold)
- Level-based criteria (stricter at level 1)
- Manual override commands
- Extensive testing before rollout

**Contingency:**
- Adjust claiming criteria dynamically
- Add global on/off flag for claiming
- Manual room abandonment commands

### Risk 4: Pause Semantics Change Breaks Scripts

**Probability:** Low
**Impact:** Low (documentation easy to update)

**Mitigation:**
- Keep legacy method names (`pauseGame()` as wrapper)
- Update documentation clearly
- Gradual migration path

**Contingency:**
- Revert to global pause if needed
- Support both semantics via flags

---

## Parallel Work Strategy

### Can Run in Parallel
```
✅ Plan C (pause fix) — independent, complete first
  THEN
✅ Plan A (Phase 2 completion) — independent of Plan B

  ⟷ Plan B (Phase 3 architecture) — can start once Plan A begins
    (don't block on A, but review A design first)
```

### Sequential Dependencies
```
Plan C must complete BEFORE Phase 4 work
Plan B must complete BEFORE Phases 4–5 implementation
Plan A should complete BEFORE Phase 5 (multi-room squads)
```

### Recommended Parallel Setup
```
Week 1: Developer A → Plan C (alone)
Week 2–3: Developer A → Plan A (primary)
          Developer B → Begin Plan B research/design (secondary)
Week 4–5: Developer A → Support Plan B refactoring
          Developer B → Plan B implementation (primary)
```

---

## Documentation & Handoff

### Phase C Docs
- Update `MANUAL_SPAWNING_DOCUMENTATION.md` — correct pause semantics
- Add console command examples to main README

### Phase A Docs
- Create `MULTI_ROOM_CLAIMING_DOCUMENTATION.md` — how claiming works, criteria, commands
- Update `ROADMAP.md` — mark Phase 2 complete
- Add claiming criteria reference to `multi-room.config.ts`

### Phase B Docs
- Create `TASK_QUEUE_ARCHITECTURE.md` — detailed design document
- Document three-phase tick flow with diagrams
- Add task queue usage examples
- Create performance tuning guide

### Summary Docs
- Update main `README.md` with phases completed
- Add "Phases Complete" section to `ROADMAP.md`
- Create `IMPLEMENTATION_LOG.md` — track what was done and when

---

## Success Metrics & Checkpoints

### After Plan C (Week 1)
```
✅ Pause/resume commands work from console
✅ Creeps continue moving while spawning paused
✅ No regressions in Phase 1 functionality
✅ Documentation accurate
→ Ready to proceed to Plan A
```

### After Plan A (Week 3)
```
✅ Harvesters claim adjacent rooms autonomously
✅ Room safety scores calculated correctly
✅ 2–3 rooms under bot control (claimed)
✅ Console commands work
✅ UI shows room state
→ Ready to proceed to Plan B
```

### After Plan B (Week 5)
```
✅ All spawning routes through task queue
✅ UI shows pending tasks with priorities
✅ Dynamic priority modifiers working
✅ Three-phase tick architecture solid
✅ No Phase 1/2 regressions
→ Ready to implement Phase 4
```

---

## Milestones & Deliverables

### Milestone 1: Phase 1 Correctness (Week 1)
**Deliverable:** Pause semantics fix
**Status:** Deployable
**Blockers:** None

### Milestone 2: Phase 2 Completion (Week 3)
**Deliverable:** Multi-room autonomous expansion
**Status:** Deployable
**Blockers:** Plan C (but doesn't block actual bot functionality)

### Milestone 3: Phase 3 Foundation (Week 5)
**Deliverable:** Task queue architecture, three-phase tick
**Status:** Deployable (major refactor, requires thorough testing)
**Blockers:** Extensive testing required before rollout

### Milestone 4: Ready for Phase 4–5 (Week 5+)
**Status:** All foundational work complete
**Next Steps:** Implement strategy switching (Phase 4), then squads (Phase 5)

---

## Communication & Status Tracking

### Weekly Standup Topics
```
Week 1:
- Plan C progress (pause fix)
- Any blockers or issues

Week 2:
- Plan C wrap-up + verification
- Plan A kick-off + harvester claiming integration

Week 3:
- Plan A progress + testing
- Begin Plan B design review

Week 4:
- Plan B implementation + early testing
- Address any Plan A issues

Week 5:
- Plan B refinement + comprehensive testing
- Prepare for Phase 4 kickoff
```

### Issues to Track
```
- Pause semantics: Ensure creeps continue executing
- Room claiming: Verify no unwanted claims
- Queue performance: Monitor CPU usage
- Regressions: Ensure Phase 1/2 still work
```

---

## Phase 4–5 Preparation

### After All Plans Complete

**Phase 4 (Strategy Switching) — Ready to Implement:**
```
- Use task queue priorities for strategy control
- Threat detection triggers priority changes
- Console commands: setStrategy(), getStatus()
- No major refactors needed; building on queue foundation
```

**Phase 5 (Squad Coordination) — Ready to Implement:**
```
- Use multiple claimed rooms from Phase 2
- Assign tasks to squad members via queue
- Coordinated movement + retreat logic
- Foundation: pause fix, room expansion, queue architecture
```

---

## Rollback & Recovery

### If Plan C Fails
```
revert src/GameManager.ts
revert src/spawn.manager.ts
Keep working; Plan A/B unaffected
```

### If Plan A Fails
```
revert src/utils/roomClaiming.ts (delete)
revert src/role.harvester_stationary.ts
revert src/config/multi-room.config.ts
Plan B can proceed independently
```

### If Plan B Fails
```
revert src/GameManager.ts
revert src/utils/taskQueue.ts (delete)
Plan A and Phase 1 unaffected
Delay Phase 4–5 until resolved
```

---

## Resource Requirements

### Time
- Plan C: 2.5 hours (1 developer)
- Plan A: 5–7 hours (1 developer)
- Plan B: 8–11 hours (1–2 developers, can parallelize)
- **Total: ~15–20 hours spread over 5 weeks**

### Expertise Needed
- Screeps game mechanics (energy, spawning, room safety)
- TypeScript/OOP design
- Queue data structures
- GameManager architecture

### Tools
- Git (branching, commits)
- TypeScript compiler
- Testing framework (existing Mocha setup)
- Screeps game client for manual testing

---

## Success Summary

After completing all three plans:

```
Phase 1: ✅ COMPLETE (energy bootstrap, memory safety, container caching)
Phase 2: ✅ COMPLETE (room safety, transitions, profitability, claiming)
Phase 3: ✅ READY (task queue architecture, foundations laid)
Phase 4: 🟡 READY TO START (strategy switching, console control)
Phase 5: 🟡 READY TO START (squad coordination, combat)

Bot Capabilities:
✅ Recovers from 0 energy
✅ Manages multiple claimed rooms autonomously
✅ Plans tasks (visible in UI)
✅ Pauses spawning without freezing creeps
🟡 Ready for dynamic strategy switching
🟡 Ready for coordinated multi-creep squads
```

---

## Next Steps After Plan D

1. **Execute Plan C** — Start Monday
2. **Complete Plan A** — Start following week
3. **Execute Plan B** — Start week 4, with thorough testing
4. **Phase 4 Kickoff** — After Plan B complete (Week 6+)
5. **Phase 5 Kickoff** — After Phase 4 complete (Week 8+)

**Total roadmap time estimate: 8–10 weeks to complete all phases.**

---

## Appendix: Rollout Checklist

### Pre-Deployment Checklist (All Plans)

#### Plan C
```
□ Tests pass (unit + integration)
□ No Phase 1 regressions
□ Pause/resume work from console
□ Documentation updated
□ Code review approved
```

#### Plan A
```
□ Room claiming tests pass
□ Harvesters migrate correctly
□ Console commands work
□ UI displays rooms
□ No Phase 1/2 regressions
□ Safety criteria functioning
□ Code review approved
```

#### Plan B
```
□ Queue service tests pass (95%+ coverage)
□ GameManager refactor tested (integration tests)
□ All Phase 1/2 tests pass
□ UI queue display working
□ Performance profiling shows acceptable CPU
□ Feature branch review approved
□ Ready for merge to main
```

### Post-Deployment Verification (All Plans)

```
□ Pause still working (Plan C)
□ Rooms still claim correctly (Plan A)
□ Spawning through queue working (Plan B)
□ No memory leaks
□ No CPU spikes
□ Creeps executing normally
□ All UI displays functional
□ Console commands accessible
```

---

## Document Version History

| Version | Date | Author | Notes |
|---------|------|--------|-------|
| 1.0 | 2025-12-07 | Architecture | Initial phased implementation plan |

