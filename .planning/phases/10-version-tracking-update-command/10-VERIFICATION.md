---
phase: 10-version-tracking-update-command
verified: 2026-03-15T00:00:00Z
status: passed
score: 8/8 must-haves verified
re_verification: false
---

# Phase 10: Version Tracking and Update Command — Verification Report

**Phase Goal:** Version tracking and update command — VERSION file as source of truth, version comparison module, passive update notifications, /burrow:update command, install.cjs cache writing
**Verified:** 2026-03-15
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Installed burrow files contain a version marker that can be read programmatically | VERIFIED | `.claude/burrow/VERSION` exists containing `1.2.0`; `getSourceVersion`/`getInstalledVersion` read it via `fs.readFileSync` |
| 2 | Comparing installed version against source version correctly reports outdated/current/ahead | VERIFIED | `compareSemver` handles all cases including null; 8 compareSemver tests pass; `checkForUpdate` returns `{ outdated, sourceVersion, installedVersion }` |
| 3 | Running any burrow CLI command when outdated prints a one-line notice to stderr | VERIFIED | `notifyIfOutdated(cwd)` called from `writeAndExit` (line 66 of burrow-tools.cjs) — covers all successful command exits; writes to `process.stderr` |
| 4 | The outdated notice appears at most once per 24 hours (cached) | VERIFIED | `checkForUpdate` returns null when `Date.now() - Date.parse(lastCheck) < 86400000`; `notifyIfOutdated` reads the same cache; test "returns null when cache is fresh (< 24h)" passes |
| 5 | Running burrow CLI when current shows no update notice | VERIFIED | `notifyIfOutdated` only writes to stderr when `compareSemver(cache.installedVersion, cache.sourceVersion) < 0` — equal or ahead versions produce no output |
| 6 | Running /burrow:update from within Claude Code triggers the installer in upgrade mode | VERIFIED | `.claude/commands/burrow/update.md` exists, instructs Claude to read `.claude/burrow/.source-dir` then run `node <sourceDir>/install.cjs --yes` |
| 7 | The update command preserves cards.json (delegates to existing installer upgrade logic) | VERIFIED | Slash command delegates to `install.cjs --yes` which calls `performUpgrade` — upgrade mode is documented to preserve cards.json (confirmed by install-cli test "preserves cards.json content on upgrade") |
| 8 | After update, the version cache is refreshed so the CLI shows the correct status | VERIFIED | `writeBreadcrumbs` called after `performInstall` (line 263) and `performUpgrade` (line 316) in install.cjs; writes `.planning/burrow/.update-check` with fresh `lastCheck`, `sourceVersion`, `installedVersion` |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.claude/burrow/VERSION` | Single source of truth for burrow version; contains `1.2.0` | VERIFIED | File exists, content is `1.2.0\n` |
| `.claude/burrow/lib/version.cjs` | Exports `getSourceVersion`, `getInstalledVersion`, `compareSemver`, `checkForUpdate`, `UPDATE_CACHE_FILE` | VERIFIED | 123 lines; all 5 exports confirmed at module.exports (line 116) |
| `test/version.test.cjs` | Tests for version comparison and cache behavior; min 40 lines | VERIFIED | 224 lines; 20 tests across 4 describe blocks — all pass |
| `.claude/commands/burrow/update.md` | Slash command exposing /burrow:update; min 10 lines | VERIFIED | 23 lines; instructs Claude to read `.source-dir` and run `install.cjs --yes` |
| `install.cjs` | Updated installer that writes version cache after install/upgrade; contains "update-check" | VERIFIED | `writeBreadcrumbs` writes `.planning/burrow/.update-check`; called at lines 263 (install) and 316 (upgrade), NOT after repair |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `.claude/burrow/burrow-tools.cjs` | `.claude/burrow/lib/version.cjs` | `require + checkForUpdate()` call | VERIFIED | Line 13: `const version = require('./lib/version.cjs')`; line 37: `version.UPDATE_CACHE_FILE`; line 41: `version.compareSemver`; line 66: `notifyIfOutdated` called from `writeAndExit` |
| `.claude/burrow/lib/version.cjs` | `.claude/burrow/VERSION` | `fs.readFileSync` to read version string | VERIFIED | Lines 19, 33: `path.join(sourceDir/targetDir, '.claude', 'burrow', 'VERSION')` passed to `fs.readFileSync` |
| `.claude/commands/burrow/update.md` | `install.cjs` | Instructs Claude to run `node install.cjs --yes` | VERIFIED | Command body: `node <sourceDir>/install.cjs --yes`; example shows `node /home/user/burrow/install.cjs --yes` |
| `install.cjs` | `.planning/burrow/.update-check` | Writes cache after successful install/upgrade | VERIFIED | `writeBreadcrumbs` function writes to `path.join(targetDir, '.planning', 'burrow', '.update-check')` at lines 52-65; called at lines 263 and 316 |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| UPD-02 | 10-02-PLAN.md | `/burrow:update` slash command runs update from within Claude Code session | SATISFIED | `.claude/commands/burrow/update.md` exists and instructs Claude to run `install.cjs --yes` |
| UPD-03 | 10-01-PLAN.md | Version marker tracked in installed files with comparison logic | SATISFIED | `VERSION` file exists; `version.cjs` exports full comparison API; 20 passing tests |
| UPD-04 | 10-01-PLAN.md | CLI shows passive one-line notification when outdated (cached 24h check) | SATISFIED | `notifyIfOutdated` in `burrow-tools.cjs` reads cache and prints to stderr when `installedVersion < sourceVersion`; cache TTL is 86400000ms (24h) |

**No orphaned requirements.** All three IDs declared in plan frontmatter match REQUIREMENTS.md entries and have implementation evidence.

### Anti-Patterns Found

None. No TODO/FIXME/HACK/placeholder comments or empty implementations found across the 4 modified files.

### Human Verification Required

#### 1. End-to-end passive notification display

**Test:** Install burrow into a temp project, manually write a `.planning/burrow/.update-check` file with `installedVersion: "1.1.0"` and `sourceVersion: "1.2.0"`, then run `node .claude/burrow/burrow-tools.cjs read 2>&1`. Verify the update notice appears on stderr.
**Expected:** Output includes `Update available: 1.1.0 -> 1.2.0  Run /burrow:update`
**Why human:** Requires a real installed project context to test the full path from cache file through `writeAndExit` to stderr output.

#### 2. /burrow:update slash command invocation in Claude Code

**Test:** In a Claude Code session with burrow installed, type `/burrow:update`.
**Expected:** Claude reads `.claude/burrow/.source-dir`, runs `node <path>/install.cjs --yes`, reports upgrade result.
**Why human:** Slash command behavior requires Claude Code's command execution environment.

### Gaps Summary

No gaps. All 8 observable truths verified, all 5 artifacts pass all three levels (exists, substantive, wired), all 4 key links wired, all 3 requirement IDs satisfied, all commits exist in git history, 32 tests pass (20 version + 12 install-cli), no anti-patterns found.

---

_Verified: 2026-03-15_
_Verifier: Claude (gsd-verifier)_
