---
phase: 02-views-and-features
plan: 01
subsystem: database
tags: [json, schema, migration, tree]

# Dependency graph
requires:
  - phase: 01-core-engine
    provides: "Tree engine (mongoose.cjs), storage (warren.cjs), CLI (burrow-tools.cjs)"
provides:
  - "v2 card schema: {id, title, created, archived, body, children[]}"
  - "Load-time v1->v2 migration in warren.cjs"
  - "Simplified tree ops without position/ordering/recompact"
  - "CLI with --body flag (replaces --notes), no --ordering or --position"
affects: [02-02-PLAN, views, archive, rendering]

# Tech tracking
tech-stack:
  added: []
  patterns: ["plain array children (no ordering wrapper)", "load-time schema migration"]

key-files:
  created: []
  modified:
    - ".claude/burrow/lib/warren.cjs"
    - ".claude/burrow/lib/mongoose.cjs"
    - ".claude/burrow/lib/core.cjs"
    - ".claude/burrow/burrow-tools.cjs"
    - ".claude/burrow/test/warren.test.cjs"
    - ".claude/burrow/test/mongoose.test.cjs"
    - ".claude/burrow/test/cli.test.cjs"

key-decisions:
  - "getContainer returns the raw array (data.cards or card.children), not a wrapper object"
  - "findParent returns {parent, container} where container is the array the card lives in"
  - "moveCard uses splice-at-index for requestedPosition instead of position field assignment"
  - "migrate() exported from warren.cjs for direct use in tests"

patterns-established:
  - "Schema migration: migrate() in warren.cjs runs on load(), idempotent on current version"
  - "Container pattern: getContainer always returns the array to push/splice on"

requirements-completed: [SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04]

# Metrics
duration: 4min
completed: 2026-03-08
---

# Phase 2 Plan 1: Schema Simplification Summary

**v2 card schema with plain array children, notes->body rename, and load-time v1 migration in warren.cjs**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-08T10:13:27Z
- **Completed:** 2026-03-08T10:17:31Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Simplified card schema to {id, title, created, archived, body, children[]} -- no position, no ordering
- Added migrate() in warren.cjs for transparent v1->v2 conversion on load
- Removed recompact() and getOrderedChildren() from mongoose.cjs
- Updated CLI: --body replaces --notes, removed --ordering and --position flags
- Full test suite: 64 tests passing (warren, mongoose, CLI integration)

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema migration and model simplification (TDD)**
   - `2c7c717` (test) - Failing tests for v2 schema
   - `f0ae66b` (feat) - Implementation: warren migrate, mongoose simplification, core update
2. **Task 2: Update CLI router and integration tests** - `04e010e` (feat)

## Files Created/Modified
- `.claude/burrow/lib/warren.cjs` - Added migrate()/migrateCard() for v1->v2 conversion, v2 default structure
- `.claude/burrow/lib/mongoose.cjs` - All ops use plain array children, removed recompact/getOrderedChildren
- `.claude/burrow/lib/core.cjs` - collectAllIds traverses card.children (plain array)
- `.claude/burrow/burrow-tools.cjs` - --body replaces --notes, removed --ordering/--position
- `.claude/burrow/test/warren.test.cjs` - Migration tests: v1->v2, idempotent, edge cases
- `.claude/burrow/test/mongoose.test.cjs` - All fixtures/assertions updated for v2 schema
- `.claude/burrow/test/cli.test.cjs` - Integration tests updated for v2 output

## Decisions Made
- getContainer returns the raw array (data.cards or card.children) rather than a wrapper object -- simplifies all callers
- findParent returns {parent, container} where container is the array -- enables direct splice/push
- moveCard uses splice-at-index for requestedPosition rather than position field assignment
- migrate() exported from warren.cjs so tests can call it directly

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- v2 schema foundation ready for Plan 02 (tree rendering and archive features)
- All downstream code can rely on plain array children and body field
- Migration handles any existing v1 data files transparently

---
*Phase: 02-views-and-features*
*Completed: 2026-03-08*

## Self-Check: PASSED

All 7 files verified present. All 3 commit hashes verified in git log.
