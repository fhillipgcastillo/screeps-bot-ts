# Screeps Bot — Roadmap

TL;DR: Stabilize early-game spawning for restart-from-0, finish autonomous adjacent-room harvesting, implement a persistent task queue with a hybrid priority scheduler, add runtime strategy switching and pause-for-spawning, and build squad-based combat coordination. Use typed memory + centralized helpers and a hybrid priority scheduler (explicit base priority + dynamic modifiers).

**Selected Options**
- **Restart mode**: restart-from-0 (robust emergency bootstrap)
- **Discovery**: autonomous adjacent-room discovery for harvesters
- **Aggression**: opportunistic by default (opportunistic expansion/claims), support defensive and aggressive strategies later
- **Pause semantics**: Pause = stop spawning only (active creeps keep working)
- **Priority scheduler**: Hybrid (explicit base priorities + dynamic modifiers)
- **Memory**: Typed memory schemas + centralized memory helpers and periodic garbage collection

**Phased Plan (high level)**

1) Phase 1 — Spawn Stability & Early-Game bootstrap
- Fix spawn deadlock and add energy-bootstrap utilities.
- Implement emergency spawn templates for restart-from-0.
- Add energy-reserve checks and minimal-role priorities.

2) Phase 2 — Autonomous Multi-Room Harvesting
- Wire room-safety checks into harvester decision logic.
- Implement safe adjacent-room discovery and pathing timeouts.
- Cache room discovery and threat assessments to reduce FIND cost.

3) Phase 3 — Task Queue & Intelligent Planning
- Add a persistent task/job queue (spawn requests, haul tasks, build tasks).
- Implement priority levels (CRITICAL/HIGH/NORMAL/LOW) and dynamic modifiers.
- Refactor `GameManager` to plan and dispatch from the queue each tick.

4) Phase 4 — Strategy Switching & Console Control
- Add a `StrategyManager` with states: EARLY_GAME, GROWTH, EXPANSION, DEFENSE, RECOVERY.
- Enable runtime strategy selection from the in-game console.
- Implement pause-for-spawning-only and a console API to enqueue manual tasks (e.g., "explore room X").

5) Phase 5 — Squad Coordination & Combat Tactics
- Implement `squad` concepts (leader, members, roles per squad).
- Add coordinated movement, retreat/health thresholds, and target assignment.
- Integrate squad behavior with tower/tactical defense and spawn emergency responses.

**Actionable Checklist (concrete files and deliverables)**
- Create `ROADMAP.md` (this file).
- Phase 1 deliverables:
  - Design and add `src/utils/energyBootstrap.ts` (emergency spawn templates).
  - Update `src/spawn.manager.ts` to support emergency queue and energy-reserve logic.
  - Add tests for recovery-from-zero scenarios.
- Phase 2 deliverables:
  - Update `src/role.harvester_stationary.ts` to allow adjacent-room assignment.
  - Update `src/utils/room-safety.ts` to provide a cache and threat scoring API.
  - Update `src/config/multi-room.config.ts` with exploration depth/timeouts.
- Phase 3 deliverables:
  - Add `src/utils/taskQueue.ts` with persistent job structs and status enums.
  - Update `src/GameManager.ts` to consume the task queue and show pending spawns in UI.
  - Add `src/ui/GameStatsUI.ts` updates to display queue state.
- Phase 4 deliverables:
  - Add `src/strategyManager.ts` and strategy config files (per-strategy role counts/templates).
  - Add console commands to switch strategies and pause/resume spawning.
- Phase 5 deliverables:
  - Add `src/comm/squadManager.ts` and extend `src/types.ts` to include squad memory types.
  - Update combat roles to support squads and coordinated tactics.

**Design Notes & Recommendations**
- Hybrid priority: use explicit base priority with dynamic modifiers computed from safe, cached signals (room danger, container fullness, distance). Avoid full dynamic-only scheduling to reduce oscillation.
- Memory: define typed memory interfaces in `src/types.ts` and centralize all writes/reads in `src/utils/memoryHelpers.ts`. Add periodic garbage collection (every N ticks) to remove stale IDs.
- Resilience: aim to fully recover from zero-creep situations by prioritizing minimal harvesters and haulers in the emergency spawn queue.
- Observability: expose queue and strategy state in `src/ui/GameStatsUI.ts` and provide console commands for manual interventions.

**Next immediate steps**
- Implement Phase 1 design and emergency bootstrap code paths.
- Create small unit tests simulating restart-from-0 to validate recovery behavior.

---

If this roadmap looks good, I can start Phase 1 implementation next: (a) design `energyBootstrap` utilities and (b) modify `src/spawn.manager.ts` to support emergency queueing. Tell me to proceed and I'll create the first code changes and tests.
