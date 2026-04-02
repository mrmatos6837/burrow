---
phase: 16-workflow-load-step-load-command
verified: 2026-04-02T19:00:00Z
status: passed
score: 9/9 must-haves verified
re_verification: false
---

# Phase 16: Workflow LOAD Step + Load Command Verification Report

**Phase Goal:** The agent's session-start workflow reads `config.json` and branches to the correct loading behavior — full read, index-only, none, or auto-threshold — making the entire config system meaningful at runtime
**Verified:** 2026-04-02
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

All truths derived from PLAN frontmatter `must_haves` (Plans 01 and 02) and ROADMAP.md success criteria.

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | `burrow load` with loadMode=full returns full cards tree in a JSON envelope | VERIFIED | loader.cjs lines 45-50; test `loadMode=full returns correct envelope shape` passes |
| 2  | `burrow load` with loadMode=index returns lightweight index tree in a JSON envelope | VERIFIED | loader.cjs lines 52-57; buildIndex called with indexOpts; test `loadMode=index returns buildIndex output (no body)` passes |
| 3  | `burrow load` with loadMode=none returns JSON envelope with cardCount but no data | VERIFIED | loader.cjs lines 38-43; test `loadMode=none returns correct envelope shape` passes, asserts `!('data' in envelope)` |
| 4  | `burrow load` with loadMode=auto checks file size and resolves to full or index | VERIFIED | loader.cjs lines 20-35; `fs.statSync` + `fileSizeBytes / 4`; tests for small/large file and threshold boundary all pass |
| 5  | indexDepth config key controls depth passed to buildIndex | VERIFIED | config.cjs CONFIG_SCHEMA has `indexDepth` entry; loader.cjs line 55 passes `depth: cfg.indexDepth || 0`; test `loadMode=index with indexDepth=1 limits depth` passes |
| 6  | Workflow Step 1 (LOAD) calls `burrow load` via Bash instead of Read tool | VERIFIED | burrow.md Step 1 contains `node .claude/burrow/burrow-tools.cjs load`; zero matches for old `Read \`.planning/burrow/cards.json\`` pattern |
| 7  | Agent knows which mode was resolved from the JSON envelope | VERIFIED | burrow.md Step 1 documents all four mode behaviors with explicit agent handling instructions |
| 8  | Workflow documents lazy body-fetching pattern for index mode | VERIFIED | burrow.md contains "lazy body-fetching" text in Step 1; documents `burrow read <id> --full` for on-demand fetching |
| 9  | None mode instructs agent to skip loading and note cards are available on demand | VERIFIED | burrow.md Step 1 none mode: "Skip loading entirely — cards are available on demand via `burrow read` or `/burrow`. Note this to yourself and proceed." |

**Score:** 9/9 truths verified

---

## Required Artifacts

### Plan 01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.claude/burrow/lib/loader.cjs` | Load dispatcher with mode branching logic, exports `load` | VERIFIED | 77 lines; exports `{ load }`; full mode branching for all 4 modes; imports config, warren, mongoose |
| `.claude/burrow/lib/config.cjs` | indexDepth added to CONFIG_SCHEMA | VERIFIED | Lines 33-37: `indexDepth` in CONFIG_SCHEMA with `type: 'number'`, validate rejects negatives, accepts 0+; DEFAULTS line 18: `indexDepth: 0` |
| `.claude/burrow/burrow-tools.cjs` | case 'load' CLI entry | VERIFIED | Line 11: `require('./lib/loader.cjs')`; line 549: `case 'load':`; calls `loader.load(cwd)`, writes `JSON.stringify(envelope)` to stdout |
| `test/loader.test.cjs` | Tests for all load modes | VERIFIED | 289 lines; 20 tests covering all 4 modes, auto threshold math, indexDepth depth-limiting, edge cases (empty, missing file) |

### Plan 02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.claude/burrow/workflows/burrow.md` | Updated LOAD step with burrow load dispatcher | VERIFIED | Step 1 rewrites to `burrow load` Bash call; all four modes documented; lazy body-fetching documented; 8 worked examples updated; Command Reference table includes `load` row |

---

## Key Link Verification

### Plan 01 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `loader.cjs` | `config.cjs` | `config.load(cwd)` | WIRED | Line 16: `const cfg = config.load(cwd)` |
| `loader.cjs` | `warren.cjs` | `warren.load(cwd)` | WIRED | Lines 40, 47, 53: `warren.load(cwd)` in all mode branches; also `warren.dataPath(cwd)` in auto mode |
| `loader.cjs` | `mongoose.cjs` | `mongoose.buildIndex(data, opts)` | WIRED | Line 56: `mongoose.buildIndex(data, indexOpts)` in index mode branch |
| `burrow-tools.cjs` | `loader.cjs` | `case 'load'` calling `loader.load(cwd)` | WIRED | Line 11 require; line 550: `loader.load(cwd)` inside `case 'load'` block |

### Plan 02 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `burrow.md` | `burrow-tools.cjs` | `node .claude/burrow/burrow-tools.cjs load` | WIRED | Step 1 and all 8 worked examples reference `burrow load` via Bash; `grep -c "burrow-tools.cjs load"` returns 1 (Step 1 code block) + multiple inline references |

---

## Data-Flow Trace (Level 4)

Not applicable. Phase 16 artifacts are a CLI module (`loader.cjs`) and a workflow markdown document — neither renders dynamic data to a UI. The CLI command's data flow was verified via behavioral spot-check below.

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `burrow load` outputs valid JSON with mode and cardCount | `node .claude/burrow/burrow-tools.cjs load` | `{"mode":"index","cardCount":177,"data":{...}}` — valid JSON, mode and cardCount present | PASS |
| 20 loader tests all pass | `node --test test/loader.test.cjs` | `# tests 20 / # pass 20 / # fail 0` | PASS |
| Existing config tests unaffected by indexDepth addition | `node --test test/config.test.cjs` | `# tests 33 / # pass 33 / # fail 0` | PASS |
| Full test suite (cli, mongoose, warren, render) unaffected | `node --test test/cli.test.cjs test/mongoose.test.cjs test/warren.test.cjs test/render.test.cjs` | `# tests 254 / # pass 254 / # fail 0` | PASS |

---

## Requirements Coverage

All requirement IDs from Plan 01 (`[WFL-01, WFL-02, WFL-03, WFL-04, WFL-05]`) and Plan 02 (`[WFL-01, WFL-02, WFL-03, WFL-04, WFL-05, WFL-06]`) verified against REQUIREMENTS.md.

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| WFL-01 | Plans 01 + 02 | Workflow LOAD step reads config.json to determine loading mode | SATISFIED | loader.cjs calls `config.load(cwd)` to read config; workflow Step 1 dispatches via `burrow load` which reads config internally |
| WFL-02 | Plans 01 + 02 | Full mode: reads cards.json (current behavior) | SATISFIED | loader.cjs `resolvedMode === 'full'` branch calls `warren.load(cwd)` and returns full data envelope; workflow documents full mode behavior |
| WFL-03 | Plans 01 + 02 | Index mode: returns titles/IDs only — no body content | SATISFIED | loader.cjs index branch calls `mongoose.buildIndex(data, indexOpts)` which strips bodies (confirmed by test `loadMode=index returns buildIndex output (no body)` asserting `!('body' in firstCard)`). Note: REQUIREMENTS.md says "runs `burrow index`" but the design was superseded by `burrow load` as universal dispatcher — `burrow load` calls `buildIndex` directly (same logic, no subprocess). Functionally equivalent and architecturally superior. |
| WFL-04 | Plans 01 + 02 | None mode: skips load entirely, notes cards available on demand | SATISFIED | loader.cjs none branch returns `{ mode: 'none', cardCount }` with no data; workflow documents "Skip loading entirely — cards are available on demand" |
| WFL-05 | Plans 01 + 02 | Auto mode: checks size, picks full or index | SATISFIED | loader.cjs auto branch: `fs.statSync` + `fileSizeBytes / 4` vs `autoThreshold`; 3 auto-mode tests all pass |
| WFL-06 | Plan 02 | Workflow documents lazy body-fetching pattern | SATISFIED | burrow.md Step 1 contains explicit "Lazy body-fetching (index mode)" section with `burrow read <id> --full` instruction |

**Orphaned requirements check:** `grep -E "Phase 16" .planning/REQUIREMENTS.md` shows WFL-01 through WFL-06 all map to Phase 16 — all 6 accounted for across the two plans. No orphaned requirements.

**Note on WFL-03 language:** REQUIREMENTS.md (written pre-design) says index mode "runs `burrow index` via Bash". The phase design (CONTEXT.md D-04 through D-08) superseded this with `burrow load` as the universal dispatcher that calls `buildIndex` internally. The requirement's intent — "agent gets titles/IDs only, no body content" — is fully satisfied. The phrase "runs `burrow index`" reflects the pre-design state and was correctly updated by this phase.

---

## Anti-Patterns Found

Scanned all files modified in this phase.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | — |

No TODOs, FIXMEs, placeholder returns, or hardcoded empty data found in phase-modified files. The `return { mode: 'none', cardCount }` in loader.cjs is correct by design (none mode intentionally omits data).

---

## Human Verification Required

None. All behaviors are programmatically verifiable:
- Mode dispatching logic is covered by 20 unit tests
- CLI integration verified via live `burrow load` invocation
- Workflow text content verified via grep

---

## Gaps Summary

No gaps. All must-haves verified, all key links wired, all 6 requirement IDs satisfied, full test suite passes.

---

_Verified: 2026-04-02_
_Verifier: Claude (gsd-verifier)_
