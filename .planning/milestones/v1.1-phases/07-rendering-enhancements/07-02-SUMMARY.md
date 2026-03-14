---
phase: 07-rendering-enhancements
plan: 02
subsystem: rendering
tags: [terminal-width, cli, render, tdd]

# Dependency graph
requires:
  - phase: 07-rendering-enhancements/07-01
    provides: safeTitle guards in formatCardLine and renderCard header; formatCreatedDate null/NaN guard
provides:
  - MIN_TERM_WIDTH=40 constant in render.cjs with Math.max clamp in formatCardLine and renderCard
  - resolveTermWidth() function in burrow-tools.cjs reads --width flag or process.stdout.columns
  - --width flag declared in parseArgs for all commands (add, edit, remove, move, read, dump, archive, unarchive, path)
  - Fixed 2-char off-by-two in formatCardLine padding (lines now exactly termWidth chars)
affects: [08-polish, future-render-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - resolveTermWidth() centralizes terminal-width resolution; all render calls use it
    - MIN_TERM_WIDTH floor prevents rendering crashes on very narrow terminals
    - padding = Math.max(1, tw - leftContent.length - rightSide.length) for correct right-alignment

key-files:
  created: []
  modified:
    - .claude/burrow/lib/render.cjs
    - .claude/burrow/burrow-tools.cjs
    - test/render.test.cjs

key-decisions:
  - "MIN_TERM_WIDTH=40 derived from minimum layout budget: 2+2+1+10+1+15+2+7=40"
  - "padding formula simplified: Math.max(1, tw - leftContent.length - rightSide.length) — the previous +2 in totalContentLen caused a 2-char off-by-two error (lines were always 2 chars short)"
  - "move command uses strict: true — width option must be declared or --width throws Unknown option"
  - "find command excluded from --width: produces plain text, not rendered trees"

patterns-established:
  - "resolveTermWidth(values): centralized width resolution — callers never access process.stdout.columns directly"
  - "MIN_TERM_WIDTH clamp: Math.max(MIN_TERM_WIDTH, termWidth || 80) in both formatCardLine and renderCard"

requirements-completed: [REND-06, REND-07, REND-10]

# Metrics
duration: 10min
completed: 2026-03-13
---

# Phase 07 Plan 02: Dynamic Terminal Width Summary

**MIN_TERM_WIDTH=40 floor, resolveTermWidth() function, and --width flag wired to all CLI commands with 2-char padding bug fixed**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-13T21:33:00Z
- **Completed:** 2026-03-13T21:38:34Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added `MIN_TERM_WIDTH = 40` constant to render.cjs; both `formatCardLine` and `renderCard` now clamp via `Math.max(MIN_TERM_WIDTH, termWidth || 80)`
- Fixed long-standing 2-char off-by-two in line padding — tree lines now render exactly `termWidth` characters
- Added `resolveTermWidth(values)` in burrow-tools.cjs; all render-producing commands (`add`, `edit`, `read`, `dump`) use it
- Added `width: { type: 'string' }` to parseArgs for all commands including `move` (which uses `strict: true`)
- Added 8 new tests: width clamping at 20/40/80/120 chars, depth-3+ line alignment, consistent right-alignment

## Task Commits

1. **Task 1: Add MIN_TERM_WIDTH floor to render.cjs and verify depth-3+ alignment** - `8bead43` (feat + test TDD)
2. **Task 2: Wire resolveTermWidth and --width flag through all CLI commands** - `de9341c` (feat)

## Files Created/Modified

- `.claude/burrow/lib/render.cjs` - Added MIN_TERM_WIDTH constant; clamped termWidth in formatCardLine and renderCard; fixed padding off-by-two; fixed negative availableForTitle to truncate(safeTitle, 1)
- `.claude/burrow/burrow-tools.cjs` - Added resolveTermWidth(); added width option to all commands; replaced process.stdout.columns usage in add/edit/read/dump
- `test/render.test.cjs` - Added 8 new width-clamping and alignment tests (60 total, up from 54)

## Decisions Made

- Padding formula corrected: `Math.max(1, tw - leftContent.length - rightSide.length)` — removing the `+ 2` from `totalContentLen` that was causing all lines to be 2 chars short of `termWidth`
- `move` command declares `width` in strict mode parseArgs to prevent "Unknown option" error
- `find` command intentionally excluded — it produces plain text search results, not rendered trees

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed 2-char off-by-two in formatCardLine padding calculation**
- **Found during:** Task 1 (TDD GREEN phase — tests revealed lines 2 chars short)
- **Issue:** `totalContentLen = leftContent.length + 2 + rightSide.length` then `padding = tw - totalContentLen` produced padding that was 2 fewer than needed. The `+2` reserved minimum spacing but was subtracted twice — once from `availableForTitle` and once from `totalContentLen`.
- **Fix:** Removed `totalContentLen` variable; computed `padding = Math.max(1, tw - leftContent.length - rightSide.length)` directly
- **Files modified:** `.claude/burrow/lib/render.cjs`
- **Verification:** All 60 render tests pass; tree lines at depth 0-3 are exactly termWidth chars
- **Committed in:** `8bead43` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** The bug fix was discovered by the TDD tests written in this plan. Prior to this plan, all tree lines were 2 chars short of the configured terminal width. Fix is correct and contained.

## Issues Encountered

None — TDD process caught the off-by-two immediately in the RED phase.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Terminal width is now fully dynamic and testable via --width flag
- render.cjs and burrow-tools.cjs integration is clean: one place (resolveTermWidth) controls width resolution
- Phase 07 Plan 03 (if any) or Phase 08 can rely on correct line-length behavior
- No concerns or blockers

---
*Phase: 07-rendering-enhancements*
*Completed: 2026-03-13*
