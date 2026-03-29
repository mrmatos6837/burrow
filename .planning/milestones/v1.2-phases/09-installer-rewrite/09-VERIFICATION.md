---
phase: 09-installer-rewrite
verified: 2026-03-15T00:00:00Z
status: passed
score: 16/16 must-haves verified
re_verification: false
---

# Phase 9: Installer Rewrite Verification Report

**Phase Goal:** Rewrite monolithic install.cjs into engine + CLI layers with proper detection, upgrade-with-preservation, and sentinel-based CLAUDE.md management.
**Verified:** 2026-03-15
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

Plan 01 truths (INST-02, INST-04, UPD-01):

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Detection correctly identifies fresh install (no burrow files exist) | VERIFIED | `detect()` returns `mode: 'fresh'`; test passes (test 1 in detect() suite) |
| 2 | Detection correctly identifies upgrade (all core files present) | VERIFIED | `detect()` returns `mode: 'upgrade'`; test passes (test 2 in detect() suite) |
| 3 | Detection correctly identifies repair (some core files missing) | VERIFIED | `detect()` returns `mode: 'repair'` with `missing` array; tests 4-5 pass |
| 4 | CLAUDE.md sentinel block is inserted between `<!-- burrow:start -->` and `<!-- burrow:end -->` markers | VERIFIED | `writeSentinelBlock()` inserts markers; 6 tests pass; CLI test confirms sentinel present after `--yes` install |
| 5 | On upgrade, sentinel block content is replaced but surrounding CLAUDE.md content is untouched | VERIFIED | `writeSentinelBlock()` replaces inner content only; test "replaces existing sentinel block content on re-run" passes |
| 6 | On upgrade, cards.json is never modified or deleted | VERIFIED | `performUpgrade()` hardcodes `results.cardsJson = 'preserved'`; never touches the file; 3 tests confirm |
| 7 | Source files are unconditionally replaced on upgrade | VERIFIED | `performUpgrade()` calls `copyDirSync` without existence checks; test "replaces .claude/burrow/ source files" passes |

Plan 02 truths (INST-01, INST-03, INST-05):

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 8 | Running install.cjs with no flags presents readline prompts for install path and CLAUDE.md opt-in | VERIFIED | `createInterface()` called when `!flags.yes`; `ask()` wrapper calls `rl.question()`; fresh flow prompts for path and CLAUDE.md opt-in |
| 9 | Running install.cjs --yes completes with zero prompts using all defaults | VERIFIED | CLI test "creates all expected files without prompts" passes (exit 0, all files created) |
| 10 | Running install.cjs --uninstall removes all burrow files and sentinel CLAUDE.md block | VERIFIED | CLI test "removes all Burrow files after install" passes; `removeSentinelBlock()` called in uninstall flow |
| 11 | Running install.cjs --uninstall requires confirmation (default NO) before proceeding | VERIFIED | `ask('Proceed with uninstall? [y/N] ', 'n')` — default is 'n'; requires explicit 'y' |
| 12 | Running install.cjs --uninstall --yes skips confirmation | VERIFIED | `if (!yes)` guards the `ask()` call; `--yes` flag bypasses it entirely |
| 13 | Post-install message shows getting-started instructions | VERIFIED | `printGettingStarted()` called at end of `runInstall()`; shows 4-step getting started guide |
| 14 | On upgrade detection, shows version info and asks confirmation before proceeding | VERIFIED | `runUpgrade()` prints "Detected existing Burrow installation", version string, then `ask('Proceed with upgrade? [Y/n] ')` |
| 15 | On repair detection, shows what's missing and asks confirmation before proceeding | VERIFIED | `runRepair()` prints count + list of missing files, then `ask('Proceed with repair? [Y/n] ')` |
| 16 | Uninstall cleans up empty parent directories after file removal | VERIFIED | `removeIfEmpty()` called on `.claude/commands/`, `.claude/`, `.planning/`; CLI test "cleans up empty parent directories" passes |

**Score:** 16/16 truths verified

---

### Required Artifacts

| Artifact | Min Lines | Actual Lines | Status | Details |
|----------|-----------|--------------|--------|---------|
| `.claude/burrow/lib/installer.cjs` | — | 389 | VERIFIED | Exports: `detect`, `performInstall`, `performUpgrade`, `performRepair`, `writeSentinelBlock`, `removeSentinelBlock`, `SENTINEL_START`, `SENTINEL_END`, `CLAUDE_MD_SNIPPET` |
| `test/installer.test.cjs` | 100 | 429 | VERIFIED | 34 tests, 7 describe blocks, all passing |
| `install.cjs` | 150 | 430 | VERIFIED | Full CLI rewrite with readline, `--yes`, `--uninstall`, `--help`, all mode flows |
| `test/install-cli.test.cjs` | 50 | 206 | VERIFIED | 12 integration tests, 4 describe blocks, all passing |

---

### Key Link Verification

| From | To | Via | Pattern | Status |
|------|----|-----|---------|--------|
| `.claude/burrow/lib/installer.cjs` | `fs, path (Node built-ins)` | `require('node:fs')` | `require\('node:fs'\)` | WIRED — line 3 |
| `install.cjs` | `.claude/burrow/lib/installer.cjs` | `require('./...')` | `require.*installer` | WIRED — line 16: `require('./.claude/burrow/lib/installer.cjs')` |
| `install.cjs` | `node:readline` | `readline.createInterface` | `readline\.createInterface` | WIRED — line 30 |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| INST-01 | 09-02 | User can run guided interactive install with readline prompts | SATISFIED | `createInterface()` + `ask()` wrapper with readline; fresh flow prompts for path and CLAUDE.md opt-in |
| INST-02 | 09-01 | Installer detects existing installation and runs upgrade vs fresh install | SATISFIED | `detect()` returns `mode: 'fresh'|'upgrade'|'repair'`; `main()` branches on mode |
| INST-03 | 09-02 | User can run non-interactive install with `--yes` flag | SATISFIED | `parseArgs()` sets `flags.yes`; all `ask()` calls guarded by `if (!yes)` |
| INST-04 | 09-01 | Installer explains CLAUDE.md instructions and prompts opt-in; appends sentinel block | SATISFIED | `ask()` for CLAUDE.md opt-in in `runInstall()`; `writeSentinelBlock()` writes sentinel-wrapped `CLAUDE_MD_SNIPPET` |
| INST-05 | 09-02 | Uninstall removes all burrow files and only sentinel-marked CLAUDE.md section | SATISFIED | `runUninstall()` removes dirs/files then calls `removeSentinelBlock()`; preserves other CLAUDE.md content (CLI test confirms) |
| UPD-01 | 09-01 | Re-running installer on existing install replaces source code, preserves `cards.json` | SATISFIED | `performUpgrade()` never touches `.planning/burrow/cards.json`; CLI test "preserves cards.json content on upgrade" passes |

All 6 phase-09 requirements satisfied. No orphaned requirements — REQUIREMENTS.md traceability table maps exactly INST-01 through INST-05 and UPD-01 to Phase 9.

---

### Anti-Patterns Found

None. Scanned all 4 phase artifacts for TODO/FIXME, empty implementations, and placeholder returns. The word "placeholder" appears 5 times in `test/installer.test.cjs` — all are test fixture file content (`fs.writeFileSync(p1, 'placeholder')`), not implementation stubs.

---

### Human Verification Required

Two behaviors are correct in code but cannot be verified programmatically:

**1. Interactive readline prompts render correctly in a real terminal**

- **Test:** Run `node install.cjs` (no flags) in a fresh directory and interact with the prompts
- **Expected:** Prompt for install directory displays correctly with default shown in brackets; CLAUDE.md opt-in prompt appears; answers are accepted; install proceeds
- **Why human:** `execSync` tests only exercise `--yes` (non-interactive) mode; actual readline TTY rendering cannot be exercised in subprocess tests

**2. Post-install "getting started" message is clear to a new user**

- **Test:** Run `node install.cjs --yes /tmp/test-burrow` and read the output
- **Expected:** The getting-started message explains how to open the card manager, add a card, list cards, and mentions CLAUDE.md was updated
- **Why human:** Content quality and clarity judgment is subjective and cannot be verified programmatically

---

## Test Results

```
node --test test/installer.test.cjs
# tests 34  pass 34  fail 0

node --test test/install-cli.test.cjs
# tests 12  pass 12  fail 0
```

Both test suites pass with zero failures.

---

## Summary

Phase 9 goal is fully achieved. The monolithic `install.cjs` has been split into:

- **Engine layer** (`.claude/burrow/lib/installer.cjs`): pure functions with no readline dependency, 100% testable in isolation. All detection, file operations, and sentinel management live here.
- **CLI layer** (`install.cjs`): wires engine to readline, `--yes`, `--uninstall`, mode-specific flows, and output helpers.

All 6 phase requirements (INST-01 through INST-05, UPD-01) are satisfied with automated test coverage. The data preservation guarantee (UPD-01) is verified end-to-end by a CLI integration test that writes custom content to `cards.json`, runs upgrade, and confirms the content is unchanged.

---

_Verified: 2026-03-15_
_Verifier: Claude (gsd-verifier)_
