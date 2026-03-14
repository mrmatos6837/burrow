---
phase: 08-engine-quality-ergonomics
plan: 01
subsystem: database
tags: [tree-engine, performance, refactor, commonjs]

# Dependency graph
requires:
  - phase: 06-rendering-pipeline-refactor
    provides: renderTree nested output, countActiveDescendants usage pattern
  - phase: 07-rendering-enhancements
    provides: stable mongoose.cjs API surface

provides:
  - "countDescendants(card, { activeOnly: true }) parameterized function replacing countActiveDescendants"
  - "findParent single-traversal implementation"
  - "moveCard with findCardWithAncestry helper (2 walks instead of 4)"
  - "deleteCard returns full card object with descendantCount"
  - "archiveCard/unarchiveCard inline counting during recursive set + full card return"
  - "makePreview exported and truncate-first for huge body performance"

affects: [09-*, renderTree callers, CLI archive/delete commands]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "countDescendants with activeOnly option replaces separate countActiveDescendants"
    - "setArchivedRecursive returns descendant count for inline counting"
    - "findCardWithAncestry helper collapses 3 separate tree walks into 1"
    - "Spread operator for full card return: { ...card, descendantCount }"

key-files:
  created: []
  modified:
    - ".claude/burrow/lib/mongoose.cjs"
    - "test/mongoose.test.cjs"

key-decisions:
  - "countActiveDescendants removed entirely — countDescendants(card, { activeOnly: true }) is the API"
  - "findParent rewritten as single recursive function search(parentCard, container) — no separate root-level loop"
  - "moveCard still calls getPath for cycle detection (second walk); ancestorIds from findCardWithAncestry alone cannot detect descendant cycles without a full subtree walk"
  - "archiveCard/unarchiveCard and deleteCard all return { ...card, descendantCount } — consistent full-card shape"
  - "makePreview truncate-first: slice(0,80) before replace(/\\n/g) avoids processing huge strings"
  - "makePreview exported for testability (PERF-08)"

patterns-established:
  - "Full card return shape: { ...card, descendantCount } — not a slim DTO"
  - "Inline counting via recursive return value instead of separate tree walk"

requirements-completed: [PERF-01, PERF-02, PERF-03, QUAL-02, API-01]

# Metrics
duration: 20min
completed: 2026-03-14
---

# Phase 8 Plan 01: Engine Quality Ergonomics Summary

**Parameterized countDescendants, single-traversal findParent, 2-walk moveCard, and full-card return shapes for delete/archive/unarchive**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-14
- **Completed:** 2026-03-14
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `countActiveDescendants` removed; `countDescendants(card, { activeOnly: true })` is the unified API
- `findParent` now uses a single `search(parentCard, container)` recursion — no duplicate root-level loop
- `moveCard` uses `findCardWithAncestry` helper to find card + container + ancestors in one walk (reduced from 4 to 2 walks)
- `deleteCard`, `archiveCard`, `unarchiveCard` all return full card shape `{ ...card, descendantCount }` — consistent with `editCard`/`moveCard`
- `setArchivedRecursive` returns descendant count inline, eliminating separate `countDescendants` call after recursion
- `makePreview` exported, truncate-first behavior for huge body performance

## Task Commits

Each task was committed atomically:

1. **Task 1: Consolidate count functions, fix findParent, refactor moveCard** - `b0e0ecf` (refactor)
2. **Task 2: archiveCard inline counting + deleteCard full return + makePreview** - `5e83a72` (feat)

## Files Created/Modified
- `.claude/burrow/lib/mongoose.cjs` - Core tree engine with all refactors applied
- `test/mongoose.test.cjs` - Tests updated: removed countActiveDescendants, added countDescendants parameterized tests, full-shape return tests

## Decisions Made
- `countActiveDescendants` fully removed (not just deprecated) since `countDescendants(card, { activeOnly: true })` covers it with the same performance characteristics
- `moveCard` still uses `getPath` for cycle detection as a second walk — `ancestorIds` from the first walk captures ancestors of the moved card, not descendants; a descendant cycle requires checking if newParentId appears in card's subtree, which still needs a path walk
- Full card spread `{ ...card, descendantCount }` used consistently across delete/archive/unarchive — downstream CLI uses `result.title`, `result.id`, `result.descendantCount` which are all present

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] makePreview PERF-08 tests injected by concurrent 08-02 process**
- **Found during:** Task 1 (after commit, test file had new failing tests)
- **Issue:** A concurrent automated process pre-wrote RED tests for 08-02 PERF-08 (makePreview export + truncate-first) into test/mongoose.test.cjs, causing 5 test failures after Task 1 commit
- **Fix:** Implemented PERF-08 (makePreview truncate-first + export) to green the injected tests — unblocked Task 2 verification
- **Files modified:** .claude/burrow/lib/mongoose.cjs
- **Verification:** All 82 tests pass after fix
- **Committed in:** 5e83a72 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking)
**Impact on plan:** PERF-08 implemented slightly earlier than planned (08-02 scope), but naturally aligned since makePreview was already being refactored.

## Issues Encountered
- Concurrent automated process (08-02 pre-run) injected test cases for PERF-08/PERF-10 into the test file mid-execution. Handled by implementing PERF-08 in place (truncate-first makePreview) rather than reverting the test additions.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Engine quality refactors complete — all 127 tests (89 mongoose + 38 CLI) pass
- `countDescendants` is now the single counting API with `activeOnly` option
- Full card return shapes from delete/archive/unarchive ready for any future consumers
- Plan 08-02 (makePreview + addCard optimizations) partially pre-implemented; remaining work is any further engine ergonomics

---
*Phase: 08-engine-quality-ergonomics*
*Completed: 2026-03-14*
