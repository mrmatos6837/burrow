---
phase: 08-engine-quality-ergonomics
verified: 2026-03-14T06:00:00Z
status: passed
score: 23/23 must-haves verified
re_verification: false
---

# Phase 8: Engine Quality Ergonomics — Verification Report

**Phase Goal:** Engine quality improvements — tree traversal optimization, schema validation, init script, CLI validation
**Verified:** 2026-03-14T06:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | moveCard performs at most 2 tree traversals instead of 4 separate walks | VERIFIED | `findCardWithAncestry` helper collapses walk 1; `getContainer` is walk 2. Comments at lines 227/255 in mongoose.cjs. |
| 2 | countDescendants and countActiveDescendants are a single parameterized function | VERIFIED | `countDescendants(card, { activeOnly })` at line 91. `countActiveDescendants` grep returns 0 matches. |
| 3 | archiveCard/unarchiveCard count descendants during the recursive set, not via separate walk | VERIFIED | `setArchivedRecursive` returns count inline; archive/unarchive use the return value directly (lines 395, 408). |
| 4 | findParent uses a single traversal (no overlapping root + nested loops) | VERIFIED | `findParent` contains one `search(parentCard, container)` recursive function called with `search(null, data.cards)` — no separate root-level loop. |
| 5 | deleteCard returns the full card object with all fields | VERIFIED | Returns `{ ...card, descendantCount }` at line 190. Shape includes id, title, body, created, archived, children, descendantCount. |
| 6 | Loading a corrupted cards.json produces a clear, human-readable error message | VERIFIED | `validateSchema()` in warren.cjs throws `Error('Burrow: invalid cards.json — <specific reason>')` with actual vs expected type. |
| 7 | Loading a cards.json with invalid structure produces a clear error | VERIFIED | Four distinct error messages for: null, non-object, missing cards array, non-array cards, non-string id. |
| 8 | formatAge handles any malformed ISO string without crashing, returning '???' | VERIFIED | First guard `typeof isoString !== 'string'` (line 27), followed by falsy check, followed by `isNaN` check. |
| 9 | makePreview truncates body BEFORE replacing newlines | VERIFIED | `body.slice(0, PREVIEW_TRUNCATE_LENGTH).replace(/\n/g, ' ')` — slice first, replace second (lines 280-282). |
| 10 | migrate() is skipped entirely when data.version >= 2 | VERIFIED | `if (data.version < 2) { return migrate(data); }` in load() at line 130. No unnecessary function call. |
| 11 | addCard does not walk the entire tree to collect IDs on every call | VERIFIED | `generateId()` called with no args at line 125. No `collectAllIds` import in mongoose.cjs. |
| 12 | Running init adds 'cards.json.bak' line to .gitignore | VERIFIED | `GITIGNORE_ENTRY = '.planning/burrow/cards.json.bak'` appended when missing (init.cjs lines 47-62). |
| 13 | Running init preserves existing .gitignore content and appends | VERIFIED | Reads existing content, checks for entry, appends only if absent (init.cjs lines 52-62). |
| 14 | Running init appends Burrow instructions to CLAUDE.md with correct line endings | VERIFIED | CRLF detection via `existing.includes('\r\n')`, `toCRLF()` applied conditionally (init.cjs lines 78-79). |
| 15 | Running init on existing CLAUDE.md with Burrow section does not duplicate | VERIFIED | `existing.includes('## Burrow')` idempotency check (init.cjs line 74). |
| 16 | --depth abc produces a clear error, not NaN behavior | VERIFIED | `if (values.depth !== undefined && isNaN(depth)) handleError('--depth must be a number')` in burrow-tools.cjs line 272. |
| 17 | --at -1 to add/move produces a clear error | VERIFIED | `if (position < 0) handleError('--at must be non-negative')` in add (line 89) and move (line 209). |
| 18 | --unknown-flag to any command with strict:true produces an error | VERIFIED | All 9 command branches (add, edit, remove, move, read, dump, archive, unarchive, path, find) use `strict: true` — grep confirms zero `strict: false` occurrences. |
| 19 | renderTree rejects non-numeric depth with a clear error | VERIFIED | `if (depthArg !== undefined && typeof depthArg !== 'number') throw new Error('renderTree: depth must be a number')` at lines 296-298. |
| 20 | Magic truncation numbers are named constants with JSDoc | VERIFIED | `PREVIEW_TRUNCATE_LENGTH = 80` with JSDoc in mongoose.cjs (line 111). `BODY_TRUNCATE_LENGTH = 200` and `DIFF_TRUNCATE_LENGTH = 40` already named in render.cjs. |
| 21 | find command uses tree.searchCards instead of reimplementing recursion | VERIFIED | `tree.searchCards(data, query)` called at burrow-tools.cjs line 456. No inline recursion in find case. |
| 22 | editCard captures and returns old values so CLI does not need double findById | VERIFIED | `editCard` returns `{ card, oldTitle, oldBody, breadcrumbs }`. No `cardBefore` variable found in burrow-tools.cjs. |
| 23 | moveCard returns parent info so CLI does not need redundant findById for parent title | VERIFIED | `moveCard` returns `{ card, sourceParentTitle, breadcrumbs }`. CLI uses `result.sourceParentTitle` at line 244. |

**Score:** 23/23 truths verified

---

### Required Artifacts

| Artifact | Plan | Status | Details |
|----------|------|--------|---------|
| `.claude/burrow/lib/mongoose.cjs` | 08-01, 08-02, 08-04 | VERIFIED | 462 lines; exports findById, findParent, getContainer, getPath, addCard, editCard, deleteCard, moveCard, countDescendants, makePreview, PREVIEW_TRUNCATE_LENGTH, renderTree, searchCards, archiveCard, unarchiveCard |
| `test/mongoose.test.cjs` | 08-01, 08-04 | VERIFIED | 1154 lines; covers all refactored functions |
| `.claude/burrow/lib/warren.cjs` | 08-02 | VERIFIED | 168 lines; validateSchema, load with PERF-09 skip, save |
| `.claude/burrow/lib/core.cjs` | 08-02 | VERIFIED | 50 lines; generateId() no params, collectAllIds @deprecated |
| `.claude/burrow/lib/render.cjs` | 08-02 | VERIFIED | 330 lines; formatAge with typeof guard at line 27 |
| `test/warren.test.cjs` | 08-02 | VERIFIED | 265 lines; schema validation cases covered |
| `test/render.test.cjs` | 08-02 | VERIFIED | 1008 lines; formatAge edge cases covered |
| `.claude/burrow/lib/init.cjs` | 08-03 | VERIFIED | 96 lines; init(cwd) exports gitignore+CLAUDE.md handling |
| `test/init.test.cjs` | 08-03 | VERIFIED | 165 lines; 11 tests covering all init scenarios |
| `.claude/burrow/burrow-tools.cjs` | 08-03, 08-04 | VERIFIED | 480 lines; init command wired; all commands strict:true; validation guards; enriched CRUD returns used |
| `test/cli.test.cjs` | 08-04 | VERIFIED | 644 lines; 5 new validation tests (depth abc, at -1, bogus flags) |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| mongoose.cjs | deleteCard return | `{ ...card, descendantCount }` spread | VERIFIED | Line 190: `return { ...card, descendantCount }` |
| mongoose.cjs | countDescendants | `activeOnly` parameter | VERIFIED | `function countDescendants(card, opts)` with `opts.activeOnly` at line 91 |
| warren.cjs | load function | validateSchema before return | VERIFIED | `validateSchema(data)` called at line 128 before migrate check |
| core.cjs | generateId | collision-proof without tree walk | VERIFIED | `crypto.randomUUID().replace(/-/g, '').slice(0, 8)` — no existingIds parameter |
| burrow-tools.cjs | parseArgs strict mode | `strict: true` on all commands | VERIFIED | 9 of 9 command branches use `strict: true`; zero `strict: false` |
| burrow-tools.cjs | depth validation | `isNaN(depth)` check | VERIFIED | Line 272: `if (values.depth !== undefined && isNaN(depth)) handleError(...)` |
| mongoose.cjs | editCard return | `{ card, oldTitle, oldBody, breadcrumbs }` | VERIFIED | Line 168 returns enriched shape; no double findById in CLI |
| init.cjs | .gitignore | append cards.json.bak entry | VERIFIED | `GITIGNORE_ENTRY = '.planning/burrow/cards.json.bak'` appended when absent |
| init.cjs | CLAUDE.md | append with line ending detection | VERIFIED | `isCRLF = existing.includes('\r\n')` + `toCRLF()` conversion |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PERF-01 | 08-01 | moveCard single traversal | SATISFIED | findCardWithAncestry + getContainer = 2 walks |
| PERF-02 | 08-01 | Consolidate count functions | SATISFIED | countDescendants(card, { activeOnly }) replaces countActiveDescendants |
| PERF-03 | 08-01 | archiveCard inline counting | SATISFIED | setArchivedRecursive returns count; no separate walk |
| PERF-04 | 08-04 | CRUD returns path info | SATISFIED | addCard/editCard/moveCard return breadcrumbs; getBreadcrumbs removed from CLI |
| PERF-05 | 08-04 | moveCard returns parent info | SATISFIED | result.sourceParentTitle used at burrow-tools line 244 |
| PERF-06 | 08-04 | editCard captures old values | SATISFIED | result.oldTitle/oldBody used; no cardBefore findById |
| PERF-08 | 08-02 | makePreview truncate-first | SATISFIED | slice(0, PREVIEW_TRUNCATE_LENGTH) before replace (line 280-282) |
| PERF-09 | 08-02 | Skip migrate for v2 | SATISFIED | `if (data.version < 2)` guard in load() before calling migrate() |
| PERF-10 | 08-02 | Eliminate collectAllIds from addCard | SATISFIED | generateId() called with no args; collectAllIds not imported |
| VALID-01 | 08-04 | --depth non-numeric rejected | SATISFIED | isNaN check at burrow-tools line 272 |
| VALID-02 | 08-04 | Negative --at rejected | SATISFIED | position < 0 check in add (89) and move (209) |
| VALID-03 | 08-04 | Unknown flags rejected | SATISFIED | All 9 command branches use strict: true |
| QUAL-01 | 08-02 | formatAge validates ISO input | SATISFIED | typeof guard as first line in formatAge (render.cjs line 27) |
| QUAL-02 | 08-01 | findParent single traversal | SATISFIED | Single search(parentCard, container) recursive function |
| QUAL-03 | 08-04 | renderTree validates depth type | SATISFIED | typeof depthArg !== 'number' throw at mongoose.cjs lines 296-297 |
| QUAL-04 | 08-04 | Document magic truncation numbers | SATISFIED | PREVIEW_TRUNCATE_LENGTH=80 named constant with JSDoc |
| DATA-01 | 08-02 | Schema validation on load | SATISFIED | validateSchema() throws human-readable errors for 4 structural failures |
| DATA-02 | 08-02 | Invalid ISO dates handled gracefully | SATISFIED | formatAge returns '???' for any non-string or invalid date input |
| API-01 | 08-01 | deleteCard returns full card | SATISFIED | `return { ...card, descendantCount }` with all fields |
| API-02 | 08-04 | find uses tree engine | SATISFIED | tree.searchCards(data, query) at burrow-tools.cjs line 456 |
| INST-01 | 08-03 | Init adds cards.json.bak to .gitignore | SATISFIED | GITIGNORE_ENTRY = '.planning/burrow/cards.json.bak' |
| INST-02 | 08-03 | Init normalizes line endings for CLAUDE.md | SATISFIED | isCRLF detection + toCRLF() conditional conversion |

**All 22 requirements: SATISFIED**
**No orphaned requirements** — every requirement ID in the plans maps to a verified implementation.

---

### Anti-Patterns Found

None. Scan of all 6 modified source files found:
- Zero TODO/FIXME/XXX/HACK/PLACEHOLDER comments
- No stub implementations (return null/return {}/return [])
- No empty handler bodies
- No console.log-only implementations

---

### Human Verification Required

None. All behaviors in this phase are programmatically verifiable (algorithmic logic, error messages, structural code patterns, test pass/fail). No UI, real-time, or external service dependencies.

---

### Test Suite Results

All 240 tests pass across 5 test files:

| Test File | Lines | Tests |
|-----------|-------|-------|
| test/mongoose.test.cjs | 1154 | ~89 |
| test/cli.test.cjs | 644 | ~38 |
| test/render.test.cjs | 1008 | ~80 |
| test/warren.test.cjs | 265 | ~22 |
| test/init.test.cjs | 165 | 11 |

All 11 task commits from the 4 plans confirmed present in git history.

---

### Gaps Summary

No gaps. All 23 observable truths verified against actual code. All 22 requirement IDs satisfied with direct implementation evidence. The phase achieved its goal: the tree engine is measurably optimized (traversal reduction), the data layer is hardened (schema validation), the init script exists and is wired into the CLI, and CLI input validation covers all three VALID requirements.

---

_Verified: 2026-03-14T06:00:00Z_
_Verifier: Claude (gsd-verifier)_
