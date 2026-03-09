---
phase: quick
plan: 2
type: execute
wave: 1
depends_on: []
files_modified:
  - .claude/burrow/lib/mongoose.cjs
  - .claude/burrow/burrow-tools.cjs
  - .claude/burrow/test/mongoose.test.cjs
  - .claude/burrow/test/cli.test.cjs
autonomous: true
requirements: []

must_haves:
  truths:
    - "add --at <N> inserts card at position N among siblings instead of appending"
    - "move <id> --at <N> reorders card within its current parent without --to"
    - "move <id> --to <parent> --at <N> places card at position N in destination"
    - "Omitting --at preserves current append-to-end behavior for both commands"
    - "Position exceeding array length appends to end (no error)"
  artifacts:
    - path: ".claude/burrow/lib/mongoose.cjs"
      provides: "addCard with optional position parameter"
      contains: "requestedPosition"
    - path: ".claude/burrow/burrow-tools.cjs"
      provides: "CLI --at flag parsing for add and move"
      contains: "at:"
    - path: ".claude/burrow/test/mongoose.test.cjs"
      provides: "Unit tests for addCard position insertion"
    - path: ".claude/burrow/test/cli.test.cjs"
      provides: "CLI integration tests for --at flag"
  key_links:
    - from: ".claude/burrow/burrow-tools.cjs"
      to: ".claude/burrow/lib/mongoose.cjs"
      via: "addCard position param and moveCard requestedPosition param"
      pattern: "tree\\.addCard.*position|tree\\.moveCard.*position"
---

<objective>
Add --at flag for position-based insertion/reordering on `add` and `move` CLI commands.

Purpose: Allow agents and users to control card ordering precisely instead of always appending to end.
Output: Updated mongoose.cjs (addCard with position), updated CLI (--at parsing for add/move), tests for both.
</objective>

<context>
@.claude/burrow/lib/mongoose.cjs
@.claude/burrow/burrow-tools.cjs
@.claude/burrow/test/mongoose.test.cjs
@.claude/burrow/test/cli.test.cjs
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add position support to addCard and wire --at in CLI</name>
  <files>.claude/burrow/lib/mongoose.cjs, .claude/burrow/burrow-tools.cjs, .claude/burrow/test/mongoose.test.cjs, .claude/burrow/test/cli.test.cjs</files>
  <behavior>
    mongoose.cjs addCard:
    - Test: addCard with position 0 inserts at beginning of container (existing cards shift right)
    - Test: addCard with position 1 inserts at index 1 among 3 existing siblings
    - Test: addCard with position exceeding length appends to end (same as no position)
    - Test: addCard with no position appends to end (backward compat)

    CLI move --at (reorder within parent, no --to):
    - Test: `move <id> --at 0` moves card to first position among its current siblings
    - Test: `move <id> --to <parent> --at 1` places card at index 1 in destination

    CLI add --at:
    - Test: `add --title "X" --parent <id> --at 0` inserts at beginning of parent's children
    - Test: `add --title "X"` with no --at appends to root (backward compat)
  </behavior>
  <action>
    1. In mongoose.cjs `addCard` function:
       - Add `position` to the destructured opts: `{ title, parentId, body, position }`
       - Replace `container.push(card)` with position-aware insertion:
         ```
         if (position != null && position < container.length) {
           container.splice(position, 0, card);
         } else {
           container.push(card);
         }
         ```
       - Note: moveCard already handles requestedPosition via splice -- no changes needed there.

    2. In burrow-tools.cjs `add` case:
       - Add `at: { type: 'string' }` to parseArgs options
       - Parse position: `const position = values.at !== undefined ? parseInt(values.at, 10) : undefined`
       - Pass to addCard: `position` in the opts object

    3. In burrow-tools.cjs `move` case:
       - Add `at: { type: 'string' }` to parseArgs options
       - Parse position: `const position = values.at !== undefined ? parseInt(values.at, 10) : undefined`
       - Handle reorder-in-place (--at without --to): when `rawParent === undefined` AND `values.at !== undefined`, find the card's current parent and use that as newParentId
       - Pass position as 4th arg to `tree.moveCard(data, id, newParentId, position)`

    4. Write tests in mongoose.test.cjs under the existing `addCard` describe block:
       - addCard at position 0, position mid, position beyond length, no position

    5. Write tests in cli.test.cjs:
       - `move <id> --at 0` reorder within current parent
       - `move <id> --to <parent> --at 1` position in new parent
       - `add --title X --parent <id> --at 0` insert at position
  </action>
  <verify>
    <automated>cd /Users/mrmatos6837/Projects/personal/burrow && node --test .claude/burrow/test/mongoose.test.cjs .claude/burrow/test/cli.test.cjs</automated>
  </verify>
  <done>
    - addCard accepts optional position parameter and inserts at that index
    - CLI `add --at N` passes position to addCard
    - CLI `move <id> --at N` reorders within current parent (no --to needed)
    - CLI `move <id> --to <parent> --at N` places at position in destination
    - Position beyond array length appends (no error)
    - Omitting --at preserves append-to-end behavior
    - All existing tests still pass, new tests cover all behaviors
  </done>
</task>

</tasks>

<verification>
```bash
cd /Users/mrmatos6837/Projects/personal/burrow && node --test .claude/burrow/test/
```
All tests pass including new --at flag tests.

Manual smoke test:
```bash
cd /Users/mrmatos6837/Projects/personal/burrow
node .claude/burrow/burrow-tools.cjs add --title "First"
node .claude/burrow/burrow-tools.cjs add --title "Inserted at 0" --at 0
node .claude/burrow/burrow-tools.cjs read
# "Inserted at 0" should appear before "First"
```
</verification>

<success_criteria>
- `node --test .claude/burrow/test/` passes with 0 failures
- `add --at 0` inserts at beginning, not end
- `move <id> --at 0` reorders to first position
- `move <id> --to <parent> --at 1` places at index 1 in destination
- No --at flag = append to end (backward compatible)
</success_criteria>

<output>
After completion, create `.planning/quick/2-add-at-flag-for-position-based-reorderin/2-SUMMARY.md`
</output>
