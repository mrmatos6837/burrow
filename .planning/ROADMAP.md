# Roadmap: Burrow

## Milestones

- ✅ **v1.0 MVP** — Phases 1-5 (shipped 2026-03-09)
- 🚧 **v1.1 Rendering & Ergonomics** — Phases 6-8 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-5) — SHIPPED 2026-03-09</summary>

- [x] Phase 1: Core Engine (2/2 plans) — completed 2026-03-07
- [x] Phase 2: Schema, Views, and Archive (2/2 plans) — completed 2026-03-08
- [x] Phase 3: CLI Pretty-Print Rendering (3/3 plans) — completed 2026-03-08
- [x] Phase 4: Agent Interface (2/2 plans) — completed 2026-03-08
- [x] Phase 5: v1 Tech Debt Cleanup (1/1 plan) — completed 2026-03-09

Full details: `milestones/v1.0-ROADMAP.md`

</details>

### 🚧 v1.1 Rendering & Ergonomics (In Progress)

**Milestone Goal:** Improve rendering pipeline quality (eliminate flatten-renest, fix alignment, dynamic width) and ship engine optimizations, input validation, and developer ergonomics.

- [x] **Phase 6: Rendering Pipeline Refactor** - Rewrite renderTree to keep nested structure, eliminate redundant computations and dead code (completed 2026-03-13)
- [x] **Phase 7: Rendering Enhancements** - Dynamic width, alignment fixes, edge case handling — depends on Phase 6 refactor (completed 2026-03-13)
- [ ] **Phase 8: Engine Quality & Ergonomics** - Tree walk optimizations, input validation, code quality, data integrity, API consistency, installer fixes

## Phase Details

### Phase 6: Rendering Pipeline Refactor
**Goal**: renderTree operates on the live nested tree structure, eliminating redundant computations and dead code
**Depends on**: Nothing (first v1.1 phase)
**Requirements**: REND-01, REND-02, REND-03, REND-04, REND-05
**Success Criteria** (what must be TRUE):
  1. renderTree traverses the nested card structure directly without flattening and re-nesting
  2. Breadcrumb computation runs exactly once per render call (not duplicated across renderTree and getBreadcrumbs)
  3. countActiveDescendants is called exactly once per card (not three times across renderTree, renderCard, formatCardLine)
  4. Archive filtering happens in one place (not duplicated between renderTree and renderCard)
  5. nestFlatCards is deleted from render.cjs and all tests pass
**Plans:** 2/2 plans complete

Plans:
- [x] 06-01-PLAN.md — Refactor renderTree to nested output + update renderCard to consume pre-computed metadata
- [x] 06-02-PLAN.md — Update CLI to use nested output, delete nestFlatCards, consolidate breadcrumbs

### Phase 7: Rendering Enhancements
**Goal**: Tree output is visually correct at any nesting depth, adapts to terminal width, and handles all edge cases without crashing
**Depends on**: Phase 6
**Requirements**: REND-06, REND-07, REND-08, REND-09, REND-10, PERF-07
**Success Criteria** (what must be TRUE):
  1. Box-drawing columns align correctly when cards are nested 3+ levels deep
  2. Rendered tree width adapts to the current terminal width (process.stdout.columns) instead of using a hardcoded value
  3. Cards with empty or undefined titles render without throwing an error
  4. Cards created with future timestamps display a sensible age label instead of "just now"
  5. Rendering on a very narrow terminal (fewer columns than minimum) clamps to the minimum width instead of producing negative values
**Plans:** 2/2 plans complete

Plans:
- [ ] 07-01-PLAN.md — Edge case guards (empty titles, future/invalid dates) and PERF-07 descendantCount optimization
- [ ] 07-02-PLAN.md — Dynamic width with --width flag, MIN_TERM_WIDTH floor, and depth-3+ alignment verification

### Phase 8: Engine Quality & Ergonomics
**Goal**: The tree engine eliminates redundant traversals, CLI rejects bad input clearly, storage loads safely, and the installer works correctly out of the box
**Depends on**: Phase 6 (for PERF-07 only; all other requirements are independent)
**Requirements**: PERF-01, PERF-02, PERF-03, PERF-04, PERF-05, PERF-06, PERF-08, PERF-09, PERF-10, VALID-01, VALID-02, VALID-03, QUAL-01, QUAL-02, QUAL-03, QUAL-04, DATA-01, DATA-02, API-01, API-02, INST-01, INST-02
**Success Criteria** (what must be TRUE):
  1. Passing a non-numeric value to --depth, a negative value to --at, or an unknown flag produces a clear error message instead of silent corruption or NaN
  2. Loading a corrupted or schema-invalid cards.json produces a clear, human-readable error instead of an unpredictable crash
  3. Running the init script on a project automatically adds cards.json.bak to .gitignore and appends to CLAUDE.md with correct line endings
  4. deleteCard returns the full deleted card object (same shape as moveCard/editCard), and the find command reuses the tree engine instead of reimplementing recursion
  5. All 150+ tests pass with no regressions after engine refactors
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Core Engine | v1.0 | 2/2 | Complete | 2026-03-07 |
| 2. Schema, Views, and Archive | v1.0 | 2/2 | Complete | 2026-03-08 |
| 3. CLI Pretty-Print Rendering | v1.0 | 3/3 | Complete | 2026-03-08 |
| 4. Agent Interface | v1.0 | 2/2 | Complete | 2026-03-08 |
| 5. v1 Tech Debt Cleanup | v1.0 | 1/1 | Complete | 2026-03-09 |
| 6. Rendering Pipeline Refactor | v1.1 | 2/2 | Complete | 2026-03-13 |
| 7. Rendering Enhancements | 2/2 | Complete   | 2026-03-13 | - |
| 8. Engine Quality & Ergonomics | v1.1 | 0/TBD | Not started | - |
