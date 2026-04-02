---
phase: 16-workflow-load-step-load-command
plan: 02
subsystem: workflow
tags: [burrow, workflow, load, config, index, agent-memory]

# Dependency graph
requires:
  - phase: 16-01
    provides: loader.cjs module implementing burrow load command with JSON envelope output
provides:
  - Updated workflow LOAD step using burrow load dispatcher
  - Documented mode behaviors for full, index, none, auto
  - Lazy body-fetching pattern for index mode
  - Updated worked examples and Command Reference table
affects:
  - agents using burrow workflow (behavior change: Bash instead of Read tool for loading)
  - future workflow updates referencing LOAD step

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "burrow load as universal dispatcher: single Bash command replaces Read tool for session-start loading"
    - "JSON envelope parsing: agent reads mode field to determine data handling strategy"
    - "Lazy body-fetching: index mode loads titles/IDs, bodies fetched on demand via burrow read <id> --full"

key-files:
  created: []
  modified:
    - .claude/burrow/workflows/burrow.md

key-decisions:
  - "Workflow Step 1 (LOAD) uses Bash + burrow load instead of Read tool — D-09 implemented"
  - "Agent parses JSON envelope to determine resolved mode and handle data accordingly — D-10"
  - "None mode: agent skips loading, notes cardCount, proceeds with on-demand access — D-11"
  - "Invariant 5 updated to reference burrow load envelope instead of Read tool"

patterns-established:
  - "LOAD pattern: run burrow load via Bash, parse JSON envelope, branch on mode field"
  - "Re-LOAD after mutation: burrow load via Bash replaces old re-read cards.json pattern"

requirements-completed: [WFL-01, WFL-02, WFL-03, WFL-04, WFL-05, WFL-06]

# Metrics
duration: 8min
completed: 2026-04-02
---

# Phase 16 Plan 02: Workflow LOAD Step Summary

**Workflow Step 1 (LOAD) rewritten to dispatch via `burrow load` Bash command, with mode-aware behavior docs for full/index/none/auto and explicit lazy body-fetching pattern for index mode**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-02T18:05:47Z
- **Completed:** 2026-04-02T18:13:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Replaced Read-tool-based LOAD with `burrow load` Bash dispatcher in Step 1
- Documented all four modes (full, index, none, auto) with specific agent handling instructions
- Added lazy body-fetching pattern for index mode (WFL-06)
- Updated all eight worked examples to use new LOAD pattern
- Added `load` row to Command Reference table
- Updated Invariant 5 to reference burrow load JSON envelope
- Re-LOAD instruction in mutation examples (5, 6, 8) updated to use burrow load

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite workflow LOAD step for burrow load dispatcher** - `a7a4cea` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `.claude/burrow/workflows/burrow.md` - Step 1 rewritten to use burrow load dispatcher; all examples updated; Command Reference extended; Invariant 5 updated

## Decisions Made
- None beyond plan spec — all changes follow decisions D-09, D-10, D-11 from 16-CONTEXT.md

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 16 complete: loader.cjs module (Plan 01) + workflow LOAD step update (Plan 02)
- The full burrow load dispatch system is live: config-driven mode selection, JSON envelope output, workflow-level mode awareness
- All 398 tests pass
- Ready for v1.3 milestone completion

---
*Phase: 16-workflow-load-step-load-command*
*Completed: 2026-04-02*
