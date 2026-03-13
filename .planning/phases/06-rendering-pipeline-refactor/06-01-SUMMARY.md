---
phase: 06-rendering-pipeline-refactor
plan: 01
subsystem: rendering
tags: [tree, renderTree, nested, pre-computed, descendantCount, TDD]

requires:
  - phase: 03-cli-and-rendering
    provides: "renderTree flat output and render.cjs with countActiveDescendants"

provides:
  - "renderTree returns nested card tree with pre-computed descendantCount and hasBody"
  - "render.cjs is a pure rendering module with zero mongoose dependency"
  - "archive filtering consolidated into renderTree only (no duplication)"

affects:
  - 06-02-burrow-tools-consumer-update
  - 07-display-ergonomics

tech-stack:
  added: []
  patterns:
    - "renderTree as single source of truth for archive filtering and descendant counting"
    - "Pre-computed metadata pattern: compute once in tree traversal, pass down to consumers"
    - "TDD RED-GREEN-REFACTOR: write failing tests first, then implement to pass"

key-files:
  created: []
  modified:
    - .claude/burrow/lib/mongoose.cjs
    - .claude/burrow/lib/render.cjs
    - test/render.test.cjs
    - test/mongoose.test.cjs

key-decisions:
  - "renderTree output shape changed from flat array with depth to nested tree with children arrays"
  - "No depth property on output cards — depth is implicit from nesting level"
  - "renderCard archiveFilter parameter kept in signature for backward compat but no longer used for filtering"
  - "formatCardLine uses card.descendantCount || 0 directly — no fallback computation"

patterns-established:
  - "buildNested internal function: single traversal that applies archive filter AND computes descendantCount once per card"
  - "Caller-trusts-pre-computed: renderCard trusts children array is already filtered and descendantCount is set"

requirements-completed: [REND-01, REND-02, REND-03, REND-04]

duration: 6min
completed: 2026-03-13
---

# Phase 6 Plan 01: Rendering Pipeline Refactor Summary

**renderTree refactored to nested card tree output with pre-computed descendantCount/hasBody; render.cjs now has zero mongoose dependency**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-03-13T09:57:25Z
- **Completed:** 2026-03-13T10:03:26Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- renderTree now returns nested `{breadcrumbs, cards}` where `cards` is a tree of `{id, title, descendantCount, hasBody, bodyPreview, created, archived, children}` — no flat `depth` property
- countActiveDescendants called exactly once per card during buildNested traversal (not duplicated in renderCard/formatCardLine)
- Archive filtering consolidated into renderTree only via `shouldInclude` — renderCard no longer re-filters children
- render.cjs has zero imports from mongoose.cjs — pure rendering module
- All 63 mongoose tests and 41 render tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor renderTree to return nested cards with pre-computed metadata** - `a40335c` (feat)
2. **Task 2: Update renderCard and formatCardLine to consume pre-computed metadata** - `ba7dd92` (feat)

**Plan metadata:** (pending final commit)

_Note: Both tasks used TDD: failing tests written first, then implementation to pass._

## Files Created/Modified

- `.claude/burrow/lib/mongoose.cjs` - renderTree rewritten with buildNested internal function returning nested tree
- `.claude/burrow/lib/render.cjs` - Removed mongoose import, removed archive filtering in renderCard, formatCardLine uses pre-computed descendantCount
- `test/mongoose.test.cjs` - Added flattenCards helper, updated all renderTree tests for nested output shape
- `test/render.test.cjs` - Updated fixtures to include descendantCount/hasBody on child cards; updated archive filter tests to reflect new no-filter contract

## Decisions Made

- renderTree output shape changed from flat array with `depth` to nested tree with `children` arrays — depth is now implicit from nesting, not a property
- `archiveFilter` parameter kept in `renderCard` signature for backward compatibility but not used for child filtering
- `formatCardLine` uses `card.descendantCount || 0` — no fallback to countActiveDescendants. If descendantCount is missing on a card, it shows 0 (not computed). Callers must set it.
- The `nestFlatCards` consumer in burrow-tools.cjs will be updated in Plan 02

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- renderTree nested output ready for Plan 02 (burrow-tools consumer update)
- render.cjs is now fully decoupled from mongoose.cjs
- `nestFlatCards` in burrow-tools.cjs still exists and uses the old flat output — Plan 02 must update this consumer

---
*Phase: 06-rendering-pipeline-refactor*
*Completed: 2026-03-13*

## Self-Check: PASSED

- SUMMARY.md: FOUND at .planning/phases/06-rendering-pipeline-refactor/06-01-SUMMARY.md
- Task 1 commit a40335c: FOUND
- Task 2 commit ba7dd92: FOUND
