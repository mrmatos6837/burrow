---
phase: quick
plan: 3
type: execute
wave: 1
depends_on: []
files_modified:
  - .claude/burrow/burrow-tools.cjs
  - .claude/burrow/test/cli.test.cjs
autonomous: true
requirements: []
must_haves:
  truths:
    - "Running `dump` without --full shows full card bodies (no truncation)"
    - "Running `dump --full` still works (no-op, already full)"
  artifacts:
    - path: ".claude/burrow/burrow-tools.cjs"
      provides: "dump command with full: true default"
      contains: "full: true"
    - path: ".claude/burrow/test/cli.test.cjs"
      provides: "test confirming dump shows full bodies"
  key_links:
    - from: ".claude/burrow/burrow-tools.cjs"
      to: ".claude/burrow/lib/render.cjs"
      via: "renderCard opts.full"
      pattern: "full.*true"
---

<objective>
Make the `dump` command always show full card bodies by defaulting `full: true`.

Purpose: `dump` is meant to be the "show me everything" command. Truncating bodies defeats its purpose.
Output: Updated CLI and test confirming full body display.
</objective>

<context>
@.claude/burrow/burrow-tools.cjs
@.claude/burrow/lib/render.cjs
@.claude/burrow/test/cli.test.cjs
</context>

<tasks>

<task type="auto">
  <name>Task 1: Default dump to full:true and add test</name>
  <files>.claude/burrow/burrow-tools.cjs, .claude/burrow/test/cli.test.cjs</files>
  <action>
In `.claude/burrow/burrow-tools.cjs`, line 353: change `full: { type: 'boolean', default: false }` to `full: { type: 'boolean', default: true }` inside the `dump` case's `parseArgs` options.

No other changes needed in the CLI -- the `full` value is already passed through to `renderCard` on line 380 via `full: values.full`.

In `.claude/burrow/test/cli.test.cjs`, add a test inside the existing `describe('dump')` block that verifies dump shows full body content without truncation:
1. Create a card with a body longer than 200 characters (the BODY_TRUNCATE_LENGTH constant in render.cjs)
2. Run `dump` (no --full flag)
3. Assert the full body appears in output (not truncated)
4. Assert the output does NOT contain the truncation marker "(truncated"
  </action>
  <verify>
    <automated>node --test .claude/burrow/test/cli.test.cjs 2>&1 | tail -5</automated>
  </verify>
  <done>dump command shows full card bodies by default; test passes confirming no truncation without --full flag</done>
</task>

</tasks>

<verification>
node --test .claude/burrow/test/cli.test.cjs
</verification>

<success_criteria>
- `node .claude/burrow/burrow-tools.cjs dump` shows full card bodies (no truncation marker)
- All existing CLI tests still pass
- New test explicitly verifies dump does not truncate bodies
</success_criteria>

<output>
After completion, create `.planning/quick/3-make-dump-command-always-use-full-depth-/3-SUMMARY.md`
</output>
