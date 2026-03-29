---
phase: 13-npm-first-update-system
verified: 2026-03-19T00:00:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 13: npm-First Update System Verification Report

**Phase Goal:** Replace the local-git-clone update system with an npm-first architecture — version checks fetch from npm registry, /burrow:update runs npx, no more .source-dir or writeBreadcrumbs
**Verified:** 2026-03-19
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                          | Status     | Evidence                                                                                       |
|----|-----------------------------------------------------------------------------------------------|------------|-----------------------------------------------------------------------------------------------|
| 1  | `checkForUpdate(cwd)` fetches latest version from npm registry, not from a local sourceDir    | VERIFIED   | version.cjs line 54: `https.get('https://registry.npmjs.org/create-burrow/latest', ...)`      |
| 2  | `checkForUpdate(cwd)` caches results for 24h so CLI calls do not spam the registry            | VERIFIED   | version.cjs lines 96-105: reads `.planning/burrow/.update-check`, skips if `< CACHE_TTL_MS`  |
| 3  | Running any burrow CLI command shows update notice at most once per 24h                        | VERIFIED   | burrow-tools.cjs line 45: `await version.checkForUpdate(process.cwd())` inside `writeAndExit` |
| 4  | `/burrow:update` runs `npx create-burrow --yes`, not a local installer path                   | VERIFIED   | update.md line 12: `npx create-burrow --yes`                                                  |
| 5  | `writeBreadcrumbs`, `.source-dir`, `getSourceVersion`, and `notifyIfOutdated` are all removed | VERIFIED   | Dead code grep across version.cjs, burrow-tools.cjs, install.cjs returned zero matches        |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact                                  | Expected                                       | Status   | Details                                                                                      |
|-------------------------------------------|------------------------------------------------|----------|----------------------------------------------------------------------------------------------|
| `.claude/burrow/lib/version.cjs`          | npm-registry-based `checkForUpdate(cwd)`       | VERIFIED | Exports: `getInstalledVersion`, `compareSemver`, `checkForUpdate`, `fetchLatestVersion`, `UPDATE_CACHE_FILE`. `getSourceVersion` absent. |
| `test/version.test.cjs`                   | Tests for new `checkForUpdate(cwd)` signature  | VERIFIED | 22 tests pass; 8 `checkForUpdate` tests cover cache-fresh, cache-stale, outdated, up-to-date, null-on-error. `fetchLatestVersion` tested. No `getSourceVersion` describe blocks. |
| `.claude/burrow/burrow-tools.cjs`         | Inline notification using `checkForUpdate(cwd)`| VERIFIED | `async function writeAndExit`, `await version.checkForUpdate(process.cwd())`, `main().catch(`. No `notifyIfOutdated`. |
| `.claude/commands/burrow/update.md`       | Slash command using `npx create-burrow --yes`  | VERIFIED | File confirmed: `npx create-burrow --yes`, no `.source-dir` or `install.cjs` references.    |
| `install.cjs`                             | Installer without `writeBreadcrumbs` or `.source-dir` | VERIFIED | Grep for `writeBreadcrumbs`, `.source-dir`, `getSourceVersion` in install.cjs — zero matches. |

### Key Link Verification

| From                              | To                                              | Via                           | Status   | Details                                                         |
|-----------------------------------|-------------------------------------------------|-------------------------------|----------|-----------------------------------------------------------------|
| `.claude/burrow/burrow-tools.cjs` | `.claude/burrow/lib/version.cjs`                | `require + checkForUpdate(cwd)` | WIRED  | Line 11: `const version = require('./lib/version.cjs')`. Line 45: `version.checkForUpdate(process.cwd())`. |
| `.claude/burrow/lib/version.cjs`  | `https://registry.npmjs.org/create-burrow/latest` | `node:https GET request`     | WIRED    | Line 5: `require('node:https')`. Line 54: `https.get('https://registry.npmjs.org/create-burrow/latest', ...)`. |

### Requirements Coverage

| Requirement | Source Plan | Description                                                          | Status    | Evidence                                                                                            |
|-------------|-------------|----------------------------------------------------------------------|-----------|-----------------------------------------------------------------------------------------------------|
| UPD-02      | 13-01-PLAN  | `/burrow:update` slash command runs update from within Claude Code   | SATISFIED | `update.md` runs `npx create-burrow --yes`                                                         |
| UPD-03      | 13-01-PLAN  | Version marker tracked in installed files with comparison logic      | SATISFIED | `getInstalledVersion(targetDir)` reads `VERSION` file; `compareSemver` compares installed vs latest |
| UPD-04      | 13-01-PLAN  | CLI shows passive one-line notification when outdated (cached 24h)   | SATISFIED | `writeAndExit` awaits `checkForUpdate`; stderr notice printed only when `result.outdated` is true   |

**Note on requirements table in REQUIREMENTS.md:** UPD-02/03/04 are mapped to Phase 10 in the coverage table and Phase 13 has no entry. The implementations satisfy all three requirements in their final npm-first form. The REQUIREMENTS.md coverage table was not updated to reflect Phase 13's ownership of the npm-first rewrite. This is a documentation gap only — it does not affect code correctness.

### Anti-Patterns Found

None. All modified files are clean:
- No TODO/FIXME/HACK/PLACEHOLDER comments
- No dead function stubs (`return null`, `return {}`)
- No dead code: `writeBreadcrumbs`, `.source-dir`, `getSourceVersion`, `notifyIfOutdated` — zero matches across all modified files

### Human Verification Required

None required. All behavioral contracts are verifiable programmatically:

- Registry fetch: confirmed via `registry.npmjs.org` literal in version.cjs and test mocks verifying the HTTP path
- 24h cache: confirmed via `CACHE_TTL_MS = 86400000` and test cases for fresh/stale cache
- Notification wiring: confirmed via `writeAndExit` awaiting `checkForUpdate` and printing to stderr when `result.outdated` is true

### Test Results

```
node --test test/version.test.cjs
# tests 22 / pass 22 / fail 0

node --test test/cli.test.cjs
# tests 43 / pass 43 / fail 0
```

### Commits Verified

| Commit  | Task   | Files Changed                              |
|---------|--------|--------------------------------------------|
| 84df33e | Task 1 | version.cjs, version.test.cjs              |
| 28124a9 | Task 2 | burrow-tools.cjs, update.md, install.cjs   |

### Gaps Summary

No gaps. All 5 truths verified, all 5 artifacts substantive and wired, both key links active, all 3 requirement IDs satisfied, tests pass (65 total), zero anti-patterns.

---

_Verified: 2026-03-19_
_Verifier: Claude (gsd-verifier)_
