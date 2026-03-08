---
phase: quick
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - CLAUDE.md
autonomous: true
requirements: []
must_haves:
  truths:
    - "Destructive burrow operations (delete, archive, move, edit) never execute without explicit user consent"
    - "CLAUDE.md is loaded automatically by Claude Code on every session"
    - "Read-only operations (get, dump, find, path) remain unrestricted"
  artifacts:
    - path: "CLAUDE.md"
      provides: "Project-level safeguard rules for burrow operations"
      contains: "NEVER run destructive burrow"
  key_links: []
---

<objective>
Create a CLAUDE.md file at the project root that prevents Claude from running destructive burrow operations (delete, archive, move, edit) without explicit user consent.

Purpose: The workflow file (.claude/burrow/workflows/burrow.md) already has invariants, but those only apply when the /burrow command is used. A CLAUDE.md safeguard ensures these rules apply globally -- even when Claude is operating autonomously or outside the /burrow command flow.
Output: CLAUDE.md at project root
</objective>

<context>
@.planning/STATE.md
@.claude/burrow/workflows/burrow.md
@.claude/commands/burrow/delete.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create CLAUDE.md with burrow safeguard rules</name>
  <files>CLAUDE.md</files>
  <action>
Create CLAUDE.md at the project root with the following content:

## Project overview
- Burrow: infinitely nestable card tool for AI agents
- Source: .claude/burrow/ (lib/, test/, burrow-tools.cjs)
- Data: .planning/burrow/cards.json
- Commands: .claude/commands/burrow/*.md
- Workflow: .claude/burrow/workflows/burrow.md

## Burrow safeguards

CRITICAL RULES -- these apply at ALL times, not just during /burrow commands:

1. NEVER run `delete`, `archive`, `move`, or `edit` on burrow cards without explicit user consent in the current conversation turn. "Explicit consent" means the user directly asked for that specific operation -- do not infer intent from general instructions.

2. Before any destructive operation, show what will be affected:
   - For delete: show the card and its descendant count
   - For archive: show the card title
   - For move: show source and destination
   - For edit: show the field being changed and old vs new value

3. NEVER batch-delete or batch-archive cards without listing each card and getting confirmation.

4. Read-only operations (get, dump, find, path) are always safe to run without confirmation.

5. The cards.json file (.planning/burrow/cards.json) must NEVER be edited directly. All mutations go through the CLI: `node .claude/burrow/burrow-tools.cjs <command>`.

6. NEVER modify burrow source files (.claude/burrow/**) as a side effect of other work. Changes to burrow code require explicit user request.

## Code conventions
- Zero external dependencies -- Node built-ins only
- CommonJS (.cjs) throughout
- Tests: node --test .claude/burrow/test/
  </action>
  <verify>
    <automated>test -f /Users/mrmatos6837/Projects/personal/burrow/CLAUDE.md && grep -q "NEVER run.*delete.*archive.*move.*edit" /Users/mrmatos6837/Projects/personal/burrow/CLAUDE.md && echo "PASS" || echo "FAIL"</automated>
  </verify>
  <done>CLAUDE.md exists at project root with destructive operation safeguards, direct-edit prohibition on cards.json, and source code protection rules</done>
</task>

</tasks>

<verification>
- CLAUDE.md exists at project root
- Contains explicit prohibition of destructive operations without consent
- Contains prohibition of direct cards.json editing
- Contains prohibition of burrow source modification without request
- Read-only operations are explicitly marked as safe
</verification>

<success_criteria>
CLAUDE.md is present and will be automatically loaded by Claude Code, enforcing destructive operation safeguards across all interaction modes.
</success_criteria>

<output>
No summary file needed for quick plans.
</output>
