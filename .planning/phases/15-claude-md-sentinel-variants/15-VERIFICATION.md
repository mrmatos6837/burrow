---
phase: 15-claude-md-sentinel-variants
verified: 2026-04-02T19:00:00Z
status: passed
score: 11/11 must-haves verified
re_verification: false
---

# Phase 15: CLAUDE.md Sentinel Variants Verification Report

**Phase Goal:** Replace hardcoded CLAUDE.md snippet with config-driven generateSnippet(); add atomic file writes for crash safety; support 4 load modes (full/index/none/auto) and configurable trigger words.
**Verified:** 2026-04-02T19:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | generateSnippet({loadMode:'full',...}) returns snippet with 'read `.planning/burrow/cards.json`' instruction | VERIFIED | installer.cjs line 31: literal string confirmed; behavioral spot-check passed |
| 2  | generateSnippet({loadMode:'index',...}) returns snippet with 'burrow index' instruction | VERIFIED | installer.cjs line 34: includes `burrow-tools.cjs index --json`; spot-check passed |
| 3  | generateSnippet({loadMode:'none',...}) returns snippet with 'skip' or 'on demand' instruction | VERIFIED | installer.cjs line 37: "on demand" confirmed; spot-check passed |
| 4  | generateSnippet({loadMode:'auto',...}) returns snippet with auto-threshold instruction | VERIFIED | installer.cjs line 41: "threshold" confirmed; spot-check passed |
| 5  | Trigger words from config appear in the snippet's trigger section | VERIFIED | installer.cjs line 52: words mapped to quoted list via triggerWords array |
| 6  | triggerPreset='none' causes trigger section to be omitted from snippet | VERIFIED | installer.cjs line 48: shouldIncludeTriggers false when triggerPreset='none'; spot-check passed |
| 7  | atomicWriteFile() writes content via tmp+rename pattern | VERIFIED | core.cjs lines 51-59: backup .bak, write .tmp, fs.renameSync; exported at line 61 |
| 8  | writeSentinelBlock() writes CLAUDE.md via tmp+rename | VERIFIED | installer.cjs: all 3 write paths use atomicWriteFile (lines 225, 229, 235); no fs.writeFileSync in sentinel functions |
| 9  | removeSentinelBlock() writes CLAUDE.md via tmp+rename | VERIFIED | installer.cjs: both write paths use atomicWriteFile (lines 259, 270); no fs.writeFileSync |
| 10 | install.cjs calls generateSnippet(config) instead of using CLAUDE_MD_SNIPPET constant | VERIFIED | install.cjs line 9 imports generateSnippet; 3 call sites (lines 227, 284, 294) confirmed; CLAUDE_MD_SNIPPET: 0 matches |
| 11 | After loadMode change, running install produces a sentinel block matching the new mode | VERIFIED | install.cjs uses config.load(targetDir) with DEFAULTS fallback at all 3 call sites; config.load() applies preset derivation |

**Score:** 11/11 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.claude/burrow/lib/core.cjs` | atomicWriteFile() function | VERIFIED | Function defined at line 51, exported at line 61; tmp+rename pattern identical to atomicWriteJSON |
| `.claude/burrow/lib/config.cjs` | triggerWords and triggerPreset in CONFIG_SCHEMA | VERIFIED | triggerPreset (line 32-35), triggerWords (line 36-40) present in CONFIG_SCHEMA; TRIGGER_PRESETS constant at line 9; preset derivation in load() at lines 68-70 |
| `.claude/burrow/lib/installer.cjs` | generateSnippet() function replacing CLAUDE_MD_SNIPPET | VERIFIED | Function defined lines 21-59; exported at line 416; CLAUDE_MD_SNIPPET: 0 matches in file |
| `install.cjs` | Install/upgrade/repair flows using generateSnippet(config) | VERIFIED | generateSnippet imported line 9; config module imported line 18; 3 writeSentinelBlock call sites all use generateSnippet(cfg) |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `.claude/burrow/lib/installer.cjs` | `.claude/burrow/lib/config.cjs` | generateSnippet reads config.triggerPreset and config.triggerWords | WIRED | installer.cjs line 22: `const { loadMode, triggerPreset, triggerWords } = config` |
| `.claude/burrow/lib/installer.cjs` | `.claude/burrow/lib/core.cjs` | require('./core.cjs') for atomicWriteFile | WIRED | installer.cjs line 5: `const { atomicWriteFile } = require('./core.cjs')` |
| `install.cjs` | `.claude/burrow/lib/installer.cjs` | generateSnippet import replaces CLAUDE_MD_SNIPPET | WIRED | install.cjs line 9; generateSnippet used at lines 227, 284, 294 |
| `install.cjs` | `.claude/burrow/lib/config.cjs` | config.load(targetDir) to get config for generateSnippet | WIRED | install.cjs line 18 imports config module; config.load(targetDir) with config.DEFAULTS fallback at all 3 call sites |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| generateSnippet full mode returns cards.json + Read tool | node -e inline | true / true | PASS |
| generateSnippet index mode returns burrow-tools.cjs index | node -e inline | true | PASS |
| generateSnippet none mode returns 'on demand' | node -e inline | true | PASS |
| generateSnippet auto mode returns 'threshold' | node -e inline | true | PASS |
| triggerPreset=none omits trigger section | node -e inline | true | PASS |
| All 4 modes include ## Burrow, Privacy:, mutations CLI | node -e inline | true | PASS |
| config tests (33) all pass | node --test test/config.test.cjs | 33 pass / 0 fail | PASS |
| installer tests (49) all pass | node --test test/installer.test.cjs | 49 pass / 0 fail | PASS |
| Full test suite (378) all pass | node --test | 378 pass / 0 fail | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SNP-01 | 15-01-PLAN.md | Sentinel block content varies by loadMode (full/index/none/auto) | SATISFIED | generateSnippet() in installer.cjs: switch statement at lines 29-43 produces 4 distinct load instructions; all modes tested in test/installer.test.cjs |
| SNP-02 | 15-01-PLAN.md | generateSnippet(loadMode) function replaces hardcoded snippet constant | SATISFIED | CLAUDE_MD_SNIPPET: 0 matches in installer.cjs and install.cjs; generateSnippet exported and wired throughout |
| SNP-03 | 15-02-PLAN.md | writeSentinelBlock() refactored to atomic writes (tmp + rename) | SATISFIED | writeSentinelBlock and removeSentinelBlock both use atomicWriteFile exclusively; 0 fs.writeFileSync calls in either function; .bak and .tmp tests in test/installer.test.cjs pass |

No orphaned requirements found — all 3 Phase 15 requirements from REQUIREMENTS.md are claimed and satisfied.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `.claude/burrow/lib/installer.cjs` | 122, 128 | fs.writeFileSync in ensureGitignoreEntry | Info | Not a sentinel write — .gitignore updates are a different concern and not covered by SNP-03 |
| `.claude/burrow/lib/installer.cjs` | 310, 403 | fs.writeFileSync for cards.json creation | Info | Not a sentinel write — fresh empty JSON creation; atomicWriteJSON would be overkill for a file that doesn't exist yet |

No blockers or warnings found. The two info-level uses of fs.writeFileSync are intentional and outside the scope of the atomic sentinel write requirement.

---

### Human Verification Required

None. All phase goals are verifiable programmatically and all checks passed.

---

## Gaps Summary

No gaps. All 11 must-have truths are verified:

- `atomicWriteFile()` exists in core.cjs with the correct tmp+rename pattern and is exported.
- CONFIG_SCHEMA has `triggerPreset` (enum: broad/minimal/none/custom) and `triggerWords` (array type with JSON.parse handling), TRIGGER_PRESETS constant present, preset derivation active in `load()`.
- `generateSnippet(config)` in installer.cjs produces 4 distinct mode-specific snippets and correctly gates the trigger section on `triggerPreset` and `triggerWords`.
- `CLAUDE_MD_SNIPPET` is fully eliminated — 0 references remain.
- `writeSentinelBlock` and `removeSentinelBlock` use `atomicWriteFile` exclusively for all CLAUDE.md writes.
- `install.cjs` imports and calls `generateSnippet(cfg)` at all 3 sentinel write sites with `config.load(targetDir)` and a `config.DEFAULTS` fallback for fresh installs.
- 378 tests pass with 0 failures across the full suite.

---

_Verified: 2026-04-02T19:00:00Z_
_Verifier: Claude (gsd-verifier)_
