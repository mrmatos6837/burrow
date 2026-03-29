---
phase: 10-version-tracking-update-command
plan: 02
subsystem: installer
tags: [version, update, slash-command, installer, cache]

# Dependency graph
requires:
  - phase: 09-installer-rewrite
    provides: install.cjs CLI with performInstall/performUpgrade functions
  - phase: 10-version-tracking-update-command/01
    provides: version.cjs module with getSourceVersion, getInstalledVersion, UPDATE_CACHE_FILE
provides:
  - /burrow:update slash command that triggers upgrade from within Claude Code
  - install.cjs writes .source-dir breadcrumb after install/upgrade
  - install.cjs writes .update-check version cache after install/upgrade
affects: [end-users, slash-commands, passive-notifications]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Breadcrumb file pattern: local-only files (.source-dir, .update-check) written by installer for use by CLI and slash commands
    - Non-fatal cache writes: all breadcrumb writes wrapped in try/catch so installer never fails due to cache I/O

key-files:
  created:
    - .claude/commands/burrow/update.md
  modified:
    - install.cjs

key-decisions:
  - "/burrow:update reads .claude/burrow/.source-dir to find installer path — no hardcoded paths"
  - "Breadcrumb writes (writeBreadcrumbs) happen after install and upgrade but NOT after repair — repair doesn't change versions"
  - "Both .source-dir and .update-check are wrapped independently in try/catch so one failure doesn't prevent the other"

patterns-established:
  - "Local-only breadcrumb files: .source-dir and .update-check live in the installed project, gitignored, written by installer"
  - "Slash command .source-dir lookup: read file first, ask user only if missing"

requirements-completed: [UPD-02]

# Metrics
duration: 8min
completed: 2026-03-14
---

# Phase 10 Plan 02: Update Command and Version Cache Summary

**`/burrow:update` slash command plus installer breadcrumb writing — source-dir and version cache seeded after every install/upgrade**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-14T23:21:52Z
- **Completed:** 2026-03-14T23:29:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created `.claude/commands/burrow/update.md` — Claude Code users can type `/burrow:update` to trigger an upgrade without leaving the conversation
- Updated install.cjs to write `.claude/burrow/.source-dir` (absolute path to burrow repo) after install/upgrade, enabling the slash command to locate the installer automatically
- Updated install.cjs to write `.planning/burrow/.update-check` (version cache JSON) after install/upgrade, seeding the passive notification system from Plan 01

## Task Commits

Each task was committed atomically:

1. **Task 1: Create /burrow:update slash command** - `febace4` (feat)
2. **Task 2: Update install.cjs to write version cache and source-dir breadcrumb** - `2375a99` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `.claude/commands/burrow/update.md` - Slash command: reads .source-dir, runs installer in --yes mode
- `install.cjs` - Added writeBreadcrumbs() helper, called after performInstall and performUpgrade

## Decisions Made
- Slash command reads `.claude/burrow/.source-dir` first, asks user only if missing — no hardcoded paths
- `writeBreadcrumbs()` writes two files independently (separate try/catch each) so one failure doesn't block the other
- Breadcrumbs NOT written after repair (only after install/upgrade) since repair doesn't change versions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Plan 10-01 artifacts (version.cjs) were already present**
- **Found during:** Task 2 setup
- **Issue:** version.cjs was listed as a dependency from Plan 01 but Plan 01 had not been formally executed. On inspection, the file already existed in .claude/burrow/lib/ (written in a prior session) — no remediation needed.
- **Fix:** Confirmed file existed with correct exports before proceeding. No code changes required.
- **Files modified:** None
- **Verification:** import of getSourceVersion/getInstalledVersion succeeded at runtime

---

**Total deviations:** 1 discovered, 0 code changes needed
**Impact on plan:** No scope change — existing file covered the dependency.

## Issues Encountered
None beyond the Plan 01 dependency check above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 10 is complete: version tracking (Plan 01) and update command (Plan 02) are both done
- Phase 11 (npm packaging) can proceed — it does not depend on Phase 10
- Users running `/burrow:update` will have their .source-dir populated after first install via the updated installer

## Self-Check: PASSED

All required files exist and commits are verified.

---
*Phase: 10-version-tracking-update-command*
*Completed: 2026-03-14*
