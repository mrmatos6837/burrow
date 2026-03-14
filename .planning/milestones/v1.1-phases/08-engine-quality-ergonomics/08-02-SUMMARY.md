---
phase: 08-engine-quality-ergonomics
plan: 02
subsystem: database
tags: [validation, schema, error-handling, performance, burrow]

requires:
  - phase: 08-engine-quality-ergonomics
    provides: Plan 01 — countDescendants consolidation, findParent/moveCard optimization, makePreview truncate-first

provides:
  - schema validation on load() in warren.cjs (DATA-01)
  - human-readable error messages for corrupted/invalid cards.json
  - formatAge type guard for non-string input (QUAL-01)
  - PERF-09 skip migrate() for v2 data
  - PERF-10 eliminate collectAllIds from addCard

affects:
  - any phase using warren.cjs load()
  - any phase using addCard

tech-stack:
  added: []
  patterns:
    - "validateSchema() internal function throws Error with Burrow: invalid cards.json — <specific reason>"
    - "generateId() now takes no parameters — collision probability negligible at any reasonable scale"

key-files:
  created: []
  modified:
    - .claude/burrow/lib/warren.cjs
    - .claude/burrow/lib/core.cjs
    - .claude/burrow/lib/mongoose.cjs
    - .claude/burrow/lib/render.cjs
    - test/warren.test.cjs
    - test/render.test.cjs
    - test/mongoose.test.cjs

key-decisions:
  - "validateSchema() checks: non-null object, cards/items is array, first card id is string — spot-check only (not deep walk)"
  - "formatAge gains typeof guard as first line — non-string input returns '???' immediately before falsy check"
  - "PERF-09: version check moved into load() before calling migrate() — avoids function call overhead on every load"
  - "PERF-10: generateId() takes no parameters — crypto.randomUUID() collision-free at 8-char hex scale without needing to walk tree"
  - "collectAllIds kept in exports as deprecated for backward compat — not removed from core.cjs"

patterns-established:
  - "Schema validation runs before migration in load() — fail fast on structural errors before any transformation"
  - "Human-readable error messages follow: 'Burrow: invalid cards.json — <specific reason with actual vs expected type'"

requirements-completed: [DATA-01, DATA-02, PERF-08, PERF-09, PERF-10, QUAL-01]

duration: 20min
completed: 2026-03-14
---

# Phase 08 Plan 02: Engine Quality Ergonomics Summary

**Schema validation on cards.json load, formatAge type-guard, skip migrate() for v2 data, and O(1) ID generation without collectAllIds tree walk**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-14T00:00:00Z
- **Completed:** 2026-03-14
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- warren.cjs now validates schema before returning — corrupted files produce clear errors, not runtime crashes
- formatAge returns '???' for any non-string input (numeric timestamps, null, undefined) — never produces NaN
- migrate() skipped entirely for already-v2 data (PERF-09) — avoids unnecessary function call overhead
- addCard no longer walks the entire tree to collect IDs (PERF-10) — generateId() uses crypto.randomUUID() directly

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: schema validation + formatAge tests** - `c974c40` (test)
2. **Task 1 GREEN: warren schema validation + formatAge type guard** - `ad13d23` (feat)
3. **Task 2 GREEN: eliminate collectAllIds from addCard** - `1b23bb3` (feat)

Note: Task 2 RED tests and makePreview truncate-first were already committed as part of Phase 08-01 execution (`b0e0ecf`, `5e83a72`). No duplicate work.

## Files Created/Modified

- `.claude/burrow/lib/warren.cjs` - Added `validateSchema()` internal function; `load()` now skips `migrate()` for v2 data
- `.claude/burrow/lib/core.cjs` - `generateId()` simplified — no parameter needed, no collision check
- `.claude/burrow/lib/mongoose.cjs` - `addCard` calls `generateId()` without `collectAllIds` import
- `.claude/burrow/lib/render.cjs` - `formatAge()` gains `typeof isoString !== 'string'` guard
- `test/warren.test.cjs` - 6 new tests: schema validation failures + valid data + PERF-09 behavior
- `test/render.test.cjs` - 5 new tests: numeric/random-string/empty/undefined/null `created` values
- `test/mongoose.test.cjs` - makePreview + addCard PERF tests (contributed via 08-01 commits)

## Decisions Made

- validateSchema() only spot-checks the first card's `id` field — not a deep walk (schema validation should be O(1), not O(n))
- formatAge type guard added as the FIRST line — checking `typeof !== 'string'` before the falsy check catches numeric 0 which is falsy but also a number
- PERF-09 moved version check to `load()` instead of relying on migrate()'s internal `if (data.version >= 2) return data` — makes the skip explicit in the caller
- collectAllIds left in core.cjs exports with `@deprecated` JSDoc rather than deleted — avoids breaking any external consumers

## Deviations from Plan

None - plan executed exactly as written. makePreview truncate-first (PERF-08) was already implemented in Phase 08-01 execution; tests for it were already present and passing.

## Issues Encountered

The git stash/pop during execution restored prior 08-01 work alongside Task 2 changes. Verified: all 207 tests pass across warren, render, mongoose, and cli test suites.

## Next Phase Readiness

- warren.cjs is now hardened for production use — invalid data produces actionable errors
- Core engine (core.cjs, mongoose.cjs) is fully optimized for hot paths
- Phase 08-03 (init script) is already complete per git log

---
*Phase: 08-engine-quality-ergonomics*
*Completed: 2026-03-14*
