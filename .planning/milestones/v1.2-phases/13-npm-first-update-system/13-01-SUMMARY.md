---
phase: 13-npm-first-update-system
plan: 01
subsystem: update-system
tags: [version-check, npm-registry, async, cleanup]
dependency_graph:
  requires: []
  provides: [npm-registry-based checkForUpdate, async CLI notification, npx-based update command]
  affects: [.claude/burrow/lib/version.cjs, .claude/burrow/burrow-tools.cjs, .claude/commands/burrow/update.md, install.cjs]
tech_stack:
  added: [node:https (built-in)]
  patterns: [async/await in CLI, https.get for npm registry fetch, 24h cache via .planning/burrow/.update-check]
key_files:
  created: []
  modified:
    - .claude/burrow/lib/version.cjs
    - test/version.test.cjs
    - .claude/burrow/burrow-tools.cjs
    - .claude/commands/burrow/update.md
    - install.cjs
decisions:
  - checkForUpdate now async and takes single arg (cwd) instead of (sourceDir, targetDir)
  - fetchLatestVersion uses node:https built-in — zero external dependencies maintained
  - Tests mock https.get to avoid network dependency in CI/offline environments
  - writeAndExit made async; main() made async with promise-based error handling
  - writeBreadcrumbs removed entirely — npm-based flow needs no .source-dir breadcrumb
metrics:
  duration_minutes: 5
  completed_date: "2026-03-19"
  tasks_completed: 2
  files_modified: 5
---

# Phase 13 Plan 01: npm-First Update System Summary

npm-registry-based `checkForUpdate(cwd)` replaces local git-clone version comparison, `/burrow:update` runs `npx create-burrow --yes`, and all local-clone artifacts (`writeBreadcrumbs`, `.source-dir`, `getSourceVersion`, `notifyIfOutdated`) are removed.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Rewrite version.cjs for npm registry fetch and update tests | 84df33e | version.cjs, version.test.cjs |
| 2 | Wire new checkForUpdate into CLI, update /burrow:update to npx, remove writeBreadcrumbs | 28124a9 | burrow-tools.cjs, update.md, install.cjs |

## What Was Built

**version.cjs** — Fully rewritten for npm-first architecture:
- `getSourceVersion` removed (no more local sourceDir concept)
- `fetchLatestVersion()` added: makes HTTPS GET to `registry.npmjs.org/create-burrow/latest`, returns version string or null on error, uses `node:https` built-in
- `checkForUpdate(cwd)` rewritten: now async, single-arg signature, fetches from npm instead of comparing against local git clone

**burrow-tools.cjs** — CLI updated for async notification:
- `notifyIfOutdated()` removed
- `writeAndExit()` made async: awaits `version.checkForUpdate(process.cwd())`
- `main()` made async; replaced `try { main() }` pattern with `main().catch()`
- Removed unused `fs` and `path` imports

**update.md** — Updated `/burrow:update` slash command to run `npx create-burrow --yes` instead of reading `.source-dir` breadcrumb

**install.cjs** — Cleaned up:
- `writeBreadcrumbs()` function removed entirely
- `getSourceVersion`/`getInstalledVersion` import removed
- Two `writeBreadcrumbs(sourceDir, targetDir)` call sites removed from `runInstall` and `runUpgrade`

## Tests

22 version tests pass (mocked network calls for CI compatibility). 43 CLI tests pass unchanged.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test suite adapted for offline environment**
- **Found during:** Task 1 (GREEN phase)
- **Issue:** Plan specified real network calls to npm registry in tests. Test environment has no internet access — `fetchLatestVersion()` was correctly returning null, causing all network-dependent test assertions to fail.
- **Fix:** Replaced real network calls in tests with `https.get` mocking pattern. Tests inject fake HTTP responses to simulate npm registry replies without requiring network access. Tests now work in CI and offline environments.
- **Files modified:** test/version.test.cjs
- **Commit:** 84df33e

## Self-Check: PASSED

Files verified to exist:
- .claude/burrow/lib/version.cjs — FOUND
- test/version.test.cjs — FOUND
- .claude/burrow/burrow-tools.cjs — FOUND
- .claude/commands/burrow/update.md — FOUND
- install.cjs — FOUND

Commits verified:
- 84df33e — FOUND
- 28124a9 — FOUND
