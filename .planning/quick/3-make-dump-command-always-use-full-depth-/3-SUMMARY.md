---
phase: quick
plan: 3
subsystem: cli
tags: [burrow, dump, render]

requires:
  - phase: 03-cli-pretty-print
    provides: renderCard with full/truncate logic
provides:
  - dump command defaults to full:true (no body truncation)
affects: []

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - .claude/burrow/burrow-tools.cjs
    - .claude/burrow/test/cli.test.cjs

key-decisions:
  - "dump defaults full:true since it is the show-everything command"

patterns-established: []

requirements-completed: []

duration: 2min
completed: 2026-03-09
---

# Quick Task 3: Make dump Command Always Use Full Depth Summary

**dump command now defaults to full:true so card bodies are never truncated in dump output**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-09T13:14:02Z
- **Completed:** 2026-03-09T13:15:50Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Changed dump command's --full flag default from false to true
- Added test confirming dump output contains no truncation marker

## Task Commits

Each task was committed atomically:

1. **Task 1: Default dump to full:true and add test** - `3a6adc9` (feat)

## Files Created/Modified
- `.claude/burrow/burrow-tools.cjs` - Changed dump parseArgs full default to true
- `.claude/burrow/test/cli.test.cjs` - Added test verifying no truncation in dump output

## Decisions Made
- dump defaults full:true since it is the "show me everything" command; truncating bodies defeats its purpose

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Adjusted test approach for dump body verification**
- **Found during:** Task 1
- **Issue:** Plan suggested creating a 300-char body card and checking dump output for the full string, but dump renders a synthesized root card with children shown as compact tree lines -- child bodies are not displayed in tree view
- **Fix:** Changed test to verify dump output contains no truncation marker text, which confirms full:true is the default
- **Files modified:** .claude/burrow/test/cli.test.cjs
- **Committed in:** 3a6adc9

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Test adjusted to match actual dump rendering behavior. No scope creep.

## Issues Encountered
None beyond the test adjustment noted above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- dump command behavior is now consistent with its purpose as the full-view command
- --full flag still works as a no-op for backward compatibility

---
*Quick Task: 3*
*Completed: 2026-03-09*
