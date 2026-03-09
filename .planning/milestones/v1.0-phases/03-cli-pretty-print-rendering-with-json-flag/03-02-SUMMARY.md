---
phase: 03-cli-pretty-print-rendering-with-json-flag
plan: 02
subsystem: cli
tags: [cli-router, json-flag, pretty-print, integration-tests]

requires:
  - phase: 03-cli-pretty-print-rendering-with-json-flag
    plan: 01
    provides: "renderCard, renderMutation, renderPath, renderError from render.cjs"
provides:
  - "CLI router with --json global flag for all commands"
  - "Human-readable default output for every command"
  - "Cleaned CLI surface: list and children removed, dump kept as alias"
affects: [04-agent-interface]

tech-stack:
  added: []
  patterns: [json-mode-toggle, render-function-wiring, error-routing-helper]

key-files:
  created: []
  modified:
    - .claude/burrow/burrow-tools.cjs
    - .claude/burrow/lib/render.cjs
    - .claude/burrow/test/cli.test.cjs

key-decisions:
  - "Global --json flag parsed before command switch and filtered from argv"
  - "handleError helper routes to JSON or pretty-print based on jsonMode"
  - "Root card synthesized with id (root) for pretty-print view"
  - "renderMutation move now uses toParentTitle from opts for accurate arrow output"
  - "Root breadcrumb special-cased to show 'burrow' not 'burrow > burrow'"

patterns-established:
  - "JSON toggle pattern: --json returns raw structured data, default returns rendered text"
  - "writeAndExit pattern: process.stdout.write + process.exit(0) for rendered output"
  - "runJson/runRaw test helpers: separate helpers for testing JSON vs pretty-print output"

requirements-completed: [PP-06, PP-07, PP-08]

duration: 4min
completed: 2026-03-08
---

# Phase 03 Plan 02: CLI Router Integration Summary

**CLI router refactored with global --json flag, render function wiring for all commands, and list/children commands removed**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-08T14:53:12Z
- **Completed:** 2026-03-08T14:57:12Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- All CLI commands output human-readable text by default via render functions
- --json flag on any command returns raw structured JSON (same contract as before)
- Removed list and children commands; dump remains as alias for get --depth 0
- 139 tests pass across all test files (cli, render, mongoose, warren)

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor burrow-tools.cjs for --json flag, render wiring, and command cleanup** - `4541746` (feat)
2. **Task 2: Update cli.test.cjs for --json flag and pretty-print integration tests** - `0cba0e0` (test)

## Files Created/Modified
- `.claude/burrow/burrow-tools.cjs` - CLI router with --json global flag, render wiring, handleError helper, list/children removed
- `.claude/burrow/lib/render.cjs` - Fixed root breadcrumb and move toParentTitle support
- `.claude/burrow/test/cli.test.cjs` - runJson/runRaw helpers, 6 pretty-print tests, 2 removed-command tests

## Decisions Made
- Global --json parsed from process.argv and filtered before parseArgs to avoid ERR_PARSE_ARGS_UNKNOWN_OPTION
- Root card synthesized with id "(root)" and title "burrow" for consistent card-detail format
- handleError helper centralizes JSON vs pretty-print error routing
- Test helper renamed from run() to runJson() with automatic --json injection; new runRaw() for raw output tests

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed root breadcrumb showing "burrow > burrow"**
- **Found during:** Task 1 (CLI router refactoring)
- **Issue:** renderCard used formatBreadcrumb which always prepends "burrow", causing root card to show "burrow > burrow"
- **Fix:** Special-case card.id === '(root)' in renderCard to use plain "burrow" breadcrumb
- **Files modified:** .claude/burrow/lib/render.cjs
- **Verification:** Manual test confirms root view shows single "burrow" breadcrumb
- **Committed in:** 4541746 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed renderMutation move hardcoding "root" as destination**
- **Found during:** Task 1 (CLI router refactoring)
- **Issue:** renderMutation move case hardcoded destination as "root" instead of using toParentTitle
- **Fix:** Added toParentTitle to opts destructuring and used it in the arrow output
- **Files modified:** .claude/burrow/lib/render.cjs
- **Verification:** Move command now shows correct source and destination parent titles
- **Committed in:** 4541746 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for correct rendering. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 3 complete: all CLI commands have human-readable default output
- --json flag preserves existing JSON contract for agent consumption
- Ready for Phase 4 (Agent Interface) which will use default pretty-print output and --json for parsing

---
*Phase: 03-cli-pretty-print-rendering-with-json-flag*
*Completed: 2026-03-08*
