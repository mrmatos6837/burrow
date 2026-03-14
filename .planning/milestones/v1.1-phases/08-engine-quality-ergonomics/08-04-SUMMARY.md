---
phase: 08-engine-quality-ergonomics
plan: 04
subsystem: cli
tags: [validation, input-validation, strict-mode, crud-ergonomics, perf]

requires:
  - phase: 08-01
    provides: refactored moveCard + findCardWithAncestry + enriched deleteCard/archiveCard returns

provides:
  - CLI input validation: --depth NaN guard, --at negative guard, strict:true on all commands
  - searchCards(data, query) in mongoose.cjs — encapsulates recursive search with breadcrumb paths
  - renderTree depth type guard — throws if depth is non-numeric string
  - PREVIEW_TRUNCATE_LENGTH=80 named constant replacing inline magic number
  - addCard/editCard/moveCard return enriched objects {card, breadcrumbs, oldTitle?, oldBody?, sourceParentTitle?}
  - getBreadcrumbs helper removed from CLI — zero post-mutation tree walks

affects:
  - any future work calling addCard/editCard/moveCard — must use .card not bare return
  - any caller of searchCards — centralized in mongoose.cjs

tech-stack:
  added: []
  patterns:
    - "Enriched CRUD returns: mutations return {card, ...context} so callers never need post-mutation walks"
    - "Strict parseArgs: all CLI commands use strict:true to reject unknown flags"
    - "Named constants: magic numbers documented with JSDoc and named at top of module"
    - "searchCards in engine: search logic lives in mongoose.cjs, CLI find command is a thin wrapper"

key-files:
  created: []
  modified:
    - .claude/burrow/burrow-tools.cjs
    - .claude/burrow/lib/mongoose.cjs
    - test/cli.test.cjs
    - test/mongoose.test.cjs

key-decisions:
  - "addCard/editCard/moveCard enriched returns: mutations return {card, breadcrumbs, ...} so CLI has zero post-mutation tree walks — callers that used bare return value require update"
  - "searchCards encapsulates recursive search in mongoose.cjs — keeps CLI find command thin; ancestor accumulation approach kept (O(n) walk) over per-match getPath calls which would be O(n*m)"
  - "PREVIEW_TRUNCATE_LENGTH exported from mongoose.cjs as public constant — enables testing and documents intent"
  - "--at -1 with space syntax: parseArgs strict mode treats -1 as ambiguous flag; cross-mark error still shown via catch block; --at=-1 is the unambiguous form"

patterns-established:
  - "All CRUD mutations return enriched objects — never return bare card"
  - "All parseArgs calls use strict:true — unknown flags produce cross-mark errors"

requirements-completed: [VALID-01, VALID-02, VALID-03, QUAL-03, QUAL-04, API-02, PERF-04, PERF-05, PERF-06]

duration: 25min
completed: 2026-03-14
---

# Phase 08 Plan 04: CLI Input Validation and CRUD Ergonomics Summary

**CLI validation (strict mode, --depth, --at), searchCards engine function, PREVIEW_TRUNCATE_LENGTH constant, and enriched addCard/editCard/moveCard returns eliminating all post-mutation tree walks**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-03-14
- **Completed:** 2026-03-14
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `--depth` NaN validation, `--at` negative validation, and `strict: true` on all 9 CLI commands (VALID-01/02/03)
- Added `searchCards(data, query)` to mongoose.cjs; `find` command now delegates to engine function (API-02)
- Added `renderTree` depth type guard throwing on non-numeric depth (QUAL-03)
- Extracted `PREVIEW_TRUNCATE_LENGTH = 80` named constant in mongoose.cjs (QUAL-04)
- Enriched `addCard`, `editCard`, and `moveCard` to return `{card, breadcrumbs, ...}` eliminating all post-mutation `getBreadcrumbs` walks (PERF-04/05/06)
- Removed `getBreadcrumbs` helper from `burrow-tools.cjs` entirely
- CLI `edit` command no longer does double `findById` — old values now come from `editCard` return
- CLI `move` command no longer does separate `findParent` for source parent title — now from `moveCard` return
- All 240 tests pass with no regressions

## Task Commits

1. **Task 1 RED: Failing tests for validation, searchCards, renderTree depth, PREVIEW_TRUNCATE_LENGTH** - `5f7adba` (test)
2. **Task 1 GREEN: Implementation of all Task 1 features** - `ed02457` (feat)
3. **Task 2: Enrich CRUD returns + remove getBreadcrumbs** - `f17d67e` (feat)

## Files Created/Modified

- `.claude/burrow/burrow-tools.cjs` - strict:true on all commands; --depth/--at validation; find uses tree.searchCards; add/edit/move use enriched returns; getBreadcrumbs helper removed
- `.claude/burrow/lib/mongoose.cjs` - PREVIEW_TRUNCATE_LENGTH constant; makePreview uses constant; renderTree depth guard; searchCards function; addCard/editCard/moveCard enriched returns; exported: PREVIEW_TRUNCATE_LENGTH, searchCards
- `test/cli.test.cjs` - 5 new validation tests (depth abc, at -1 on add, at -1 on move, bogus flag on read, bogus flag on add)
- `test/mongoose.test.cjs` - searchCards tests (6), renderTree depth validation tests (3), PREVIEW_TRUNCATE_LENGTH constant test (1); updated addCard/editCard/moveCard tests to match enriched return shapes

## Decisions Made

- **Enriched CRUD returns require callers to use `.card`:** All external callers of `addCard`/`editCard`/`moveCard` must now destructure `result.card` instead of using `result` directly. Existing tests updated accordingly.
- **searchCards uses ancestor accumulation:** Passing `ancestors` array down the walk is more efficient than calling `getPath` per match (which does a full tree walk per matched card). Kept this pattern in the engine.
- **PREVIEW_TRUNCATE_LENGTH exported:** Made public so tests can reference it and future callers can import the constant rather than hardcoding 80.
- **`--at -1` (space syntax) via parseArgs:** Node's `parseArgs` strict mode treats `-1` as ambiguous (looks like a flag). The error from parseArgs is caught by the top-level catch and displayed as a cross-mark error — user sees an error either way. `--at=-1` is the unambiguous form.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `--at -1` (space syntax) causes parseArgs ambiguity in strict mode — Node treats `-1` as a potential flag. The plan says to produce an error for negative `--at`, and an error IS produced (via parseArgs's own error caught by the top-level catch). The test passes. Documented in decisions.

## Next Phase Readiness

- All VALID, PERF, API, QUAL requirements for this plan are complete
- mongoose.cjs exports: findById, findParent, getContainer, getPath, addCard, editCard, deleteCard, moveCard, countDescendants, makePreview, PREVIEW_TRUNCATE_LENGTH, renderTree, searchCards, archiveCard, unarchiveCard
- CLI has zero post-mutation tree walks and validates all numeric inputs

---
*Phase: 08-engine-quality-ergonomics*
*Completed: 2026-03-14*
