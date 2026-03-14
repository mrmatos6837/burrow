---
phase: 10-version-tracking-update-command
plan: 01
subsystem: infra
tags: [version, semver, update-check, cache, cli]

# Dependency graph
requires:
  - phase: 09-installer-rewrite
    provides: installer engine (detect, install, upgrade, repair) that copies VERSION file to target
provides:
  - VERSION file at .claude/burrow/VERSION as single source of truth for burrow version
  - version.cjs module with getSourceVersion, getInstalledVersion, compareSemver, checkForUpdate
  - 24h-cached update check that never crashes the CLI
  - Passive stderr notification in burrow-tools.cjs when outdated cache detected
affects: [11-npm, installer-cli, future update command]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Version single source of truth: VERSION file (not package.json) is authoritative"
    - "Cache-based update detection: .planning/burrow/.update-check avoids per-invocation fs reads"
    - "Error-swallowing wrapper: all version check code in try/catch to never crash CLI"
    - "stderr for metadata: update notices go to stderr so stdout command output is clean for agents"

key-files:
  created:
    - .claude/burrow/VERSION
    - .claude/burrow/lib/version.cjs
    - test/version.test.cjs
  modified:
    - .claude/burrow/burrow-tools.cjs

key-decisions:
  - "Cache-only notification: burrow-tools.cjs reads existing cache, never initiates a check itself"
  - "Installer seeds cache: after install/upgrade the installer writes the cache with both versions"
  - "null semver == 0.0.0: missing VERSION treated as always behind so outdated notice shows"
  - "Update notice on stderr only: stdout stays clean for agent-parseable command output"
  - "notifyIfOutdated called from writeAndExit: one injection point covers all success paths"

patterns-established:
  - "Version file pattern: plain text VERSION file alongside source files, trimmed on read"
  - "Cached side-effect pattern: non-critical checks (version, telemetry) use a staleness cache"

requirements-completed: [UPD-03, UPD-04]

# Metrics
duration: 12min
completed: 2026-03-14
---

# Phase 10 Plan 01: Version Tracking and Update Notification Summary

**VERSION file + version.cjs module with 24h-cached semver comparison and passive stderr notification in burrow-tools.cjs**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-14T23:11:28Z
- **Completed:** 2026-03-14T23:23:27Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created `.claude/burrow/VERSION` with `1.2.0` as the single source of truth for burrow version
- Implemented `version.cjs` with `getSourceVersion`, `getInstalledVersion`, `compareSemver`, `checkForUpdate`, and `UPDATE_CACHE_FILE`
- `checkForUpdate` uses a 24h cache at `.planning/burrow/.update-check` — returns null when cache is fresh
- Added `notifyIfOutdated(cwd)` to `burrow-tools.cjs` that reads the cache and prints a one-line stderr notice when `installedVersion < sourceVersion`
- 20 tests covering all functions, null handling, cache freshness, and stale cache re-checking

## Task Commits

Each task was committed atomically:

1. **Task 1: VERSION file and version.cjs module with comparison and cached update check** - `9bad86d` (feat)
2. **Task 2: Hook passive update notification into burrow-tools.cjs CLI** - `8de5772` (feat)

**Plan metadata:** (pending)

_Note: Task 1 followed TDD pattern (RED: failing tests first, GREEN: implementation)_

## Files Created/Modified
- `.claude/burrow/VERSION` - Single source of truth for burrow version (`1.2.0`)
- `.claude/burrow/lib/version.cjs` - Version reading, comparison, and 24h-cached update check logic
- `test/version.test.cjs` - 20 tests for all exported functions and edge cases
- `.claude/burrow/burrow-tools.cjs` - Added `fs` import, `version.cjs` import, `notifyIfOutdated()`, and hook in `writeAndExit`

## Decisions Made
- **Cache-only notification in CLI:** `burrow-tools.cjs` reads the pre-existing cache file instead of calling `checkForUpdate` with sourceDir (which isn't available in an installed copy). The installer is responsible for seeding the cache with both versions after install/upgrade.
- **null semver treated as 0.0.0:** Missing VERSION file means "always behind" — this ensures the notice shows when an old install predates version tracking.
- **stderr for notices:** Update notices go to stderr so agent-parseable stdout output (card tree renders) is never polluted.
- **notifyIfOutdated injected at writeAndExit:** Single injection point covers all successful command exits without modifying each case in the switch.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Version tracking foundation is complete; the installer (install.cjs) needs to seed the cache after install/upgrade so `notifyIfOutdated` has data to work with
- Phase 11 (npm packaging) can use VERSION as the canonical version source

---
*Phase: 10-version-tracking-update-command*
*Completed: 2026-03-14*
