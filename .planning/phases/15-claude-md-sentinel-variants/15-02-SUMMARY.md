---
phase: 15-claude-md-sentinel-variants
plan: "02"
subsystem: installer
tags: [atomic-write, crash-safety, installer, config]

# Dependency graph
requires:
  - phase: 15-claude-md-sentinel-variants
    plan: "01"
    provides: "atomicWriteFile in core.cjs, generateSnippet(config) in installer.cjs"
provides:
  - "Crash-safe writeSentinelBlock using atomicWriteFile (tmp+rename)"
  - "Crash-safe removeSentinelBlock using atomicWriteFile (tmp+rename)"
  - "install.cjs reads per-project config via config.load(targetDir) for generateSnippet"
affects:
  - CLAUDE.md writes (now crash-safe — original preserved if power fails mid-write)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Atomic write pattern extended to CLAUDE.md: all persistent writes now use tmp+rename"
    - "Config fallback pattern: try config.load(targetDir) catch config.DEFAULTS for pre-install contexts"

key-files:
  created: []
  modified:
    - .claude/burrow/lib/installer.cjs
    - install.cjs
    - test/installer.test.cjs

key-decisions:
  - "atomicWriteFile used for CLAUDE.md writes — same tmp+rename crash safety as JSON persistence"
  - "install.cjs uses config.load(targetDir) with DEFAULTS fallback — supports per-project config after first install"

patterns-established:
  - "try/catch fallback: config.load(targetDir) falls back to config.DEFAULTS when config.json absent (fresh install case)"

requirements-completed: [SNP-03]

# Metrics
duration: 15min
completed: 2026-04-02
---

# Phase 15 Plan 02: Atomic Sentinel Writes and Per-Project Config Wiring Summary

**Atomic CLAUDE.md writes via tmp+rename crash safety, and install.cjs wired to per-project config.load(targetDir) replacing the CONFIG_DEFAULTS placeholder**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-02T18:00:00Z
- **Completed:** 2026-04-02T18:15:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Refactored `writeSentinelBlock()` to use `atomicWriteFile` from core.cjs — 3 `fs.writeFileSync` calls replaced
- Refactored `removeSentinelBlock()` to use `atomicWriteFile` from core.cjs — 2 `fs.writeFileSync` calls replaced
- Added `require('./core.cjs')` import to installer.cjs for `atomicWriteFile`
- Added tests proving `.bak` file is created with original content and `.tmp` is cleaned up after write
- Updated `install.cjs` to import full `config` module instead of just `CONFIG_DEFAULTS`
- All 3 `writeSentinelBlock` call sites in install.cjs now use `config.load(targetDir)` with `config.DEFAULTS` fallback
- No references to `CLAUDE_MD_SNIPPET` or `CONFIG_DEFAULTS` remain in install.cjs
- 378 tests pass, no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Atomic writeSentinelBlock and removeSentinelBlock** - `0e4897f` (feat)
2. **Task 2: Wire install.cjs to use generateSnippet(config.load)** - `e184115` (feat)

_Note: Task 1 followed TDD flow — new .bak and .tmp tests written first (RED), implementation added (GREEN)_

## Files Created/Modified
- `.claude/burrow/lib/installer.cjs` - Added `atomicWriteFile` import from core.cjs; replaced all `fs.writeFileSync` calls in `writeSentinelBlock` and `removeSentinelBlock` with `atomicWriteFile`
- `install.cjs` - Replaced `CONFIG_DEFAULTS` import with full `config` module; updated all 3 `writeSentinelBlock` call sites to use `config.load(targetDir)` with `config.DEFAULTS` fallback
- `test/installer.test.cjs` - Added 2 new tests: `.bak` file created on update, `.tmp` absent after successful write

## Decisions Made
- Atomic write pattern extended to CLAUDE.md using the same `atomicWriteFile` from core.cjs established in Plan 01
- `config.load(targetDir)` fallback to `config.DEFAULTS` handles fresh installs where `config.json` does not yet exist

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## Known Stubs
None — all data paths wired. Per-project config is now loaded via `config.load(targetDir)` at all 3 write sites.

## Self-Check: PASSED

- `.claude/burrow/lib/installer.cjs` — FOUND
- `install.cjs` — FOUND
- `test/installer.test.cjs` — FOUND
- Commit `0e4897f` — FOUND (feat: atomic writeSentinelBlock)
- Commit `e184115` — FOUND (feat: wire install.cjs to generateSnippet(config.load))
- No `CLAUDE_MD_SNIPPET` references: PASS
- No `fs.writeFileSync` in sentinel functions: PASS
- Full test suite (378 tests): PASS

---
*Phase: 15-claude-md-sentinel-variants*
*Completed: 2026-04-02*
