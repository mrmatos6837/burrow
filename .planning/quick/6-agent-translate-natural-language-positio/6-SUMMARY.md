---
phase: quick-6
plan: 01
subsystem: agent-interface
tags: [workflow, position, natural-language, cli]

requires:
  - phase: quick-2
    provides: "--at flag implementation on add and move commands"
provides:
  - "Agent workflow guidance for translating natural language positions to --at values"
affects: [agent-interface]

tech-stack:
  added: []
  patterns: [natural-language-to-index mapping in workflow docs]

key-files:
  created: []
  modified: [.claude/burrow/workflows/burrow.md]

key-decisions:
  - "Position Translation section placed between Command Reference and Rendering Rules"
  - "Example 8 added at end of Worked Examples to demonstrate position-based insertion"

patterns-established:
  - "Ordinal-to-index: subtract 1 from human ordinal for 0-based --at value"
  - "Omit --at for append (last/end/bottom) since default behavior already appends"

requirements-completed: []

duration: 1min
completed: 2026-03-09
---

# Quick Task 6: Position Translation Summary

**Workflow guidance for translating natural language position references (first/last/before/after) to 0-based --at index values**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-09T14:32:04Z
- **Completed:** 2026-03-09T14:33:04Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Updated command reference table with --at flag for add and move commands
- Added Position Translation section with 7-row mapping table (first, second, third, position N, last, before X, after X)
- Added Example 8 demonstrating position-based insertion workflow

## Task Commits

Each task was committed atomically:

1. **Task 1: Add position translation section and update command reference** - `62a36f4` (feat)

## Files Created/Modified
- `.claude/burrow/workflows/burrow.md` - Updated command reference, added Position Translation section, added Example 8

## Decisions Made
- Position Translation section placed between Command Reference and Rendering Rules for logical flow
- Example 8 follows the established 3-step LOAD/THINK/EXECUTE pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Workflow file now fully documents --at flag usage for agents
- No blockers

---
*Phase: quick-6*
*Completed: 2026-03-09*
