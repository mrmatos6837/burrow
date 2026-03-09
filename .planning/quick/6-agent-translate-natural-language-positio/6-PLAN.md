---
phase: quick-6
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .claude/burrow/workflows/burrow.md
autonomous: true
requirements: []
must_haves:
  truths:
    - "Workflow file instructs agent to translate 'first'/'second'/'top'/'last' to 0-based --at values"
    - "Command reference table includes --at flag for add and move commands"
  artifacts:
    - path: ".claude/burrow/workflows/burrow.md"
      provides: "Position translation guidance and updated command reference"
      contains: "--at"
  key_links: []
---

<objective>
Update the burrow workflow file to teach the agent how to translate natural language
position references into 0-based --at index values for add and move CLI commands.

Purpose: The --at flag uses 0-based indexing. Users say "make it first" or "position 3"
but the CLI needs --at 0 or --at 2. The workflow layer handles this mapping.

Output: Updated .claude/burrow/workflows/burrow.md with position translation section
and updated command reference.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.claude/burrow/workflows/burrow.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add position translation section and update command reference in workflow</name>
  <files>.claude/burrow/workflows/burrow.md</files>
  <action>
Two changes to the workflow file:

1. Update the Command Reference table to include --at flag:
   - `add` row: change usage to `add --title "..." [--parent id] [--body "..."] [--at N]` and note "Create a card. --at N places at 0-based position."
   - `move` row: change usage to `move id --to parent-id [--at N]` and note "Move card. --at N places at 0-based position. Omit --to to reorder within current parent."

2. Add a new section "## Position Translation" AFTER the "## Command Reference" section and BEFORE "## Rendering Rules". This section teaches the agent the mapping:

```
## Position Translation

The --at flag uses 0-based indexing. When users reference positions in natural language,
translate to 0-based index before constructing the CLI command.

| User says | --at value | Rule |
|-----------|------------|------|
| "first", "top", "beginning" | --at 0 | Always 0 |
| "second" | --at 1 | Ordinal minus 1 |
| "third" | --at 2 | Ordinal minus 1 |
| "position N" / "slot N" | --at (N-1) | Human position minus 1 |
| "last", "end", "bottom" | omit --at | Default append behavior |
| "before card X" | --at (index of X) | Look up X's current index |
| "after card X" | --at (index of X + 1) | Look up X's current index, add 1 |

The agent resolves positions during THINK (Step 2) by inspecting the in-memory tree
to find the target container's children array and computing the correct index.
```

Add a worked example as Example 8 at the end of the Worked Examples section:

```
### Example 8: Position-based insertion

**User:** `/burrow add "Urgent fix" under bugs, make it first`

**Agent behavior:**
1. LOAD: Read `.planning/burrow/cards.json` using the Read tool (silent).
2. THINK: Match "bugs" -> `a1b2c3d4` "Bugs". "First" -> --at 0.
3. EXECUTE: Run `node .claude/burrow/burrow-tools.cjs add --title "Urgent fix" --parent a1b2c3d4 --at 0`. Then re-LOAD.
```
  </action>
  <verify>
    <automated>grep -c "\-\-at" .claude/burrow/workflows/burrow.md | xargs test 5 -le</automated>
  </verify>
  <done>Workflow file contains position translation table, updated command reference with --at flag, and a worked example demonstrating position-based insertion</done>
</task>

</tasks>

<verification>
- grep "--at" .claude/burrow/workflows/burrow.md shows multiple matches
- "Position Translation" section heading exists in the file
- Command reference table shows --at for add and move
- Example 8 exists with position-based insertion
</verification>

<success_criteria>
The workflow file teaches agents to translate natural language positions (first, second, top, last, position N, before/after X) into 0-based --at index values. No CLI code changes needed.
</success_criteria>

<output>
After completion, create `.planning/quick/6-agent-translate-natural-language-positio/6-SUMMARY.md`
</output>
