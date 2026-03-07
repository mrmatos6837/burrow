---
phase: 01-core-engine
plan: 01
subsystem: data-layer
tags: [recursive-tree, json-storage, atomic-write, commonjs, node-test]

# Dependency graph
requires: []
provides:
  - "core.cjs: output/error helpers, ID generation, data dir management"
  - "storage.cjs: atomic JSON load/save with backup"
  - "tree.cjs: all recursive tree operations (find, path, add, edit, delete, move, children, list)"
affects: [01-02-cli-wiring, views-and-features, agent-interface]

# Tech tracking
tech-stack:
  added: [node:test, node:assert, node:crypto]
  patterns: [atomic-write-tmp-rename, recursive-tree-traversal, position-recompact, CommonJS-cjs]

key-files:
  created:
    - .claude/burrow/lib/core.cjs
    - .claude/burrow/lib/storage.cjs
    - .claude/burrow/lib/tree.cjs
    - .claude/burrow/test/storage.test.cjs
    - .claude/burrow/test/tree.test.cjs
  modified: []

key-decisions:
  - "Used crypto.randomUUID for 8-char hex ID generation with collision check"
  - "getContainer returns null (not throw) for invalid parentId -- caller decides error handling"
  - "Alpha-ordered items get position 0 since position is irrelevant for alpha sorting"
  - "editItem and deleteItem return null for missing IDs -- no exceptions for expected failures"

patterns-established:
  - "Atomic write: tmp file + rename for crash safety"
  - "Backup before write: .bak copy of previous state"
  - "Pure data manipulation: tree.cjs never touches filesystem"
  - "Container pattern: root data and item.children share {ordering, items} shape"
  - "Recompact after removal: positions always [0,1,2,...] with no gaps"

requirements-completed: [DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, DATA-08, DATA-09, DATA-10]

# Metrics
duration: 3min
completed: 2026-03-07
---

# Phase 1 Plan 01: Core Data Layer Summary

**Recursive tree engine with atomic JSON storage, 12 exported operations, and 43 passing tests (node:test)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-07T16:54:08Z
- **Completed:** 2026-03-07T16:57:29Z
- **Tasks:** 2
- **Files created:** 5

## Accomplishments
- Complete data layer: core helpers, storage with atomic write and backup, full recursive tree operations
- 43 tests covering all CRUD operations, tree traversal, ordering modes, cycle detection, and position management
- TDD workflow: tests written first (RED), implementation passes all (GREEN)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create core helpers and storage module** - `405915d` (feat)
2. **Task 2: Tree tests (RED)** - `0367a63` (test)
3. **Task 2: Tree implementation (GREEN)** - `7698755` (feat)

## Files Created/Modified
- `.claude/burrow/lib/core.cjs` - Output helpers (output, errorOut), ensureDataDir, generateId, collectAllIds
- `.claude/burrow/lib/storage.cjs` - Load with default empty state, save with atomic tmp+rename and .bak backup
- `.claude/burrow/lib/tree.cjs` - All 12 recursive tree operations (findById, findParent, getContainer, getPath, addItem, editItem, deleteItem, moveItem, getChildren, listItems, recompact, getOrderedChildren)
- `.claude/burrow/test/storage.test.cjs` - 5 storage tests (load defaults, existing read, save content, backup, atomic write)
- `.claude/burrow/test/tree.test.cjs` - 38 tree tests (find, path, add, edit, delete, move, children/list ordering, ID generation)

## Decisions Made
- Used `crypto.randomUUID()` sliced to 8 chars for ID generation with collision checking against existing IDs
- `getContainer` returns `null` for invalid parentId rather than throwing -- lets callers decide error handling
- Alpha-ordered items always get `position: 0` since position is meaningless for alpha sorting
- `editItem` and `deleteItem` return `null` for missing IDs -- consistent null-return pattern for not-found cases

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All tree operations and storage ready for CLI wiring in Plan 02
- tree.cjs is pure data manipulation (no I/O) -- CLI layer will compose tree + storage
- Output contract helpers (output, errorOut) ready for CLI command handlers

## Self-Check: PASSED

All 6 files verified present. All 3 task commits verified in git log.

---
*Phase: 01-core-engine*
*Completed: 2026-03-07*
