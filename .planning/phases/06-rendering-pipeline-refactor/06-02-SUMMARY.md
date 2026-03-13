---
phase: 06-rendering-pipeline-refactor
plan: 02
subsystem: rendering
tags: [renderTree, nested, nestFlatCards, breadcrumbs, refactor]

requires:
  - phase: 06-rendering-pipeline-refactor
    plan: 01
    provides: "renderTree returns nested {breadcrumbs, cards} with pre-computed descendantCount and children arrays"

provides:
  - "CLI (burrow-tools.cjs) uses renderTree nested output directly — no flatten-renest roundtrip"
  - "nestFlatCards function deleted from codebase"
  - "read command uses treeResult.breadcrumbs instead of a separate getBreadcrumbs call"
  - "dump command uses treeResult.cards directly (already nested)"

affects:
  - 07-display-ergonomics

tech-stack:
  added: []
  patterns:
    - "Consumer trusts nested output: CLI passes treeResult.cards directly to renderCard without reconstruction"
    - "Full body merge pattern: card view merges body/title from findById onto treeResult.cards[0] since renderTree only stores bodyPreview"

key-files:
  created: []
  modified:
    - .claude/burrow/burrow-tools.cjs

key-decisions:
  - "nestFlatCards deleted — no longer needed since renderTree returns nested tree"
  - "read card view: treeResult.cards[0] is the root card; full body merged from findById call"
  - "getBreadcrumbs kept for add/edit commands — they do not call renderTree so a separate getPath call is still correct there"
  - "read command uses treeResult.breadcrumbs (computed inside renderTree) instead of duplicate getBreadcrumbs call"

patterns-established:
  - "Full body merge: renderTree cards use bodyPreview; callers needing full body merge it via findById before passing to renderCard"

requirements-completed: [REND-05, REND-02]

duration: 4min
completed: 2026-03-13
---

# Phase 6 Plan 02: Burrow Tools Consumer Update Summary

**nestFlatCards deleted and CLI updated to pass renderTree's nested output directly to renderCard, eliminating the flatten-renest roundtrip**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-13T10:26:43Z
- **Completed:** 2026-03-13T10:30:43Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- nestFlatCards function (26 lines) deleted from burrow-tools.cjs — no longer needed since renderTree already returns nested cards
- read command (card view) now uses treeResult.cards[0] directly with full body merged from findById
- read command now uses treeResult.breadcrumbs instead of a separate getBreadcrumbs / getPath call
- read command (root view) and dump command both use treeResult.cards directly as children
- All 151 tests pass (38 CLI + 63 mongoose + 41 render + others)

## Task Commits

Each task was committed atomically:

1. **Task 1: Delete nestFlatCards and update read/dump commands to use nested renderTree output** - `41442ca` (refactor)
2. **Task 2: Run full test suite and verify no nestFlatCards references remain** - (verification only, no new code changes)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `.claude/burrow/burrow-tools.cjs` - Deleted nestFlatCards, updated read (both branches) and dump to use renderTree nested output; read uses treeResult.breadcrumbs for card view

## Decisions Made

- nestFlatCards deleted entirely — its purpose was to reconstruct nesting from a flat array, which renderTree now provides directly
- getBreadcrumbs kept in burrow-tools.cjs because add/edit commands don't call renderTree; they still need a separate getPath call for breadcrumbs
- The read card view merges full body from findById onto treeResult.cards[0] because renderTree only stores bodyPreview (not the full body)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 6 complete: renderTree pipeline refactor fully done (Plans 01 and 02)
- render.cjs is dependency-free from mongoose.cjs
- CLI consumer uses nested output end-to-end — no intermediate flat arrays
- Phase 7 (display ergonomics) can now build on the clean nested rendering pipeline

---
*Phase: 06-rendering-pipeline-refactor*
*Completed: 2026-03-13*
