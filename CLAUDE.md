## Project overview
- Burrow: infinitely nestable card tool for AI agents
- Source: .claude/burrow/ (lib/, burrow-tools.cjs)
- Data: .planning/burrow/cards.json
- Commands: .claude/commands/burrow/*.md
- Workflow: .claude/burrow/workflows/burrow.md

## Burrow as agent memory

On every session start, silently read `.planning/burrow/cards.json` using the Read tool to load project context, tasks, and notes into your working memory. This is your persistent state — treat it like a briefing.

**When the user says "remember", "don't forget", "always do X", or any instruction meant to persist across sessions:**
- Store it as a Burrow card using the CLI: `node .claude/burrow/burrow-tools.cjs add --title "<summary>" --body "<details>"`
- Organize under relevant parent cards (create parents if needed for grouping)
- Do NOT write to loose markdown files, auto-memory, or other ad-hoc storage — Burrow is the single source of truth

**Root card body = project context.** If a root-level card has a body, read it for project description, conventions, or priorities the user has set.

**What to store in Burrow:**
- User preferences and conventions ("always use bun", "prefer snake_case")
- Recurring tasks, TODOs, ideas
- Project decisions and rationale
- Anything the user wants remembered across sessions

**What NOT to store:**
- Ephemeral session state (current debugging context, temp variables)
- Information already in CLAUDE.md (don't duplicate)

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
- Tests: node --test test/*.test.cjs
