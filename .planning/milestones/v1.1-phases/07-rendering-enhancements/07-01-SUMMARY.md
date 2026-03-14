---
phase: 07-rendering-enhancements
plan: 01
subsystem: rendering
tags: [render, edge-cases, defensive-guards, performance, tdd]

# Dependency graph
requires:
  - phase: 06-rendering-pipeline-refactor
    provides: renderTree nested output, render.cjs pure render functions, zero mongoose dependency in render.cjs
provides:
  - formatAge with NaN guard, null/undefined guard, and future-date clamp
  - formatCreatedDate with null/undefined/invalid ISO guard
  - formatCardLine with safeTitle normalization for undefined/empty/whitespace titles
  - renderCard with safeTitle in header and breadcrumb
  - formatBreadcrumb with safeCardTitle guard
  - buildNested root card case deriving descendantCount from built children (PERF-07)
affects: [CLI output, burrow-tools.cjs, any future rendering phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "safeTitle normalization: (card.title && card.title.trim()) ? card.title : '(untitled)'"
    - "formatAge defensive guard: null/undefined check then isNaN check then Math.max(0, diffMs)"
    - "PERF-07 pattern: derive aggregate from already-built child array instead of redundant tree walk"

key-files:
  created: []
  modified:
    - .claude/burrow/lib/render.cjs
    - .claude/burrow/lib/mongoose.cjs
    - test/render.test.cjs
    - test/mongoose.test.cjs

key-decisions:
  - "formatCreatedDate also needs null/undefined/invalid guard (not just formatAge) because it calls new Date(isoString) directly"
  - "PERF-07 optimization: derive root card descendantCount from builtChildren.reduce() instead of countActiveDescendants(rootCard); children already have correct counts from their own countActiveDescendants calls inside buildNested"
  - "Future-date clamp via Math.max(0, now - then) renders as 'just now' — consistent UX for time-skewed data"

patterns-established:
  - "Defensive rendering: never crash on missing/invalid card data — always produce readable output"
  - "safeTitle pattern: centralized per-function rather than at data layer, preserving raw data integrity"

requirements-completed: [REND-08, REND-09, PERF-07]

# Metrics
duration: 18min
completed: 2026-03-13
---

# Phase 7 Plan 1: Rendering Edge Cases & Optimization Summary

**Hardened render.cjs with null/undefined/future-date guards and optimized buildNested root case to derive descendantCount from already-built children, eliminating a redundant tree walk**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-13T21:10:00Z
- **Completed:** 2026-03-13T21:28:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- `formatAge` now returns `'???'` for null/undefined/invalid ISO strings and `'just now'` for future dates via `Math.max(0, diffMs)` clamp
- `formatCreatedDate` guarded against null/undefined/invalid dates (was calling `new Date(undefined)` → NaN in year/month/day)
- `formatCardLine`, `renderCard`, and `formatBreadcrumb` all normalize missing/empty/whitespace titles to `'(untitled)'`
- `buildNested` root card case derives `descendantCount` from already-computed children array, eliminating one `countActiveDescendants` tree walk per `renderTree(data, rootId)` call
- 13 new render edge-case tests + 6 new mongoose PERF-07 behavioral tests (54 render, 69 mongoose, 170 total — all green)

## Task Commits

Each task was committed atomically:

1. **Task 1: Guards for empty titles, future dates, and invalid dates in render.cjs** - `6452bc4` (feat)
2. **Task 2: Optimize descendantCount in buildNested to eliminate redundant root-level computation** - `afc1d9c` (feat)

_Note: TDD tasks — tests written first (RED) then implementation (GREEN)_

## Files Created/Modified
- `.claude/burrow/lib/render.cjs` - Added guards in formatAge, formatCreatedDate, formatCardLine, renderCard, formatBreadcrumb
- `.claude/burrow/lib/mongoose.cjs` - Optimized buildNested root card case (PERF-07)
- `test/render.test.cjs` - 13 new edge-case tests across 4 new describe blocks
- `test/mongoose.test.cjs` - 6 new PERF-07 behavioral tests in new describe block

## Decisions Made
- `formatCreatedDate` required its own guard because it calls `new Date(isoString)` directly to format YYYY-MM-DD — the guard in `formatAge` alone was insufficient
- PERF-07 optimization scope: only the root card case uses `builtChildren.reduce()`; non-root cards inside `buildNested` still use `countActiveDescendants(card)` on the raw tree (correct — they walk raw data, not depth-limited built data)
- Future-date test assertion: checking `result.includes('just now')` rather than checking for absence of negative sign (YYYY-MM-DD date strings contain hyphens that would cause false negatives)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] formatCreatedDate also needed null/invalid guard**
- **Found during:** Task 1 (render.cjs guards)
- **Issue:** `formatCreatedDate` calls `new Date(isoString)` directly to produce YYYY-MM-DD — with null/undefined/invalid input this produces NaN in the year/month/day fields, making the guard in `formatAge` alone insufficient
- **Fix:** Added null check and `isNaN(date.getTime())` guard at top of `formatCreatedDate`, returning `'??? (???)'` for invalid input
- **Files modified:** `.claude/burrow/lib/render.cjs`
- **Verification:** Test "renderCard with undefined created does not show NaN" passes
- **Committed in:** `6452bc4` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Required for correctness — the plan specified fixing NaN output but the route through formatCreatedDate was an unnoticed gap. No scope creep.

## Issues Encountered
- Test assertion `!result.includes('-')` for future-date test was too broad (YYYY-MM-DD date strings contain hyphens). Refined to `!result.includes('NaN')` + `result.includes('just now')`.

## Next Phase Readiness
- render.cjs fully hardened against edge-case input — safe to use in any rendering context
- PERF-07 complete — buildNested root card case no longer performs redundant tree walk
- Ready for Phase 7 Plan 2 (if any additional rendering enhancement plans exist)

---
*Phase: 07-rendering-enhancements*
*Completed: 2026-03-13*
