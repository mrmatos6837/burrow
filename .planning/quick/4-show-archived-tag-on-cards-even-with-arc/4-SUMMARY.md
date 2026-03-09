---
phase: quick
plan: 4
subsystem: rendering
tags: [render, archive, tree-display]

requires:
  - phase: 03-cli-pretty-print
    provides: render.cjs formatting functions
provides:
  - "[archived] tag always shown on archived cards regardless of filter mode"
affects: []

tech-stack:
  added: []
  patterns:
    - "Unconditional archived label: card.archived drives [archived] tag, no filter-mode gate"

key-files:
  created: []
  modified:
    - .claude/burrow/lib/render.cjs
    - .claude/burrow/test/render.test.cjs

key-decisions:
  - "Removed showArchived parameter entirely -- archived cards always display [archived] tag unconditionally"
  - "Simplified formatCardLine and renderTreeLines signatures by removing unnecessary parameter"

requirements-completed: [QUICK-4]

duration: 1min
completed: 2026-03-09
---

# Quick Task 4: Show [archived] Tag on Cards Summary

**Removed showArchived gate so archived cards always display [archived] tag regardless of archive filter mode**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-09T13:18:49Z
- **Completed:** 2026-03-09T13:20:16Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 2

## Accomplishments
- Archived cards now always show [archived] tag in tree listings regardless of filter mode
- Simplified render.cjs by removing unnecessary showArchived parameter from formatCardLine, renderTreeLines, and renderCard
- Net reduction of 17 lines of code (simpler is better)
- All 147 tests pass with no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Add [archived] tag tests** - `dae577e` (test)
2. **Task 1 GREEN: Always show [archived] on archived cards** - `d64c360` (fix)

_TDD task: test commit followed by implementation commit_

## Files Created/Modified
- `.claude/burrow/lib/render.cjs` - Removed showArchived parameter gate; archived cards always tagged
- `.claude/burrow/test/render.test.cjs` - Added 3 tests for [archived] tag visibility across filter modes

## Decisions Made
- Removed showArchived parameter entirely rather than always passing true -- simpler API, fewer parameters to thread through
- The archive filter controls which cards appear, not whether they're labeled -- cleaner separation of concerns

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
N/A - standalone quick task.

---
*Quick task: 4*
*Completed: 2026-03-09*
