---
phase: 15-claude-md-sentinel-variants
plan: "01"
subsystem: installer
tags: [config, snippet, sentinel, atomic-write, trigger-words]

# Dependency graph
requires:
  - phase: 14-config-foundation-index-command
    provides: "CONFIG_SCHEMA pattern, atomicWriteJSON, config get/set/list API"
provides:
  - "atomicWriteFile(filePath, content) in core.cjs"
  - "TRIGGER_PRESETS constant with broad/minimal/none word sets"
  - "triggerPreset and triggerWords keys in CONFIG_SCHEMA and DEFAULTS"
  - "generateSnippet(config) in installer.cjs replacing CLAUDE_MD_SNIPPET constant"
affects:
  - 15-02
  - install.cjs (updated to use generateSnippet)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Preset-based derivation: when triggerPreset != 'custom', triggerWords derived from TRIGGER_PRESETS at load time (not stored)"
    - "Array type handling in config.set() via JSON.parse with validation"
    - "Dynamic snippet generation replacing static CLAUDE_MD_SNIPPET constant"

key-files:
  created: []
  modified:
    - .claude/burrow/lib/core.cjs
    - .claude/burrow/lib/config.cjs
    - .claude/burrow/lib/installer.cjs
    - install.cjs
    - test/config.test.cjs
    - test/installer.test.cjs

key-decisions:
  - "atomicWriteFile is a distinct function from atomicWriteJSON (D-10) - shares tmp+rename pattern but no shared helper"
  - "TRIGGER_PRESETS constant defines broad/minimal/none word sets; custom preset reads user-stored triggerWords"
  - "Preset-based triggerWords derived at load() time, not stored for non-custom presets (D-16)"
  - "generateSnippet takes full config object (D-08), not just loadMode"
  - "install.cjs updated to generateSnippet(CONFIG_DEFAULTS) — uses default broad config until per-project config integration in Plan 02"

patterns-established:
  - "Array config type: JSON.parse on raw CLI string value, validate result is array of strings"
  - "Snippet sections: HEADING + LOAD_INSTRUCTION (mode-specific) + TRIGGER_SECTION (optional) + FOOTER (constant)"

requirements-completed: [SNP-01, SNP-02]

# Metrics
duration: 25min
completed: 2026-04-02
---

# Phase 15 Plan 01: CLAUDE.md Sentinel Variants Summary

**atomicWriteFile utility, expandedCONFIG_SCHEMA with triggerPreset/triggerWords, and generateSnippet(config) producing 4 mode-specific CLAUDE.md sentinel block variants**

## Performance

- **Duration:** 25 min
- **Started:** 2026-04-02T17:00:00Z
- **Completed:** 2026-04-02T17:25:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Added `atomicWriteFile(filePath, content)` to core.cjs using the same tmp+rename pattern as `atomicWriteJSON`
- Expanded CONFIG_SCHEMA with `triggerPreset` (enum: broad/minimal/none/custom) and `triggerWords` (array) keys
- Added TRIGGER_PRESETS constant and preset-based derivation in `load()` — non-custom presets derive triggerWords at read time
- Created `generateSnippet(config)` in installer.cjs replacing the hardcoded `CLAUDE_MD_SNIPPET` constant
- Updated install.cjs to use `generateSnippet(CONFIG_DEFAULTS)` for all sentinel block writes
- 80 tests pass (33 config + 47 installer), no regressions in 376-test full suite

## Task Commits

Each task was committed atomically:

1. **Task 1: atomicWriteFile in core.cjs + CONFIG_SCHEMA expansion** - `b666802` (feat)
2. **Task 2: generateSnippet(config) in installer.cjs** - `dd0b0a0` (feat)

_Note: TDD tasks - both tasks followed RED->GREEN flow with failing tests written before implementation_

## Files Created/Modified
- `.claude/burrow/lib/core.cjs` - Added `atomicWriteFile(filePath, content)` function and export
- `.claude/burrow/lib/config.cjs` - Added TRIGGER_PRESETS constant, expanded DEFAULTS and CONFIG_SCHEMA, array type handling in set(), preset derivation in load()
- `.claude/burrow/lib/installer.cjs` - Added `generateSnippet(config)` replacing `CLAUDE_MD_SNIPPET`, updated exports
- `install.cjs` - Updated all 3 `writeSentinelBlock` calls to use `generateSnippet(CONFIG_DEFAULTS)`
- `test/config.test.cjs` - Added tests for triggerPreset/triggerWords schema, preset derivation, array validation
- `test/installer.test.cjs` - Added generateSnippet tests covering all 4 modes and trigger variants

## Decisions Made
- `atomicWriteFile` remains a distinct function from `atomicWriteJSON` — same pattern, separate functions (D-10)
- `generateSnippet` takes full config object not just loadMode (D-08) enabling trigger words interpolation
- `install.cjs` uses `CONFIG_DEFAULTS` for snippet generation — the real per-project config integration comes in Plan 02

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated install.cjs to use generateSnippet instead of removed CLAUDE_MD_SNIPPET**
- **Found during:** Task 2 (generateSnippet implementation)
- **Issue:** `CLAUDE_MD_SNIPPET` was removed from installer.cjs exports but `install.cjs` still imported and used it in 3 places — would cause runtime failures
- **Fix:** Updated install.cjs import to use `generateSnippet` and `CONFIG_DEFAULTS`, replaced all 3 `writeSentinelBlock(claudeMdPath, CLAUDE_MD_SNIPPET)` calls with `writeSentinelBlock(claudeMdPath, generateSnippet(CONFIG_DEFAULTS))`
- **Files modified:** install.cjs
- **Verification:** All 376 tests pass
- **Committed in:** dd0b0a0 (Task 2 commit)

**2. [Rule 1 - Bug] Updated existing DEFAULTS test to not use deepStrictEqual**
- **Found during:** Task 1 (CONFIG_SCHEMA expansion)
- **Issue:** Existing test used `assert.deepStrictEqual(config.DEFAULTS, { loadMode: 'auto', autoThreshold: 4000 })` which would fail after adding triggerPreset and triggerWords to DEFAULTS
- **Fix:** Changed to individual `assert.equal` checks for each key, preserving test intent without coupling to exact object shape
- **Files modified:** test/config.test.cjs
- **Verification:** 33 config tests pass
- **Committed in:** b666802 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep.

## Issues Encountered
None

## Next Phase Readiness
- `atomicWriteFile` is available for Plan 02 to use for crash-safe CLAUDE.md writes in `writeSentinelBlock`
- `generateSnippet(config)` is ready — Plan 02 can call it with the real per-project config (loaded after install)
- All existing tests continue to pass

---
*Phase: 15-claude-md-sentinel-variants*
*Completed: 2026-04-02*
