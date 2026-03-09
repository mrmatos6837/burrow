---
phase: quick-5
plan: 01
subsystem: ui
tags: [render, tree-view, formatting]

provides:
  - "Updated formatCardLine with new indicator ordering: title (count) ellipsis [archived] age"
  - "Ellipsis U+2026 replaces dot U+2022 as body indicator"
  - "Count hidden when 0 to reduce noise"

tech-stack:
  added: []
  patterns:
    - "Indicators inline after title instead of right-aligned count"

key-files:
  created: []
  modified:
    - ".claude/burrow/lib/render.cjs"
    - ".claude/burrow/test/render.test.cjs"

key-decisions:
  - "Ellipsis U+2026 reused for body indicator (same char as truncation) -- no ambiguity since they appear in different contexts"
  - "Count uses single space prefix instead of double when shown"

requirements-completed: [QUICK-5]

duration: 2min
completed: 2026-03-09
---

# Quick Task 5: Render Move Count After Title, Replace Dot Summary

**Tree line indicators reordered to title (N) ... [archived] age, with count hidden at 0 and ellipsis replacing dot**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-09T13:26:48Z
- **Completed:** 2026-03-09T13:28:25Z
- **Tasks:** 2 (TDD: RED + GREEN)
- **Files modified:** 2

## Accomplishments
- Count (N) now appears immediately after title for better scannability
- Count hidden when descendant count is 0 to reduce visual noise
- Body indicator changed from dot U+2022 to ellipsis U+2026 to better signal "there's more"
- Indicator order: title -> count -> ellipsis -> [archived] -> right-aligned age
- 5 new indicator ordering tests covering all format combos

## Task Commits

Each task was committed atomically:

1. **Task 1: Update tests for new tree line format** - `307dea2` (test) - RED phase
2. **Task 2: Rewrite formatCardLine indicator ordering** - `dc44eef` (feat) - GREEN phase

## Files Created/Modified
- `.claude/burrow/lib/render.cjs` - Updated formatCardLine with new indicator ordering and ellipsis body marker
- `.claude/burrow/test/render.test.cjs` - Updated 2 existing tests, added 5 new indicator ordering tests

## Decisions Made
- Ellipsis U+2026 reused for body indicator (same char as truncation) -- no ambiguity since they appear in different contexts
- Count uses single space prefix instead of double when shown

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

---
*Quick Task: 5*
*Completed: 2026-03-09*
