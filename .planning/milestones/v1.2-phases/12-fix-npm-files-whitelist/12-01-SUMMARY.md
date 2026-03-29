---
phase: 12-fix-npm-files-whitelist
plan: 01
subsystem: infra
tags: [npm, packaging, files-whitelist, create-burrow]

# Dependency graph
requires:
  - phase: 11-npm-package
    provides: package.json with files whitelist and create-burrow bin entry
provides:
  - ".claude/commands/burrow.md included in npm tarball so npx create-burrow does not crash on install"
affects: [npm-publish, create-burrow, installer]

# Tech tracking
tech-stack:
  added: []
  patterns: ["npm files whitelist must include all files referenced by installer at install time"]

key-files:
  created: []
  modified: [package.json]

key-decisions:
  - "Added .claude/commands/burrow.md as 4th entry in package.json files array — installer line 162 references this file as commandFile during every install"

patterns-established:
  - "Audit install.cjs labelMap when modifying package.json files whitelist to ensure all referenced paths are included"

requirements-completed: [NPM-02]

# Metrics
duration: 3min
completed: 2026-03-17
---

# Phase 12 Plan 01: Fix npm Files Whitelist Summary

**Added `.claude/commands/burrow.md` to package.json files whitelist, fixing ENOENT crash in `npx create-burrow` caused by the installer referencing a file excluded from the tarball.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-17T00:00:00Z
- **Completed:** 2026-03-17T00:03:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Identified the gap: install.cjs line 162 defines `commandFile: '.claude/commands/burrow.md'` but package.json files array only had 3 entries (missing burrow.md)
- Added `".claude/commands/burrow.md"` as 4th entry in the files array
- Verified with `npm pack --dry-run` — file appears in tarball output at 372B

## Task Commits

1. **Task 1: Add burrow.md to package.json files whitelist and verify tarball** - `d1d1244` (fix)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `package.json` - Added `.claude/commands/burrow.md` to files array (3 entries → 4 entries)

## Decisions Made
- No design decisions required — the fix was one line: add the missing file to the whitelist

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- npm tarball now includes all files that install.cjs references
- `npx create-burrow` will complete without ENOENT on the burrow.md copy step
- v1.2 milestone gap closure complete — ready for npm publish

---
*Phase: 12-fix-npm-files-whitelist*
*Completed: 2026-03-17*
