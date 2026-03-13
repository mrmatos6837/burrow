---
phase: 07-rendering-enhancements
verified: 2026-03-13T22:00:00Z
status: passed
score: 8/8 must-haves verified
re_verification: false
---

# Phase 7: Rendering Enhancements Verification Report

**Phase Goal:** Rendering pipeline hardening — edge case guards, dynamic terminal width, deep nesting alignment
**Verified:** 2026-03-13
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Cards with empty or undefined titles render `(untitled)` instead of crashing | VERIFIED | `formatCardLine`, `renderCard`, `formatBreadcrumb` all apply `safeTitle` normalization (render.cjs lines 70, 111, 171). Test suite: 7 tests covering undefined/empty/whitespace titles. |
| 2 | Future timestamps display `just now` instead of negative time values | VERIFIED | `formatAge` uses `Math.max(0, now - then)` (render.cjs line 31). Two tests verify 1hr and 1yr future dates show `just now`. |
| 3 | Invalid/missing ISO dates display `???` instead of `NaNy ago` | VERIFIED | `formatAge` returns `'???'` for falsy input and NaN results (render.cjs lines 27, 30). `formatCreatedDate` has its own guard (lines 53-55). Tests cover null, undefined, empty string, and malformed date strings. |
| 4 | `descendantCount` is not redundantly computed in `buildNested` root case | VERIFIED | Root card case in `renderTree` derives `descendantCount` via `builtChildren.reduce()` instead of a second `countActiveDescendants(rootCard)` call (mongoose.cjs lines 310-312). 6 PERF-07 behavioral tests pass. |
| 5 | Rendered tree width adapts to terminal width instead of hardcoded 80 | VERIFIED | `formatCardLine` and `renderCard` both use `Math.max(MIN_TERM_WIDTH, termWidth || 80)` (render.cjs lines 103, 169). `resolveTermWidth()` in burrow-tools.cjs reads `process.stdout.columns || 80` (burrow-tools.cjs lines 17-23). |
| 6 | The `--width` flag overrides terminal width on all commands that produce rendered output | VERIFIED | `width: { type: 'string' }` declared in `parseArgs` for all 9 commands: add, edit, remove, move, read, dump, archive, unarchive, path. `resolveTermWidth(values)` threaded through add/edit/read/dump. move uses `strict: true` and correctly declares `width`. |
| 7 | Very narrow terminal clamps to minimum width floor instead of negative title space | VERIFIED | `MIN_TERM_WIDTH = 40` constant at render.cjs line 17. Negative `availableForTitle` falls back to `truncate(safeTitle, 1)` (render.cjs line 122). Tests verify termWidth=20 produces lines >= 40 chars. |
| 8 | Box-drawing columns align consistently at 3+ nesting levels | VERIFIED | `renderTreeLines` propagates `tw` through recursive calls (render.cjs lines 139-156). Padding computed as `Math.max(1, tw - leftContent.length - rightSide.length)` (line 126) — fixes a pre-existing 2-char off-by-two. Depth-3 alignment tests assert all tree lines are exactly `termWidth` characters. |

**Score:** 8/8 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.claude/burrow/lib/render.cjs` | `formatAge` NaN/future guards; `formatCardLine`/`renderCard`/`formatBreadcrumb` safeTitle; `MIN_TERM_WIDTH` constant and clamp | VERIFIED | All patterns present. Contains `MIN_TERM_WIDTH`, `(untitled)`, `Math.max(0, diffMs)`, `isNaN(then)`, `Math.max(MIN_TERM_WIDTH`, `truncate(safeTitle, 1)`. |
| `.claude/burrow/lib/mongoose.cjs` | `buildNested` root case derives `descendantCount` from `builtChildren.reduce()` | VERIFIED | Lines 306-312 implement the optimization. No separate `countActiveDescendants(rootCard)` call at root level. |
| `.claude/burrow/burrow-tools.cjs` | `resolveTermWidth` function; `--width` flag on all commands | VERIFIED | `resolveTermWidth` at lines 17-23. `width: { type: 'string' }` in all 9 command parseArgs blocks. |
| `test/render.test.cjs` | Tests for empty title, future date, invalid date, width clamping, depth-3 alignment | VERIFIED | Describe blocks: `formatAge edge cases`, `safeTitle guard in formatCardLine`, `safeTitle guard in renderCard header`, `safeTitle guard in formatBreadcrumb`, `MIN_TERM_WIDTH floor (width clamping)`, `depth 3+ alignment`. |
| `test/mongoose.test.cjs` | Tests for PERF-07 descendantCount correctness | VERIFIED | Describe block: `renderTree descendantCount optimization (PERF-07)` with 6 tests. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `.claude/burrow/lib/render.cjs` | `formatAge` | NaN and future-date guards at function entry | VERIFIED | `if (!isoString) return '???'` + `if (isNaN(then)) return '???'` + `Math.max(0, now - then)` at lines 27, 30, 31. |
| `.claude/burrow/lib/render.cjs` | `formatCardLine` | safeTitle normalization | VERIFIED | `(card.title && card.title.trim()) ? card.title : '(untitled)'` at line 111. |
| `.claude/burrow/burrow-tools.cjs` | `.claude/burrow/lib/render.cjs` | `resolveTermWidth` output threaded as `termWidth` parameter | VERIFIED | `termWidth: resolveTermWidth(values)` used in add (line 108), edit (line 158), read (lines 299, 315), dump (line 355). |
| `.claude/burrow/burrow-tools.cjs` | `parseArgs` | `--width` option added to all command parseArgs calls | VERIFIED | `width: { type: 'string' }` present in all 9 commands. move (strict: true) correctly includes it to prevent "Unknown option" error. |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| REND-06 | 07-02-PLAN | Tree alignment consistent at 3+ nesting levels | SATISFIED | `renderTreeLines` recursive width propagation + `Math.max(1, tw - leftContent.length - rightSide.length)` padding. Off-by-two bug fixed as a bonus. Alignment tests pass. |
| REND-07 | 07-02-PLAN | Render width adapts to terminal size (process.stdout.columns) | SATISFIED | `resolveTermWidth()` reads `process.stdout.columns \|\| 80`. All render-producing commands use it. |
| REND-08 | 07-01-PLAN | Empty/undefined title handled gracefully in `formatCardLine` | SATISFIED | `safeTitle` normalization in `formatCardLine`, `renderCard`, `formatBreadcrumb`. Tests confirm no crash, output contains `(untitled)`. |
| REND-09 | 07-01-PLAN | Future dates display sensibly instead of "just now" with negative prefix | SATISFIED | `Math.max(0, now - then)` clamps negative diff to zero. Tests confirm far-future and near-future dates show `just now`. |
| REND-10 | 07-02-PLAN | Very narrow terminal width clamps to minimum instead of negative availableForTitle | SATISFIED | `MIN_TERM_WIDTH = 40`; `Math.max(MIN_TERM_WIDTH, termWidth \|\| 80)`; negative `availableForTitle` falls back to `truncate(safeTitle, 1)`. Width floor tests pass. |
| PERF-07 | 07-01-PLAN | Pre-compute descendantCount once, pass through rendering pipeline instead of per-child loop | SATISFIED | Root case in `renderTree` derives count from `builtChildren.reduce()`. PERF-07 test suite (6 tests) confirms correct counts with active/archived mix. |

No orphaned requirements: all 6 IDs (REND-06, REND-07, REND-08, REND-09, REND-10, PERF-07) are mapped to Phase 7 in REQUIREMENTS.md traceability table and verified in the codebase.

---

### Anti-Patterns Found

None. No TODO/FIXME/PLACEHOLDER comments in modified files. No empty implementations or stub handlers. No `console.log`-only handlers.

---

### Human Verification Required

None. All truths are programmatically verifiable through code inspection and the test suite.

---

### Test Suite

Full suite result: **176 tests, 0 failures, 0 skipped** (node --test test/*.test.cjs).

Notable test additions this phase:
- 13 new render edge-case tests (formatAge, safeTitle, formatCreatedDate guards)
- 8 new width/alignment tests (MIN_TERM_WIDTH clamping, depth-3 line length)
- 6 new mongoose PERF-07 behavioral tests

---

### Summary

Phase 7 achieved its goal. The rendering pipeline is hardened against edge cases:

- Every crash path from missing/invalid card data has a guard with a readable fallback.
- Terminal width is dynamic and user-overridable; the minimum floor prevents layout breakdown on narrow terminals.
- Deep nesting alignment is correct; a pre-existing 2-char padding off-by-two was discovered and fixed during TDD.
- PERF-07 eliminates one redundant tree walk per `renderTree(data, rootId)` call.

All 4 feature commits are present in git history (`6452bc4`, `afc1d9c`, `8bead43`, `de9341c`) and the full 176-test suite is green.

---

_Verified: 2026-03-13_
_Verifier: Claude (gsd-verifier)_
