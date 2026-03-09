---
phase: 02-views-and-features
plan: 02
subsystem: api
tags: [tree, rendering, archive, cli, views]

# Dependency graph
requires:
  - phase: 02-views-and-features
    plan: 01
    provides: "v2 card schema with plain array children, archived field, body field"
provides:
  - "renderTree(data, rootId, {depth, archiveFilter}) flat render array with breadcrumbs"
  - "archiveCard/unarchiveCard with cascade to all descendants"
  - "countActiveDescendants for active-only descendant counts"
  - "Enhanced CLI: get with --depth/--include-archived/--archived-only"
  - "CLI aliases: list, dump, children routed through handleGet"
  - "archive/unarchive CLI commands"
affects: [03-agent-interface, agent-tools]

# Tech tracking
tech-stack:
  added: []
  patterns: ["flat render array pattern for views", "handleGet shared function for CLI alias routing", "cascade archive/unarchive via recursive setArchived"]

key-files:
  created: []
  modified:
    - ".claude/burrow/lib/mongoose.cjs"
    - ".claude/burrow/burrow-tools.cjs"
    - ".claude/burrow/test/mongoose.test.cjs"
    - ".claude/burrow/test/cli.test.cjs"

key-decisions:
  - "renderTree returns {breadcrumbs, cards} where cards is a flat array with depth field -- not nested"
  - "depth default is 1 (card + direct children); depth 0 means Infinity (full tree)"
  - "countActiveDescendants skips archived children and their entire subtrees"
  - "handleGet shared function in CLI eliminates duplication across get/list/dump/children"
  - "list alias is get with no args; dump alias is get --depth 0; children alias is get <id>"

patterns-established:
  - "Flat render array: {id, title, depth, descendantCount, hasBody, bodyPreview, created, archived}"
  - "Archive filter enum: 'active' | 'archived-only' | 'include-archived'"
  - "CLI alias routing via shared handleGet function"

requirements-completed: [RNDR-01, RNDR-02, RNDR-03, RNDR-04, RNDR-05, ARCH-01, ARCH-02, ARCH-03, CLI-03, CLI-04]

# Metrics
duration: 4min
completed: 2026-03-08
---

# Phase 2 Plan 2: Views and Archive Summary

**Universal get command with flat render array, depth control, breadcrumbs, cascade archive/unarchive, and CLI alias routing**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-08T10:19:47Z
- **Completed:** 2026-03-08T10:24:09Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- renderTree produces flat array with depth, descendantCount, hasBody, bodyPreview, breadcrumbs
- Depth model: default=1, --depth N, --depth 0=full tree (Infinity)
- Archive system: cascade archive/unarchive, active-only counts, three filter modes
- CLI aliases: list, dump, children route through shared handleGet to get
- 103 total tests passing across all suites (60 unit + 43 integration)

## Task Commits

Each task was committed atomically:

1. **Task 1: renderTree, countActiveDescendants, archiveCard, unarchiveCard (TDD)**
   - `0ac8e64` (test) - Failing tests for new functions
   - `0e7a948` (feat) - Implementation in mongoose.cjs
2. **Task 2: Wire get/archive/unarchive/aliases into CLI** - `5bb98c9` (feat)

## Files Created/Modified
- `.claude/burrow/lib/mongoose.cjs` - Added renderTree, archiveCard, unarchiveCard, countActiveDescendants, makePreview, setArchivedRecursive
- `.claude/burrow/burrow-tools.cjs` - Overhauled CLI: handleGet shared function, get with flags, archive/unarchive commands, list/dump/children aliases
- `.claude/burrow/test/mongoose.test.cjs` - 24 new tests for render/archive functions, sampleTreeWithArchived/sampleTreeWithBody helpers
- `.claude/burrow/test/cli.test.cjs` - Rewrote get/list/children tests for render array output, added archive/unarchive/alias tests

## Decisions Made
- renderTree returns {breadcrumbs, cards} flat array (not nested) -- agents consume flat arrays more reliably
- depth default is 1 (show card + direct children); depth 0 = Infinity for full tree dump
- countActiveDescendants skips archived children AND their subtrees (not just the archived card itself)
- handleGet shared function eliminates code duplication across get/list/dump/children aliases
- list = get (root, depth 1); dump = get (root, depth 0); children = get (focused, depth 1)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- View layer and archive system complete for Phase 3 (Agent Interface) consumption
- renderTree provides the universal view that agent tools will call
- All CLI commands return structured JSON, ready for agent tool integration

---
*Phase: 02-views-and-features*
*Completed: 2026-03-08*

## Self-Check: PASSED

All 4 modified files verified present. All 3 commit hashes verified in git log.
