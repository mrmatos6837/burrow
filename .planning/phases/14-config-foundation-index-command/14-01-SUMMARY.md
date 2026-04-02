---
phase: 14-config-foundation-index-command
plan: "01"
subsystem: config
tags: [config, atomic-write, cli, schema-validation, node-builtins]

requires: []

provides:
  - atomicWriteJSON() shared utility in core.cjs for atomic file writes
  - config.cjs library with get/set/list/load/save API and closed schema validation
  - burrow config get|set|list CLI commands
  - renderConfigList() formatted box output in render.cjs
  - Config defaults: loadMode=auto, autoThreshold=4000

affects:
  - Phase 15 (index command — uses config.cjs for loadMode)
  - Phase 16 (workflow branching — reads loadMode at runtime)
  - Phase 17 (installer onboarding — writes config.json on setup)

tech-stack:
  added: []
  patterns:
    - "Atomic write pattern: backup existing, write to .tmp, rename to target — now shared via atomicWriteJSON() in core.cjs"
    - "Closed schema validation: CONFIG_SCHEMA defines type, allowed values, and validators per key"
    - "CLI error pattern: unknown config key throws with valid keys listed; invalid value throws with valid values listed"

key-files:
  created:
    - .claude/burrow/lib/config.cjs
    - test/config.test.cjs
  modified:
    - .claude/burrow/lib/core.cjs
    - .claude/burrow/lib/warren.cjs
    - .claude/burrow/lib/render.cjs
    - .claude/burrow/burrow-tools.cjs
    - test/cli.test.cjs
    - test/render.test.cjs

key-decisions:
  - "atomicWriteJSON extracted to core.cjs so warren.cjs and config.cjs share one implementation (D-09)"
  - "CONFIG_SCHEMA is closed — only loadMode and autoThreshold are valid; unknown keys throw descriptive error (D-03, D-20)"
  - "config.load() throws on missing config.json with message directing to installer (D-21)"
  - "autoThreshold accepts string from CLI and converts to integer; validated as positive integer (D-04)"
  - "CFG-05 satisfied at persistence layer only — runtime auto-detection (size check / mode switch) deferred to Phase 16 (WFL-05)"

patterns-established:
  - "Shared atomicWriteJSON in core.cjs: all JSON persistence goes through core.cjs — no duplicate atomic write logic"
  - "Config schema pattern: each key has type, optional values array, optional validate function, optional validateMsg"

requirements-completed: [CFG-01, CFG-02, CFG-03, CFG-04, CFG-05]

duration: 10min
completed: 2026-04-02
---

# Phase 14 Plan 01: Config Foundation Summary

**Config system with closed schema validation: atomicWriteJSON in core.cjs, config.cjs get/set/list API, and burrow config CLI commands**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-02T13:13:00Z
- **Completed:** 2026-04-02T13:23:14Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Extracted `atomicWriteJSON()` to `core.cjs` — warren.cjs and config.cjs now share one atomic write implementation
- Created `config.cjs` with full get/set/list/load/save API, closed schema validation, and descriptive error messages
- Wired `burrow config get|set|list` CLI commands in burrow-tools.cjs with proper error handling
- Added `renderConfigList()` to render.cjs for formatted box output of config values
- 256 tests passing (21 new config tests, 6 new CLI integration tests)

## Task Commits

1. **test(14-01): add failing tests for config library** - `f4afefb` (TDD RED)
2. **feat(14-01): extract atomicWriteJSON to core.cjs and create config.cjs** - `e67d437` (TDD GREEN)
3. **feat(14-01): wire config CLI commands and renderConfigList** - `5fe3903` (feat)

## Files Created/Modified

- `.claude/burrow/lib/config.cjs` — Config get/set/list/load/save API with CONFIG_SCHEMA and DEFAULTS
- `.claude/burrow/lib/core.cjs` — Added atomicWriteJSON() shared utility
- `.claude/burrow/lib/warren.cjs` — Refactored save() to use shared atomicWriteJSON (removed BACKUP_EXT/TMP_EXT)
- `.claude/burrow/lib/render.cjs` — Added renderConfigList() with formatted box output
- `.claude/burrow/burrow-tools.cjs` — Added config command (get/set/list subcommands), updated help text
- `test/config.test.cjs` — 21 unit tests for config library (TDD RED→GREEN)
- `test/cli.test.cjs` — 6 integration tests for config CLI command
- `test/render.test.cjs` — Updated export count assertion (4→5 after renderConfigList)

## Decisions Made

- atomicWriteJSON extracted to core.cjs per D-09 — eliminates the duplicate backup+tmp+rename pattern between warren.cjs and config.cjs
- CONFIG_SCHEMA is closed — only `loadMode` and `autoThreshold` are valid keys; unknown keys throw with valid keys listed
- config.load() throws `"No config.json found. Run npx create-burrow to set up."` when file missing (D-21)
- CFG-05 (auto mode threshold) satisfied at the persistence layer only — runtime auto-detection deferred to Phase 16 (WFL-05)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated render.test.cjs export count assertion**
- **Found during:** Task 2 (renderConfigList implementation)
- **Issue:** Existing test `exports only four functions` hardcoded `4` — failed after adding renderConfigList as 5th export
- **Fix:** Updated test descriptions and assertion to expect 5 functions; added assertion for renderConfigList
- **Files modified:** test/render.test.cjs
- **Verification:** Full test suite passes (256/256)
- **Committed in:** 5fe3903 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug created by our changes)
**Impact on plan:** Necessary correction — the test was accurately tracking export count, needed to reflect the new export.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- config.cjs is ready for consumption by Phase 15 (burrow index command) and Phase 17 (installer onboarding)
- atomicWriteJSON is available in core.cjs for any future storage needs
- No blockers — all tests passing, CLI verified end-to-end

## Self-Check: PASSED

- config.cjs: FOUND
- core.cjs: FOUND
- config.test.cjs: FOUND
- 14-01-SUMMARY.md: FOUND
- commit f4afefb: FOUND
- commit e67d437: FOUND
- commit 5fe3903: FOUND

---
*Phase: 14-config-foundation-index-command*
*Completed: 2026-04-02*
