# Role Migration Tracker

**Migration Goal**: Convert all role-based files from object-with-methods pattern to TypeScript class-based implementations

**Start Date**: December 23, 2025
**Status**: In Progress (Tier 2 Complete ✅)
**Strategy**: Incremental (by complexity tier)
**Last Updated**: December 23, 2025 - Tier 2 migration complete

---

## Migration Status Overview

| File                           | Complexity | Status        | Assignee | Notes                                                            |
| ------------------------------ | ---------- | ------------- | -------- | ---------------------------------------------------------------- |
| `role.defender.ts`             | Simple     | � Complete    | -        | Migrated to class, hardcoded ref removed                         |
| `role.ranger.ts`               | Simple     | 🟢 Complete    | -        | Migrated to class, hardcoded ref removed                         |
| `role.upgrader.ts`             | Simple     | 🟢 Complete    | -        | Migrated to class, type mismatch fixed, commented code removed   |
| `role.builder.ts`              | Moderate   | � Complete    | -        | Migrated to class, commented code removed, hardcoded ref removed |
| `role.explorer.ts`             | Moderate   | 🟢 Complete    | -        | Migrated to class, export standardized, multi-state preserved    |
| `role.harvester_stationary.ts` | Complex    | 🔴 Not Started | -        | Multi-room, profitability checks, 484 lines                      |
| `role.hauler.ts`               | Complex    | 🔴 Not Started | -        | Multi-room, dual-phase state, 611 lines                          |

**Legend**: 🔴 Not Started | 🟡 In Progress | 🟢 Complete | ⚠️ Blocked

---

## GameManager Integration Status

| Task                                              | Phase   | Status        | Dependencies       | Notes                       |
| ------------------------------------------------- | ------- | ------------- | ------------------ | --------------------------- |
| Dual pattern detection in `runCreep()`            | Phase 1 | 🔴 Not Started | None               | Check prototype vs object   |
| Feature flag system (`Memory.useClassBasedRoles`) | Phase 1 | 🔴 Not Started | None               | Per-role toggles            |
| Console commands for role switching               | Phase 1 | 🔴 Not Started | Feature flag       | `enableClassRole()`, etc.   |
| Role loader utility (`roleLoader.ts`)             | Phase 1 | 🔴 Not Started | None               | Centralized role resolution |
| Enable Tier 1 roles (defender, ranger, upgrader)  | Phase 2 | 🔴 Not Started | Tier 1 complete    | After testing passes        |
| Enable Tier 2 roles (builder, explorer)           | Phase 2 | 🔴 Not Started | Tier 2 complete    | After testing passes        |
| Enable Tier 3 roles (harvester, hauler)           | Phase 2 | 🔴 Not Started | Tier 3 complete    | After testing passes        |
| Performance monitoring integration                | Phase 2 | 🔴 Not Started | Phase 1            | CPU/memory tracking         |
| Remove object pattern support                     | Phase 3 | 🔴 Not Started | All tiers complete | Delete old exports          |
| Simplify `runCreep()` to class-only               | Phase 3 | 🔴 Not Started | Object removal     | Clean up conditional logic  |
| Remove feature flag system                        | Phase 3 | 🔴 Not Started | All enabled        | No longer needed            |
| Update external references                        | Phase 3 | 🔴 Not Started | All tiers complete | Tests, docs, etc.           |

---

## Complexity Tiers

### Tier 1: Simple Roles (3 files) ✅ COMPLETE
**Priority**: High (Low risk, quick wins)
**Estimated Effort**: 1-2 hours total
**Dependencies**: None
**Status**: Complete (December 23, 2025)

- [x] **role.defender.ts** (34 lines → 108 lines)
  - ✅ Converted to class extending `SmartCreep`
  - ✅ Removed hardcoded `Spawn1` reference
  - ✅ Added proper TypeScript documentation
  - ✅ Implemented patrol behavior for idle state
  - ✅ Improved error handling with debug logging

- [x] **role.ranger.ts** (40 lines → 108 lines)
  - ✅ Converted to class extending `SmartCreep`
  - ✅ Removed hardcoded `Spawn1` reference
  - ✅ Added proper TypeScript documentation
  - ✅ Implemented patrol behavior for idle state
  - ✅ Improved error handling with debug logging

- [x] **role.upgrader.ts** (130 lines → 192 lines)
  - ✅ Converted to class extending `SmartCreep`
  - ✅ **Fixed type mismatch** (`RoleHauler` → `UpgraderCreep`)
  - ✅ **Removed all commented code** (lines 79-118)
  - ✅ Removed hardcoded `Spawn1` reference
  - ✅ Added memory validation
  - ✅ Integrated with cached container system
  - ✅ Proper state management using CreepStateEnum

### Tier 2: Moderate Complexity (2 files) ✅ COMPLETE
**Priority**: Medium (Moderate risk, good learning curve)
**Estimated Effort**: 2-3 hours total
**Dependencies**: Tier 1 complete (for pattern consistency)
**Status**: Complete (December 23, 2025)

- [x] **role.builder.ts** (263 lines → 239 lines)
  - ✅ Converted to class extending `SmartCreep`
  - ✅ **Removed 33 lines of commented code** (including unused resource-assignment logic)
  - ✅ Removed hardcoded `Spawn1` reference
  - ✅ Preserved level-dependent priority logic (early game vs mid-late)
  - ✅ Maintained container caching pattern integration
  - ✅ Added proper state management with CreepStateEnum.COLLECTING/BUILDING
  - ✅ Improved withdraw logic with fallback to spawn

- [x] **role.explorer.ts** (225 lines → 289 lines)
  - ✅ Converted to class extending `SmartCreep`
  - ✅ **Standardized export pattern** (named function → default factory)
  - ✅ Updated GameManager import to use `roleExplorer.run()`
  - ✅ Preserved multi-state logic (exploring → scanning → returning)
  - ✅ Maintained room transition timeout handling
  - ✅ Added CreepStateEnum.EXPLORING state
  - ✅ Fixed TypeScript strict null checks on scannedRooms initialization
  - ✅ Improved state transitions with clear method separation

### Tier 3: Complex Multi-Room (2 files)
**Priority**: Low (High risk, high value)
**Estimated Effort**: 4-6 hours total
**Dependencies**: Tier 1 & 2 complete, GameManager integration tested

- [ ] **role.harvester_stationary.ts** (484 lines)
  - Current: Object with advanced multi-room logic
  - Target: Class extending `Harvester` (from types.ts)
  - Risks: Multi-room state management, profitability checks, auto-claiming integration
  - Special Notes: Most sophisticated role, distribution-first targeting, room transitions

- [ ] **role.hauler.ts** (611 lines)
  - Current: Object with dual-phase state machine, multi-room support
  - Target: Class extending `Hauler` (from types.ts)
  - Risks: Complex transfer priority logic, return journey tracking
  - Special Notes: Longest file, handles tombstones/ruins/drops, extensive debugging

---

## Technical Debt to Address

### All Files
- [x] Remove hardcoded `Spawn1` references (3/6 files complete - Tier 1)
- [ ] Remove hardcoded `Spawn1` references (remaining 3 files - Tiers 2-3)
- [x] Standardize export pattern (3/7 complete - Tier 1)
- [ ] Standardize export pattern (remaining 4 files)
- [x] Align with class definitions in `types.ts` (3/7 complete - Tier 1)
- [ ] Align with class definitions in `types.ts` (remaining 4 files)

### Specific Files
- [x] **role.upgrader.ts**: Fix type mismatch (`RoleHauler` → `RoleUpgrader`) ✅
- [x] **role.upgrader.ts**: Clean commented code (lines 79-118) ✅
- [ ] **role.builder.ts**: Clean commented code (lines 189-221)
- [ ] **role.explorer.ts**: Standardize export pattern (named function → default export)

---

## Integration Points

### GameManager.ts Updates

#### Phase 1: Dual Pattern Support (Week 1-2)
- [ ] **Update `runCreep()` method** to detect pattern type (object vs class)
  - Check if role export has `prototype` (class) or is plain object
  - Support both calling patterns: `role.run(creep)` and `new RoleClass(creep).run()`
  - Location: [src/GameManager.ts](../../src/GameManager.ts) lines ~80-120

- [ ] **Add feature flag system**
  - Create `Memory.useClassBasedRoles` object with per-role toggles
  - Default to `false` for all roles initially
  - Add console commands: `enableClassRole(roleName)`, `disableClassRole(roleName)`
  - Location: [src/GameManager.ts](../../src/GameManager.ts) initialization

- [ ] **Implement role loader utility**
  - Create `getRoleImplementation(role: CreepRole): object | class` helper
  - Check feature flag first, fallback to original pattern
  - Cache implementations for performance
  - Location: New file [src/utils/roleLoader.ts](../../src/utils/roleLoader.ts)

#### Phase 2: Gradual Rollout (Week 2-3)
- [ ] **Enable class pattern per tier**
  - After Tier 1 testing complete: Set `Memory.useClassBasedRoles.defender = true`
  - After Tier 2 testing complete: Enable builder, explorer
  - After Tier 3 testing complete: Enable harvester, hauler

- [ ] **Monitor performance metrics**
  - Track CPU usage per role before/after switch
  - Log memory usage differences
  - Record any error patterns
  - Location: [src/utils/multi-room-debug.ts](../../src/utils/multi-room-debug.ts) extensions

#### Phase 3: Cleanup (Week 4)
- [ ] **Remove object pattern support**
  - Delete old object exports from role files
  - Simplify `runCreep()` to only instantiate classes
  - Remove feature flag system
  - Location: [src/GameManager.ts](../../src/GameManager.ts) + all role files

- [ ] **Update exports and imports**
  - Ensure all role files use consistent class export
  - Update any external references (tests, manual spawner, etc.)
  - Verify no broken imports remain

### Current Usage Tracking

#### Where Role Patterns Are Used

**Primary Usage:**
- [ ] **GameManager.ts** - `runCreep()` method (lines ~80-120)
  - Switch statement dispatches to role implementations
  - Needs update to support both patterns
  - **Impact**: Critical path, all creeps flow through here

**Secondary Usage:**
- [ ] **main.ts** - Indirect usage through GameManager
  - No direct role imports
  - **Impact**: None (delegates to GameManager)

- [ ] **Manual Spawner** - No direct role usage
  - Only creates creeps with role memory
  - **Impact**: None (memory-only interaction)

**Testing:**
- [ ] **test/unit/main.test.ts** - May mock role objects
  - Check for role pattern assumptions in tests
  - **Impact**: Tests may need updates

**Documentation:**
- [ ] **copilot-instructions.md** - References role system
  - Update to reflect class-based pattern
  - **Impact**: Developer guidance

- [ ] **ROADMAP.md** - Mentions role architecture
  - Update Phase 1-5 references
  - **Impact**: Strategic planning alignment

### Types.ts Alignment
- [ ] Verify memory interfaces match class properties
- [ ] Ensure `CreepBrain` abstract class has all required methods
- [ ] Update `SmartCreep` implementation if needed
- [ ] Add type guards for role pattern detection

### Testing Strategy
- [ ] Unit tests for each converted class (constructor, run(), state transitions)
- [ ] Integration tests with GameManager dual-pattern support
- [ ] Backward compatibility tests (both patterns coexist)
- [ ] Performance benchmarks (CPU usage comparison)
- [ ] Memory structure validation tests

---

## Risk Assessment

| Risk                             | Likelihood | Impact | Mitigation                                  |
| -------------------------------- | ---------- | ------ | ------------------------------------------- |
| Breaking existing behavior       | Medium     | High   | Incremental rollout with feature flag       |
| Memory structure incompatibility | Low        | Medium | Validate memory interfaces before migration |
| Performance regression           | Low        | Low    | Benchmark CPU usage before/after            |
| Type system conflicts            | Medium     | Medium | Align with existing types.ts definitions    |
| Multi-room logic errors          | Medium     | High   | Extensive testing of harvester/hauler       |

---

## Success Criteria

### Per-File Checklist
- [ ] Class extends appropriate base (CreepBrain/SmartCreep)
- [ ] All methods migrated and tested
- [ ] Memory interface properly integrated
- [ ] No hardcoded references (e.g., `Spawn1`)
- [ ] Commented code cleaned up
- [ ] Type safety verified (no `any` types)
- [ ] Default export pattern used
- [ ] Unit tests written and passing

### Overall Project Success
- [ ] All 7 role files converted to classes
- [ ] GameManager integration complete
- [ ] Zero regressions in behavior
- [ ] Performance impact < 5% CPU increase
- [ ] Documentation updated (copilot-instructions.md, ROADMAP.md)
- [ ] Technical debt items resolved

---

## Notes and Decisions

### Architecture Decisions
- **Base Class Choice**: TBD (SmartCreep vs CreepBrain vs custom per-role)
- **Memory Management**: Extend existing memoryHelpers.ts vs class-level validation
- **State Management**: Use CreepStateEnum from types.ts consistently
- **Export Pattern**: All roles will use default export (align with current majority)

### Migration Strategy
- **Approach**: Incremental by complexity tier
- **Coexistence Period**: Both patterns supported during Tier 1-2, hard cutover after Tier 3
- **Rollback Plan**: Feature flag allows instant revert to object pattern if critical issues found

### Open Questions
1. Should each role have its own class or share SmartCreep?
   - **Answer**: TBD - pending architecture blueprint review
2. How to handle multi-room memory complexity in classes?
   - **Answer**: TBD - likely encapsulate in private methods
3. Should we add validation methods to memory interfaces?
   - **Answer**: TBD - consider centralized vs per-class approach

---✅ Tier 1 complete (defender, ranger, upgrader)
- **Week 2 (Dec 30-Jan 5, 2026)**: Tier 2 (Moderate complexity) + GameManager integration Phase 1
- **Week 3 (Jan 6-12, 2026)**: Tier 3 (Complex multi-room) + testing
- **Week 4 (Jan 13-19, 2026)**: GameManager Phase 2-3, documentation, cleanup, final testing

**Target Completion**: January 19, 2026
**Progress**: 3/7 role files migrated (43%) 2 (Moderate complexity) + GameManager integration
- **Week 3 (Jan 6-12, 2026)**: Tier 3 (Complex multi-room) + testing
- **Week 4 (Jan 13-19, 2026)**: Documentation, cleanup, final testing

**Target Completion**: January 19, 2026

---

## Related Documentation

- [Role Class Pattern Blueprint](ROLE_CLASS_PATTERN.md) - Target architecture reference
- [ROADMAP.md](../ROADMAP.md) - Overall project roadmap
- [types.ts](../../src/types.ts) - Existing class definitions
- [CREEP_TYPES_DOCUMENTATION.md](../CREEP_TYPES_DOCUMENTATION.md) - Type system reference

---

**Last Updated**: December 23, 2025
**Next Review**: After Tier 1 completion
