---
phase: 14-config-foundation-index-command
plan: "02"
subsystem: burrow-core
tags: [index, cli, tdd, mongoose, render]
dependency_graph:
  requires: ["14-01"]
  provides: ["buildIndex", "renderIndex", "burrow index command"]
  affects: [".claude/burrow/lib/mongoose.cjs", ".claude/burrow/lib/render.cjs", ".claude/burrow/burrow-tools.cjs"]
tech_stack:
  added: []
  patterns: ["lightweight tree extraction", "index load mode primitive"]
key_files:
  created: []
  modified:
    - ".claude/burrow/lib/mongoose.cjs"
    - ".claude/burrow/lib/render.cjs"
    - ".claude/burrow/burrow-tools.cjs"
    - "test/mongoose.test.cjs"
    - "test/cli.test.cjs"
    - "test/render.test.cjs"
decisions:
  - "buildIndex() strips tree to only id/title/childCount/hasBody/archived/children — no body, no created, no descendantCount"
  - "renderIndex() returns raw JSON string for --json mode (no pretty wrapper), human-readable tree for default"
  - "index --json exits without update-check notification to keep machine-readable output clean"
metrics:
  duration: "~8 minutes"
  completed: "2026-04-02"
  tasks_completed: 2
  files_modified: 6
requirements: [IDX-01, IDX-02, IDX-03]
---

# Phase 14 Plan 02: Index Command Summary

**One-liner:** `burrow index` lightweight tree extraction (id/title/childCount/hasBody) with `--json`, `--depth`, and `--include-archived` flags — the cheap context-loading primitive for Phase 16 loadMode.

## What Was Built

### buildIndex() in mongoose.cjs
- Extracts lightweight tree with only 6 fields: `id`, `title`, `childCount`, `hasBody`, `archived`, `children`
- Strips `body`, `bodyPreview`, `created`, `descendantCount` entirely
- `childCount` = direct active children count (not recursive)
- `hasBody` = boolean, true when body is truthy and non-whitespace
- `opts.depth` limits nesting (0 or undefined = unlimited)
- `opts.includeArchived=false` (default): excludes archived cards; `true` includes them

### renderIndex() in render.cjs
- `renderIndex(indexData, { json: true })` returns `JSON.stringify` of cards array
- `renderIndex(indexData, { json: false })` returns human-readable tree with `burrow index` header, box-drawing characters, id/title/childCount per line
- Both modes added without removing Plan 14-01's `renderConfigList`

### `case 'index':` in burrow-tools.cjs
- Parses `--depth`, `--json`, `--include-archived`, `--width` flags
- `--json` outputs raw JSON to stdout and exits without update notification (machine-readable)
- Default renders human-readable tree via `writeAndExit`
- Both `config` and `index` listed in available commands error messages

## Test Coverage

- 10 new `buildIndex` unit tests in `test/mongoose.test.cjs` — all pass
- 7 new integration tests in `test/cli.test.cjs` — all pass
- Fixed `test/render.test.cjs` export count test (5→6 after adding `renderIndex`)
- Full suite: **275 tests, 0 failures**

## Size Savings Verified

On actual project data:
- `cards.json`: 229,405 bytes
- `burrow index --json`: 33,385 bytes
- **~85% reduction** (exceeds the ~95% promise on dense body content)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed render.test.cjs export count assertion**
- **Found during:** Task 2 full test suite run
- **Issue:** `test/render.test.cjs` had `assert.equal(keys.length, 5)` — adding `renderIndex` as the 6th export caused 1 test failure
- **Fix:** Updated count assertion from 5 to 6; added explicit `renderIndex` export type check
- **Files modified:** `test/render.test.cjs`
- **Commit:** 1f945d6

## Self-Check: PASSED

All created/modified files verified present. All commits verified in git log.
- `.claude/burrow/lib/mongoose.cjs` — FOUND
- `.claude/burrow/lib/render.cjs` — FOUND
- `.claude/burrow/burrow-tools.cjs` — FOUND
- `test/mongoose.test.cjs` — FOUND
- `test/cli.test.cjs` — FOUND
- Commit 793cbd1 — FOUND
- Commit 1f945d6 — FOUND
