## Project overview
- Burrow: infinitely nestable card tool for AI agents
- Source: .claude/burrow/ (lib/, test/, burrow-tools.cjs)
- Data: .planning/burrow/cards.json
- Commands: .claude/commands/burrow/*.md
- Workflow: .claude/burrow/workflows/burrow.md

## Burrow safeguards

CRITICAL RULES -- these apply at ALL times, not just during /burrow commands:

1. NEVER run `remove`, `archive`, `move`, or `edit` on burrow cards without explicit user consent in the current conversation turn. "Explicit consent" means the user directly asked for that specific operation -- do not infer intent from general instructions.

2. Before any destructive operation, show what will be affected:
   - For remove: show the card and its descendant count
   - For archive: show the card title
   - For move: show source and destination
   - For edit: show the field being changed and old vs new value

3. NEVER batch-remove or batch-archive cards without listing each card and getting confirmation.

4. Read-only operations (read, dump, find, path) are always safe to run without confirmation.

5. The cards.json file (.planning/burrow/cards.json) must NEVER be edited directly. All mutations go through the CLI: `node .claude/burrow/burrow-tools.cjs <command>`.

6. NEVER modify burrow source files (.claude/burrow/**) as a side effect of other work. Changes to burrow code require explicit user request.

## Code conventions
- Zero external dependencies -- Node built-ins only
- CommonJS (.cjs) throughout
- Tests: node --test .claude/burrow/test/
