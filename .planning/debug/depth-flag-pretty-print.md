---
status: diagnosed
trigger: "--depth flag doesn't affect pretty-print output"
created: 2026-03-08T00:00:00.000Z
updated: 2026-03-08T00:00:00.000Z
---

## Current Focus

hypothesis: Two independent bugs combine to make --depth useless in pretty-print
test: Code reading and tracing the data flow
expecting: Confirmed via code analysis
next_action: Return structured diagnosis

## Symptoms

expected: `burrow get <id> --depth 3` shows children expanded to 3 levels deep
actual: Only shows immediate children (depth 1), same as without the flag
errors: None - just wrong output
reproduction: `node .claude/burrow/burrow-tools.cjs get <id> --depth 3` with deeply nested cards
started: Always broken (feature never worked for pretty-print)

## Eliminated

(none needed - root cause found on first pass)

## Evidence

- timestamp: 2026-03-08
  checked: burrow-tools.cjs get command, lines 250-327
  found: TWO independent bugs causing this
  implication: See Resolution

- timestamp: 2026-03-08
  checked: burrow-tools.cjs line 292
  found: "const childCards = treeResult.cards.filter((c) => c.depth === 1)" - only extracts depth-1 entries from renderTree flat array, discarding all deeper entries
  implication: Even though renderTree returns entries at depth 2, 3, etc., they are thrown away

- timestamp: 2026-03-08
  checked: render.cjs renderCard function, lines 151-224
  found: renderCard only iterates card.children (one level) - it has no recursive rendering logic
  implication: Even if deeper children were passed in, renderCard has no code to display them as a nested tree

- timestamp: 2026-03-08
  checked: mongoose.cjs renderTree, lines 279-338
  found: renderTree correctly respects depth and returns flat array with depth field - this part works fine
  implication: The data layer is correct; the bug is entirely in the CLI router and render layer

## Resolution

root_cause: |
  Two bugs work together:

  BUG 1 (burrow-tools.cjs:292): The get command filters renderTree results to only
  depth===1 entries: `treeResult.cards.filter((c) => c.depth === 1)`. This discards
  all entries at depth 2+ that renderTree correctly returns. The depth flag works
  in the data layer but the router throws away the deeper results.

  BUG 2 (render.cjs:197-200): renderCard only renders one level of children using a
  flat loop. It has no recursive tree-rendering logic. Even if bug 1 were fixed and
  nested data were passed, renderCard would not render children-of-children as an
  indented tree.

  The data layer (mongoose.cjs renderTree) works correctly - it respects depth and
  returns entries at all requested depths. The bugs are purely in the presentation layer.

fix: (not applied - diagnosis only)
verification: (not applied)
files_changed: []
