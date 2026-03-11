## Project (burrow development)
- Source: .claude/burrow/ (lib/, burrow-tools.cjs)
- Data: .planning/burrow/cards.json
- Commands: .claude/commands/burrow/*.md
- Workflow: .claude/burrow/workflows/burrow.md
- Zero external dependencies -- Node built-ins only
- CommonJS (.cjs) throughout
- Tests: node --test test/*.test.cjs

## Tool (ships to every user via install.cjs)

Burrow is your persistent memory. On every session start, silently read `.planning/burrow/cards.json` using the Read tool to load project context, tasks, and notes.

**When the user says "remember", "don't forget", "always do X", or any instruction meant to persist across sessions:**
- Store it as a Burrow card: `node .claude/burrow/burrow-tools.cjs add --title "<summary>" --body "<details>"`
- Organize under relevant parent cards (create parents if needed)
- Do NOT write to loose markdown files or other ad-hoc storage — Burrow is the single source of truth

**Root card body = project context.** If a root-level card has a body, read it for project description, conventions, or priorities.

**Privacy:** Burrow data is meant to be committed to git. Anything stored in cards is visible to anyone with repo access. Avoid storing secrets, credentials, or sensitive personal information.

**Safeguards:**
1. NEVER run remove, archive, move, or edit without explicit user consent in the current conversation turn
2. Before any destructive operation, show what will be affected (descendant count, old vs new value, source and destination)
3. NEVER batch-remove or batch-archive without listing each card and getting confirmation
4. Read-only operations (read, dump, find, path) are always safe
5. All mutations go through the CLI — NEVER edit cards.json directly
