---
phase: quick-7
plan: 01
subsystem: render
tags: [render, ui, body-indicator]
dependency_graph:
  requires: []
  provides: [body-indicator-plus]
  affects: [render.cjs, render.test.cjs, README.md, PROJECT.md]
tech_stack:
  added: []
  patterns: ["+ symbol for body indicator instead of ellipsis"]
key_files:
  modified:
    - .claude/burrow/lib/render.cjs
    - test/render.test.cjs
    - README.md
    - .planning/PROJECT.md
decisions:
  - "Use + instead of ellipsis (U+2026) for body indicator -- cleaner, more universal"
metrics:
  duration: "2 min"
  completed: "2026-03-09"
  tasks_completed: 2
  tasks_total: 2
---

# Quick Task 7: Change hasBody Indicator from Ellipsis to + Summary

Changed the hasBody indicator from ellipsis (U+2026) to + symbol across render code, tests, and documentation. Re-tagged v1.0 to include the fix.

## What Changed

### Task 1: Update render code and tests
**Commit:** 12e6728

- Changed `bodyMarker` in `render.cjs` from `' \u2026'` to `' +'`
- Updated 9 test assertions in `render.test.cjs` to check for `' +'` instead of `'\u2026'`
- Renamed `ellipsisIdx` variables to `bodyIdx` for clarity
- All 41 render tests pass

### Task 2: Update documentation and re-tag v1.0
**Commit:** 25878df

- Updated 7 tree example lines in README.md replacing trailing ` ...` with ` +`
- Updated indicator legend: `` `+` -- card has a body ``
- Updated 2 tree example lines in PROJECT.md
- Deleted old v1.0 tag and re-tagged at latest commit (25878df)

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

- `node --test test/render.test.cjs` -- 41/41 pass
- `node --test test/cli.test.cjs` -- 38/38 pass (no regressions)
- No remaining body-indicator ellipsis in README.md or PROJECT.md
- Truncation ellipsis (line 86, 225 in render.cjs) preserved correctly
- `git tag -l v1.0` confirms tag exists on commit 25878df

## Self-Check: PASSED

- [x] .claude/burrow/lib/render.cjs -- modified, contains `' +'`
- [x] test/render.test.cjs -- modified, all assertions use `' +'`
- [x] README.md -- modified, no body-indicator ellipsis remaining
- [x] .planning/PROJECT.md -- modified, no body-indicator ellipsis remaining
- [x] Commit 12e6728 exists
- [x] Commit 25878df exists
- [x] v1.0 tag points to 25878df
