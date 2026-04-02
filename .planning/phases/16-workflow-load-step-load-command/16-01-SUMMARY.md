---
phase: 16-workflow-load-step-load-command
plan: 01
subsystem: cli
tags: [loader, config, json, burrow-tools, tdd]

# Dependency graph
requires:
  - phase: 14-config-foundation-index-command
    provides: "config.cjs with load/set/get, buildIndex in mongoose.cjs, warren.cjs storage layer"
  - phase: 15-claude-md-sentinel-variants
    provides: "generateSnippet from config, atomic CLAUDE.md writes"
provides:
  - "lib/loader.cjs — universal load dispatcher returning JSON envelope for all 4 modes"
  - "indexDepth config key — depth control for index mode"
  - "burrow load CLI command — outputs JSON envelope to stdout"
  - "warren.dataPath() exported — allows loader to stat cards.json for auto mode"
affects: [phase-16-plan-02, workflows, agent-onboarding]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Load envelope pattern: { mode, cardCount, data? } — uniform JSON output for all modes"
    - "Auto mode uses fs.statSync + fileSizeBytes / 4 for token estimation"

key-files:
  created:
    - .claude/burrow/lib/loader.cjs
    - test/loader.test.cjs
  modified:
    - .claude/burrow/lib/config.cjs
    - .claude/burrow/lib/warren.cjs
    - .claude/burrow/burrow-tools.cjs

key-decisions:
  - "loader.cjs imports warren.cjs directly (not via subprocess) — testable, no overhead"
  - "dataPath() exported from warren.cjs — loader needs to stat the file for auto mode without re-implementing path logic"
  - "countCards() in loader.cjs — recursive count of all cards including children for cardCount field"
  - "indexDepth=0 means unlimited (passed as depth:0 to buildIndex which treats 0 as Infinity)"

patterns-established:
  - "JSON envelope pattern: { mode, cardCount, data? } for machine-readable load output"
  - "TDD approach: RED (failing tests) → GREEN (minimal implementation) → pass"

requirements-completed: [WFL-01, WFL-02, WFL-03, WFL-04, WFL-05]

# Metrics
duration: 20min
completed: 2026-04-02
---

# Phase 16 Plan 01: workflow-load-step-load-command Summary

**`burrow load` command dispatches to full/index/none/auto based on config.json, returning a JSON envelope with mode, cardCount, and mode-appropriate data**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-04-02T18:00:00Z
- **Completed:** 2026-04-02T18:20:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created lib/loader.cjs with universal load dispatcher supporting all 4 modes (full/index/none/auto)
- Added indexDepth to CONFIG_SCHEMA and DEFAULTS in config.cjs (non-negative integer, default 0 = unlimited)
- Exported dataPath() from warren.cjs for auto mode file size checks
- Wired `case 'load'` into burrow-tools.cjs with raw JSON output to stdout
- 20 tests covering all modes, auto threshold logic, indexDepth depth limiting, and edge cases

## Task Commits

Each task was committed atomically:

1. **Task 1: Add indexDepth to CONFIG_SCHEMA and create lib/loader.cjs** - `32338cc` (feat)
2. **Task 2: Wire `case 'load'` into burrow-tools.cjs CLI** - `be5cc1b` (feat)

## Files Created/Modified
- `.claude/burrow/lib/loader.cjs` - Universal load dispatcher; exports load(cwd) returning JSON envelope
- `test/loader.test.cjs` - 20 tests covering all load modes, auto threshold, indexDepth, edge cases
- `.claude/burrow/lib/config.cjs` - Added indexDepth to CONFIG_SCHEMA and DEFAULTS
- `.claude/burrow/lib/warren.cjs` - Exported dataPath() so loader can stat cards.json
- `.claude/burrow/burrow-tools.cjs` - Added loader require, case 'load', updated error messages

## Decisions Made
- Exported `dataPath()` from warren.cjs (deviation Rule 2: loader needs it for auto mode fs.statSync)
- Used direct require of warren.cjs in loader instead of subprocess — keeps code testable and avoids overhead
- `countCards()` implemented directly in loader.cjs since warren.cjs and mongoose.cjs don't export a count utility

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Exported dataPath() from warren.cjs**
- **Found during:** Task 1 (creating lib/loader.cjs)
- **Issue:** warren.cjs had dataPath() defined but not exported; loader.cjs required it for fs.statSync in auto mode
- **Fix:** Added dataPath to module.exports in warren.cjs
- **Files modified:** .claude/burrow/lib/warren.cjs
- **Verification:** loader tests pass including auto-mode tests that use statSync
- **Committed in:** 32338cc (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (missing export needed for correctness)
**Impact on plan:** Required for auto mode to work. No scope creep.

## Issues Encountered
None - implementation matched plan specification exactly after fixing the missing export.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `burrow load` command complete and tested
- loader.cjs is the runtime logic that makes the config system meaningful
- Ready for Phase 16 Plan 02: update CLAUDE.md sentinel/workflow to use `burrow load` instead of reading cards.json directly

---
*Phase: 16-workflow-load-step-load-command*
*Completed: 2026-04-02*
