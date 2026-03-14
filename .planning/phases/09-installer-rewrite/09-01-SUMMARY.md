---
phase: 09-installer-rewrite
plan: 01
subsystem: installer
tags: [installer, detection, sentinel, upgrade, repair, tdd]

# Dependency graph
requires: []
provides:
  - "Installer engine module (.claude/burrow/lib/installer.cjs) with detect, performInstall, performUpgrade, performRepair, writeSentinelBlock, removeSentinelBlock"
  - "Sentinel marker constants SENTINEL_START / SENTINEL_END"
  - "CLAUDE_MD_SNIPPET constant for the agent memory instructions block"
affects:
  - "09-02 (installer CLI) — depends on this engine for all file operations and detection"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Engine/CLI separation: pure-function engine module, no readline; CLI wired on top in next plan"
    - "Sentinel markers as HTML comments (invisible in rendered markdown) for CLAUDE.md block management"
    - "TDD with node:test + temp directories: mkdtempSync / rmSync for hermetic test isolation"

key-files:
  created:
    - .claude/burrow/lib/installer.cjs
    - test/installer.test.cjs
  modified: []

key-decisions:
  - "Sentinel markers are HTML comments (<!-- burrow:start --> / <!-- burrow:end -->) so they are invisible in rendered markdown and don't pollute visible content"
  - "Line-ending detection on writeSentinelBlock: CRLF count vs LF count, match existing file convention"
  - "performRepair takes an explicit missingFiles list (from detect output) rather than re-running detection internally — keeps the function pure and testable"
  - "cards.json is never touched in performUpgrade — hardcoded preservation, not a flag"
  - "Version detection from VERSION file or package.json in .claude/burrow/ (returns null when absent)"

patterns-established:
  - "Pure engine + wired CLI: all file operations testable without mocking readline"
  - "detect() returns mode + contextual details (missing list, version, hasSentinel, hasLegacyClaude) in one call"

requirements-completed: [INST-02, INST-04, UPD-01]

# Metrics
duration: 3min
completed: 2026-03-14
---

# Phase 9 Plan 01: Installer Engine Summary

**Pure-function installer engine with fresh/upgrade/repair detection, sentinel CLAUDE.md block management, and cards.json preservation guarantee**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-14T22:52:50Z
- **Completed:** 2026-03-14T22:55:09Z
- **Tasks:** 1 (TDD: 2 commits — test RED + implementation GREEN)
- **Files modified:** 2

## Accomplishments

- `detect()` classifies install state into fresh/upgrade/repair by checking all four core paths; also reports `hasSentinel` and `hasLegacyClaude` from CLAUDE.md content
- `writeSentinelBlock()` inserts or replaces a sentinel-wrapped block with automatic line-ending detection (LF vs CRLF), preserving all surrounding content
- `removeSentinelBlock()` removes only the sentinel block; is a no-op if file is absent or markers not found
- `performInstall()` copies all source files, creates empty cards.json, adds .gitignore entry
- `performUpgrade()` unconditionally replaces source files, never touches cards.json
- `performRepair()` copies only the files in the `missing` list, leaves existing files untouched
- 34 automated tests all passing via `node --test`

## Task Commits

1. **Task 1 (RED): Failing tests** - `3faaf4a` (test)
2. **Task 1 (GREEN): Implementation** - `baa3bf8` (feat)

## Files Created/Modified

- `.claude/burrow/lib/installer.cjs` - Installer engine: detect, performInstall, performUpgrade, performRepair, writeSentinelBlock, removeSentinelBlock, constants
- `test/installer.test.cjs` - 34 tests covering all engine behaviors across 7 describe blocks

## Decisions Made

- Sentinel markers are HTML comments so they don't appear in rendered markdown
- Line-ending convention matched to existing file (CRLF when file uses CRLF, LF otherwise)
- `performRepair` accepts an explicit `missingFiles` parameter from `detect()` output to remain pure/testable
- cards.json preservation in upgrade is unconditional (hardcoded), not a flag — aligns with the requirement "re-run preserves data"

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test fix: `detect()` on a fresh dir returns no `missing` property**
- **Found during:** Task 1 (GREEN — running tests)
- **Issue:** The `returns results object` test for `performRepair` called `detect()` on a completely empty temp dir, which returns `mode: 'fresh'` without a `missing` array, causing `performRepair` to throw "missingFiles is not iterable"
- **Fix:** Updated that single test to partially seed the dir first so `detect` returns repair mode with a `missing` list, matching the intended usage pattern
- **Files modified:** test/installer.test.cjs
- **Verification:** All 34 tests pass
- **Committed in:** baa3bf8 (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — test bug fix)
**Impact on plan:** Trivial test fix, no scope change, no engine logic touched.

## Issues Encountered

None beyond the test fix above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Engine is complete and fully tested; ready for Plan 02 to wire the interactive CLI on top
- All exports match the interface specified in the plan frontmatter
- `CLAUDE_MD_SNIPPET` is exported so the CLI can pass it directly to `writeSentinelBlock`

---
*Phase: 09-installer-rewrite*
*Completed: 2026-03-14*
