---
phase: 01-core-engine
plan: 02
subsystem: cli
tags: [cli-router, node-parseargs, child-process-test, commonjs, integration-test]

# Dependency graph
requires:
  - phase: 01-core-engine/01
    provides: "core.cjs, storage.cjs, tree.cjs -- data layer modules"
provides:
  - "burrow-tools.cjs: CLI entry point with router for all 8 subcommands"
  - "cli.test.cjs: 20 integration tests exercising CLI via child_process"
affects: [02-views-and-features, 03-agent-interface]

# Tech tracking
tech-stack:
  added: [node:util/parseArgs]
  patterns: [cli-router-switch, child-process-integration-test, temp-dir-isolation]

key-files:
  created:
    - .claude/burrow/burrow-tools.cjs
    - .claude/burrow/test/cli.test.cjs
  modified: []

key-decisions:
  - "Used util.parseArgs (Node built-in) for CLI argument parsing -- zero dependencies"
  - "Move cycle/not-found errors output INVALID_OPERATION code (tree returns null for both cases)"
  - "Path command strips children from output for clean ancestry display"

patterns-established:
  - "CLI router: thin switch dispatching to tree operations with load/save bracketing"
  - "Integration tests: each test group gets isolated temp dir via mkdtempSync"
  - "Error detection: null returns from tree.cjs mapped to errorOut with appropriate codes"

requirements-completed: [CLI-01, CLI-02]

# Metrics
duration: 2min
completed: 2026-03-07
---

# Phase 1 Plan 02: CLI Wiring Summary

**CLI router with 8 subcommands (add/edit/delete/move/get/children/list/path) and 20 integration tests via child_process**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-07T16:59:10Z
- **Completed:** 2026-03-07T17:01:10Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments
- Complete CLI tool at .claude/burrow/burrow-tools.cjs wiring all data layer modules
- All 8 subcommands working: add, edit, delete, move, get, children, list, path
- 20 integration tests covering happy paths, error cases, cycle rejection, and auto-init
- Full test suite passes: 63 tests (43 unit + 20 integration)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create CLI router with all 8 subcommands** - `55ce88e` (feat)
2. **Task 2: Create CLI integration tests** - `6ab11cd` (test)

## Files Created/Modified
- `.claude/burrow/burrow-tools.cjs` - CLI entry point with shebang, switch router for all 8 subcommands, try/catch error handling
- `.claude/burrow/test/cli.test.cjs` - 20 integration tests using node:test, child_process.execFileSync, isolated temp dirs

## Decisions Made
- Used `util.parseArgs` (Node built-in) instead of external CLI parser -- keeps zero-dependency philosophy
- Move command uses `INVALID_OPERATION` code for both not-found and cycle cases (tree.cjs returns null for both)
- Path command strips `children` property from each ancestry element to keep output clean and focused

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- CLI tool is fully functional and tested, ready for Phase 2 (Views and Features)
- Phase 2 can consume CLI via child_process or require the modules directly
- Agent interface (Phase 3) will wrap CLI commands for agent consumption

## Self-Check: PASSED

All files verified present. All task commits verified in git log.

---
*Phase: 01-core-engine*
*Completed: 2026-03-07*
