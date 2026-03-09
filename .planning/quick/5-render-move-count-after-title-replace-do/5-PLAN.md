---
phase: quick-5
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .claude/burrow/lib/render.cjs
  - .claude/burrow/test/render.test.cjs
autonomous: true
requirements: [QUICK-5]

must_haves:
  truths:
    - "Count (N) appears immediately after title, not at the right edge"
    - "Count is hidden when descendant count is 0"
    - "Body indicator is ellipsis character, not dot"
    - "Indicator order is: title, count, ellipsis, [archived], time"
  artifacts:
    - path: ".claude/burrow/lib/render.cjs"
      provides: "Updated formatCardLine with new indicator ordering"
      contains: "\\u2026"
    - path: ".claude/burrow/test/render.test.cjs"
      provides: "Tests for all five format combos"
  key_links:
    - from: ".claude/burrow/lib/render.cjs"
      to: "formatCardLine"
      via: "indicator ordering logic"
      pattern: "countStr.*bodyMarker.*archivedLabel"
---

<objective>
Change the tree line format in formatCardLine to: move descendant count right after title (hidden when 0), replace dot body indicator with ellipsis, reorder indicators to title -> count -> ellipsis -> [archived] -> time.

Purpose: Cleaner card lines -- count next to title is more scannable, ellipsis better signals "there's more", hiding (0) reduces noise.
Output: Updated render.cjs and passing tests covering all five indicator combos.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.claude/burrow/lib/render.cjs
@.claude/burrow/test/render.test.cjs
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Update tests for new tree line format</name>
  <files>.claude/burrow/test/render.test.cjs</files>
  <behavior>
    - "Title (6) ..." — card with 6 descendants and body shows count after title and ellipsis
    - "Title (1)" — card with 1 descendant and no body shows count only, no ellipsis
    - "Title ..." — card with 0 descendants and body shows ellipsis only, no count
    - "Title" — card with 0 descendants and no body shows title only
    - "Title (25) ... [archived]" — card with all indicators shows correct order
    - Existing tests that assert (0) count must be updated to expect no count for leaves
    - Existing tests that check for dot marker (U+2022) must be updated to check for ellipsis (U+2026)
  </behavior>
  <action>
Update render.test.cjs:

1. Replace the "shows consistent count column with (0) for leaves" test. The new behavior is: card with 1 descendant shows "(1)", leaf card with 0 descendants does NOT show "(0)". Update assertions accordingly.

2. Replace the "shows body dot marker for children with body" test. Change the assertion from checking for dot U+2022 to checking for ellipsis U+2026. The ellipsis character is already used elsewhere in the codebase (truncation) so check that the line with "Root cause" (which has a body) contains the ellipsis.

3. Add a new describe block "formatCardLine indicator ordering" with five test cases matching the five combos from the spec:
   - "renders count + body: Title (N) ..." — Create a card with descendants and body, verify line contains title followed by "(N)" followed by "..."
   - "renders count only: Title (N)" — Card with descendants, no body. Line has "(N)" but no "..."
   - "renders body only: Title ..." — Card with 0 descendants, has body. No count shown, has "..."
   - "renders neither: Title" — Leaf card, no body. No count, no "..."
   - "renders all indicators: Title (N) ... [archived]" — Archived card with descendants and body. Verify order: title, then "(N)", then "...", then "[archived]", then age string

For each test, use renderCard with a parent card containing the test child, extract the child's line from the output, and assert indicator presence/absence and ordering using indexOf comparisons.

Note: The ellipsis body indicator is the literal character U+2026 (same as truncation ellipsis). In the line, it appears as " ..." (space + ellipsis). To disambiguate from truncation ellipsis when testing, check the specific line for the child card by finding the line containing the child's ID.
  </action>
  <verify>
    <automated>node --test .claude/burrow/test/render.test.cjs 2>&1 | tail -5</automated>
  </verify>
  <done>All new indicator ordering tests exist and fail (RED phase). Existing tests updated to match new expected format.</done>
</task>

<task type="auto">
  <name>Task 2: Rewrite formatCardLine indicator ordering in render.cjs</name>
  <files>.claude/burrow/lib/render.cjs</files>
  <action>
Modify `formatCardLine` in render.cjs to implement the new indicator order: title -> count -> ellipsis -> [archived] -> time.

Specific changes:

1. Replace `DOT` usage with ellipsis. Change the body marker from ` ${DOT}` to ` \u2026` (the ellipsis character). The DOT constant can remain for other uses but is no longer used in formatCardLine.

2. Hide count when 0. Change the countStr logic:
   - Old: `const countStr = '  (${descCount})';` (always shown)
   - New: `const countStr = descCount > 0 ? ' (${descCount})' : '';` (hidden when 0, single space prefix instead of double)

3. Reorder indicators in the line assembly. The new left-side content order is:
   `prefix + space + id + space + title + countStr + bodyMarker + archivedLabel`

   And the right side is just the age string (no count).

4. Update the padding/right-alignment logic:
   - Old rightSide: `${age}${countStr}` — remove countStr from here
   - New rightSide: `${age}` — just the age
   - Old rightFixedParts: `${bodyMarker}${archivedLabel}  ${rightSide}`
   - New rightFixedParts: `${countStr}${bodyMarker}${archivedLabel}  ${rightSide}`
   - The leftContent assembly: `${leftFixedParts}${title}${countStr}${bodyMarker}${archivedLabel}`
   - Padding calculation: `tw - leftContent.length - 2 - rightSide.length` (same logic, just rightSide is now age only)

The full rewritten function:
```javascript
function formatCardLine(card, prefix, termWidth) {
  const tw = termWidth || 80;
  const id = `[${card.id}]`;
  const hasBody = card.hasBody !== undefined ? card.hasBody : !!(card.body && card.body.trim());
  const bodyMarker = hasBody ? ' \u2026' : '';
  const age = formatAge(card.created);
  const descCount = card.descendantCount !== undefined
    ? card.descendantCount
    : countActiveDescendants(card);
  const countStr = descCount > 0 ? ` (${descCount})` : '';
  const archivedLabel = card.archived ? ' [archived]' : '';

  // Left side without title: prefix + space + id + space
  const leftFixedParts = `  ${prefix} ${id} `;
  // Right side: just age
  const rightSide = age;
  // Indicators after title
  const indicators = `${countStr}${bodyMarker}${archivedLabel}`;

  // Available space for title
  const availableForTitle = tw - leftFixedParts.length - indicators.length - 2 - rightSide.length;
  const title = availableForTitle > 0 ? truncate(card.title, availableForTitle) : card.title;

  // Pad middle to right-align age
  const leftContent = `${leftFixedParts}${title}${indicators}`;
  const totalContentLen = leftContent.length + 2 + rightSide.length;
  const padding = Math.max(1, tw - totalContentLen);

  return `${leftContent}${' '.repeat(padding)}${rightSide}`;
}
```
  </action>
  <verify>
    <automated>node --test .claude/burrow/test/render.test.cjs 2>&1 | tail -5</automated>
  </verify>
  <done>All tests pass. Tree lines show: title -> count (hidden when 0) -> ellipsis (replaces dot) -> [archived] -> right-aligned age. The five combos render correctly: "Title (6) ...", "Title (1)", "Title ...", "Title", "Title (25) ... [archived]".</done>
</task>

</tasks>

<verification>
node --test .claude/burrow/test/render.test.cjs
</verification>

<success_criteria>
- formatCardLine produces lines in the new format: title (count) ellipsis [archived] ... age
- Count hidden when 0, shown when > 0
- Ellipsis replaces dot as body indicator
- All five indicator combos render correctly
- All existing render tests pass (updated for new format)
</success_criteria>

<output>
After completion, create `.planning/quick/5-render-move-count-after-title-replace-do/5-SUMMARY.md`
</output>
