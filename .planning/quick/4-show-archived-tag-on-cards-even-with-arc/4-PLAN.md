---
phase: quick
plan: 4
type: execute
wave: 1
depends_on: []
files_modified:
  - .claude/burrow/lib/render.cjs
  - .claude/burrow/test/render.test.cjs
autonomous: true
requirements: [QUICK-4]
must_haves:
  truths:
    - "Archived cards always display [archived] tag regardless of filter mode (active, include-archived, archived-only)"
    - "The [archived] tag renders consistently in all display contexts (card detail, tree children, dump)"
  artifacts:
    - path: ".claude/burrow/lib/render.cjs"
      provides: "Rendering logic that always shows [archived] on archived cards"
      contains: "archivedLabel"
    - path: ".claude/burrow/test/render.test.cjs"
      provides: "Tests verifying [archived] tag appears in all filter modes"
  key_links:
    - from: ".claude/burrow/lib/render.cjs"
      to: "formatCardLine"
      via: "showArchived parameter controls tag visibility"
      pattern: "archivedLabel.*archived"
---

<objective>
Fix bug where [archived] tag may not display on archived cards in certain filter modes.

Purpose: Archived cards should always be visually marked as [archived] regardless of which archive filter is active (--archived-only, --include-archived, or default active view).
Output: Updated render.cjs with consistent [archived] tag behavior and test coverage.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.claude/burrow/lib/render.cjs
@.claude/burrow/test/render.test.cjs
@.claude/burrow/burrow-tools.cjs (CLI wiring for archiveFilter)

<interfaces>
From .claude/burrow/lib/render.cjs:
```javascript
// formatCardLine receives showArchived boolean to control [archived] tag
function formatCardLine(card, prefix, termWidth, showArchived)
// Line 108: const archivedLabel = (showArchived && card.archived) ? ' [archived]' : '';

// renderCard computes showArchivedLabel from archiveFilter
// Line 210: const showArchivedLabel = filter === 'include-archived' || filter === 'archived-only';

// renderCard signature
function renderCard(card, breadcrumbs, opts)  // opts: {full, termWidth, archiveFilter}
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Always show [archived] tag on archived cards in tree listings</name>
  <files>.claude/burrow/lib/render.cjs, .claude/burrow/test/render.test.cjs</files>
  <behavior>
    - Test: When archiveFilter is 'archived-only', archived children display [archived] tag
    - Test: When archiveFilter is 'include-archived', archived children display [archived] tag
    - Test: When archiveFilter is 'active' (default), no archived children are shown (filtered out, so tag irrelevant)
    - Test: Verify the tag appears on card lines by checking formatCardLine output directly or via renderCard
  </behavior>
  <action>
    1. Investigate the actual rendering flow: trace from CLI `read --archived-only` through burrow-tools.cjs to renderCard to renderTreeLines to formatCardLine
    2. The current logic on line 210 of render.cjs sets `showArchivedLabel` based on filter mode. If this is already correct, look for other paths where the tag might be suppressed (e.g., dump command, renderTree in mongoose.cjs, or JSON output mode)
    3. Key fix area: In `renderCard`, line 210 computes `showArchivedLabel = filter === 'include-archived' || filter === 'archived-only'`. Consider changing to always pass `true` for showArchived since archived cards should always be tagged -- the filter only controls which cards appear, not whether the tag shows
    4. Simpler approach: change line 108 to always show [archived] when card.archived is true, removing the showArchived gate entirely: `const archivedLabel = card.archived ? ' [archived]' : '';`
    5. If taking approach 4, also remove the showArchived parameter from formatCardLine and renderTreeLines signatures (and the showArchivedLabel computation in renderCard)
    6. Update or add tests to cover: renderCard with archiveFilter='archived-only' shows [archived], renderCard with archiveFilter='include-archived' shows [archived] on archived cards but not active cards
    7. Run full test suite to confirm no regressions
  </action>
  <verify>
    <automated>node --test .claude/burrow/test/render.test.cjs</automated>
  </verify>
  <done>
    - [archived] tag always appears on archived cards in tree listings regardless of filter mode
    - Tests pass confirming the tag behavior
    - No regressions in existing test suite
  </done>
</task>

</tasks>

<verification>
- `node --test .claude/burrow/test/` -- all tests pass
- `node .claude/burrow/burrow-tools.cjs read --archived-only` shows [archived] tags
- `node .claude/burrow/burrow-tools.cjs dump --archived-only` shows [archived] tags
</verification>

<success_criteria>
Archived cards always display [archived] tag in tree listings regardless of which archive filter mode is active.
</success_criteria>

<output>
After completion, create `.planning/quick/4-show-archived-tag-on-cards-even-with-arc/4-SUMMARY.md`
</output>
