---
phase: quick
plan: 2
subsystem: burrow-core
tags: [cli, positioning, reorder]
key-files:
  created: []
  modified:
    - .claude/burrow/lib/mongoose.cjs
    - .claude/burrow/burrow-tools.cjs
    - .claude/burrow/test/mongoose.test.cjs
    - .claude/burrow/test/cli.test.cjs
decisions:
  - "Position parameter uses splice-at-index (consistent with existing moveCard pattern)"
  - "Reorder-in-place (--at without --to) resolves current parent via findParent"
metrics:
  duration: 2 min
  completed: "2026-03-09"
  tasks_completed: 1
  tasks_total: 1
---

# Quick Task 2: Add --at Flag for Position-Based Reordering Summary

Position-based insertion via `--at N` flag for `add` and `move` CLI commands, using splice-at-index in addCard

## What Was Done

### Task 1: Add position support to addCard and wire --at in CLI (TDD)

**RED:** Added 10 new tests across mongoose.test.cjs and cli.test.cjs covering:
- addCard with position 0, mid-position, beyond-length, and no position (backward compat)
- CLI `add --at 0` inserts at beginning
- CLI `add --parent <id> --at 0` inserts at beginning of parent's children
- CLI `move <id> --at 0` reorders within current parent (no --to needed)
- CLI `move <id> --to <parent> --at 1` places at index 1 in destination

**GREEN:** Implemented:
1. `addCard` in mongoose.cjs: added `position` to destructured opts; splice at position if < container.length, else push
2. CLI `add` case: added `at: { type: 'string' }` to parseArgs, parsed to int, passed as `position` to addCard
3. CLI `move` case: added `at: { type: 'string' }` to parseArgs; when `--at` without `--to`, finds current parent via `findParent` for reorder-in-place; passes position as 4th arg to moveCard

**Commit (RED):** `091ed5f` - test(quick-2): add failing tests for --at position flag
**Commit (GREEN):** `b41d080` - feat(quick-2): add --at flag for position-based insertion and reordering

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- All 143 tests pass (101 in mongoose + cli test files, 42 in render tests)
- Smoke test confirmed `add --at 0` inserts before existing cards
- All existing tests continue to pass (backward compatibility preserved)

## Self-Check: PASSED
