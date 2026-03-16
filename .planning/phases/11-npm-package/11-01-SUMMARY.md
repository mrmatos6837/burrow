---
phase: 11-npm-package
plan: 01
subsystem: infra
tags: [npm, package-json, create-burrow, cli, npx]

# Dependency graph
requires:
  - phase: 09-installer-rewrite
    provides: install.cjs installer entry point
provides:
  - package.json with name=create-burrow, bin pointing to install.cjs, files whitelist
  - Updated --help text using npx create-burrow in all examples
  - npm-publishable package with only source files, commands, and installer
affects: [publishing, npm, distribution]

# Tech tracking
tech-stack:
  added: [npm package manifest (package.json)]
  patterns: [files whitelist for npm publish control, bin field for npx entry point]

key-files:
  created: [package.json]
  modified: [install.cjs]

key-decisions:
  - "README.md auto-included by npm even though not in files whitelist — acceptable and standard npm practice"
  - "files whitelist of exactly 3 entries: install.cjs, .claude/burrow/, .claude/commands/burrow/"
  - "npm package name is create-burrow so users can run npx create-burrow"

patterns-established:
  - "files whitelist pattern: explicitly list only necessary source directories and entry point"

requirements-completed: [NPM-01, NPM-02, NPM-03]

# Metrics
duration: 8min
completed: 2026-03-16
---

# Phase 11 Plan 01: npm Package Manifest Summary

**npm package.json with create-burrow bin entry and files whitelist, plus updated --help text referencing npx create-burrow instead of node install.cjs**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-16T19:16:18Z
- **Completed:** 2026-03-16T19:24:00Z
- **Tasks:** 2
- **Files modified:** 2 (package.json created, install.cjs updated)

## Accomplishments
- Created package.json with name=create-burrow, version=1.2.0, bin pointing to install.cjs
- Files whitelist of 3 entries ensures only source code ships (no test/, .planning/, .claude/get-shit-done/, agents, etc.)
- Updated printUsage() in install.cjs to use npx create-burrow in all 5 example lines
- Verified npm pack --dry-run output: 24 files, all expected source + commands + installer (README.md auto-included by npm)
- Confirmed all 306 existing tests pass unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Create package.json and update --help text** - `519d900` (feat)
2. **Task 2: Verify npm pack contents match whitelist** - verification-only task, no file changes

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `/Users/mrmatos6837/Projects/personal/burrow/package.json` - npm package manifest with name, bin, files whitelist, keywords, engines
- `/Users/mrmatos6837/Projects/personal/burrow/install.cjs` - Updated printUsage() to show npx create-burrow examples

## Decisions Made
- README.md is auto-included by npm regardless of files whitelist — this is acceptable and standard npm practice. The plan explicitly anticipated this.
- files whitelist has exactly 3 entries as specified: install.cjs, .claude/burrow/, .claude/commands/burrow/
- package.json and LICENSE are always included by npm regardless of whitelist (npm behavior)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. To publish:
```
npm publish
```

## Next Phase Readiness
- Package is ready to publish to npm as create-burrow@1.2.0
- Users can run `npx create-burrow` once published
- All v1.2 phases complete

## Self-Check: PASSED

- FOUND: /Users/mrmatos6837/Projects/personal/burrow/package.json
- FOUND: /Users/mrmatos6837/Projects/personal/burrow/install.cjs
- FOUND: /Users/mrmatos6837/Projects/personal/burrow/.planning/phases/11-npm-package/11-01-SUMMARY.md
- FOUND: commit 519d900

---
*Phase: 11-npm-package*
*Completed: 2026-03-16*
