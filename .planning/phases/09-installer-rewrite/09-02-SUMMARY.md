---
phase: 09-installer-rewrite
plan: 02
subsystem: installer
tags: [installer, cli, readline, interactive, uninstall, --yes, sentinel]

# Dependency graph
requires:
  - phase: 09-01
    provides: "Installer engine (detect, performInstall, performUpgrade, performRepair, writeSentinelBlock, removeSentinelBlock, CLAUDE_MD_SNIPPET)"
provides:
  - "Interactive CLI installer (install.cjs) with readline prompts, --yes non-interactive mode, --uninstall with confirmation"
  - "Post-install getting-started message"
  - "CLI integration test suite (test/install-cli.test.cjs)"
affects:
  - "09-03 (packaging) — install.cjs is the user-facing entry point for npm publish"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Engine/CLI separation: install.cjs wires readline on top of pure-function installer engine"
    - "readline.createInterface with ask() promise wrapper for clean async prompt handling"
    - "Default-NO confirmation for destructive operations (--uninstall without --yes)"
    - "Empty parent directory cleanup after uninstall"

key-files:
  created:
    - test/install-cli.test.cjs
  modified:
    - install.cjs

key-decisions:
  - "ask() wraps readline.question in a promise, resolving to defaultAnswer on empty input — keeps prompt code linear and readable"
  - "readline interface created only when interactive mode is needed (--yes skips it entirely)"
  - "Uninstall default confirmation is NO (destructive action) vs upgrade/repair which default to YES"
  - "Empty parent dir cleanup order: commands/ first, then .claude/, then .planning/ — leaf-to-root"

patterns-established:
  - "ok()/skip()/fail()/warn() helper pattern for checklist output"
  - "Uninstall lists targets before confirming — user sees exactly what will be removed"

requirements-completed: [INST-01, INST-03, INST-05]

# Metrics
duration: 3min
completed: 2026-03-14
---

# Phase 9 Plan 02: Installer CLI Summary

**Interactive CLI installer with readline prompts, --yes non-interactive mode, --uninstall with default-NO confirmation, and empty parent directory cleanup**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-14T22:57:11Z
- **Completed:** 2026-03-14T22:59:22Z
- **Tasks:** 2 (Task 1: install.cjs rewrite, Task 2: TDD integration tests)
- **Files modified:** 2

## Accomplishments

- `install.cjs` rewritten: wires engine functions to readline prompts, `--yes`, `--uninstall`, `--help`, positional target-dir
- Fresh install prompts for directory and CLAUDE.md opt-in; upgrade and repair show what will happen and confirm before proceeding
- Uninstall removes all burrow files and cleans up empty parent directories (`.claude/commands/`, `.claude/`, `.planning/`)
- Post-install "getting started" message explains usage
- 12 integration tests across 4 describe blocks, all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite install.cjs CLI with readline, --yes, and --uninstall** - `11a544c` (feat)
2. **Task 2: CLI tests for non-interactive and uninstall paths** - `d44ff29` (test)

## Files Created/Modified

- `install.cjs` - Complete rewrite: interactive CLI with readline, --yes, --uninstall, --help, all mode flows
- `test/install-cli.test.cjs` - 12 integration tests covering fresh install, upgrade, uninstall, sentinel removal

## Decisions Made

- `ask()` wraps readline.question in a Promise for clean async prompt handling
- readline interface is only created when interactive mode is needed — `--yes` skips it entirely to avoid hanging on stdin
- Uninstall default is NO (explicit 'y' required) because it's destructive; upgrade/repair default to YES
- Empty parent dir cleanup walks leaf-to-root: `.claude/commands/` then `.claude/` then `.planning/`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `install.cjs` is the fully functional user-facing entry point; ready for Plan 03 (packaging/npm)
- Engine (Plan 01) + CLI (Plan 02) together form the complete installer; all requirements met
- 12 integration tests provide solid regression coverage for packaging work

---
*Phase: 09-installer-rewrite*
*Completed: 2026-03-14*
