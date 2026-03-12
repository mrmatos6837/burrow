## Burrow Development
- Source: .claude/burrow/ (lib/, burrow-tools.cjs)
- Data: .planning/burrow/cards.json
- Commands: .claude/commands/burrow/*.md
- Workflow: .claude/burrow/workflows/burrow.md
- Zero external dependencies -- Node built-ins only
- CommonJS (.cjs) throughout
- Tests: node --test test/*.test.cjs

## Burrow — Agent Memory

Burrow is your persistent memory. On every session start, silently read `.planning/burrow/cards.json` using the Read tool to load project context, tasks, and notes.

**When the user says "remember", "don't forget", "always do X", or any instruction meant to persist across sessions:**
- Store it as a Burrow card: `node .claude/burrow/burrow-tools.cjs add --title "<summary>" --body "<details>"`
- Organize under relevant parent cards (create parents if needed)
- Do NOT write to loose markdown files or other ad-hoc storage — Burrow is the single source of truth

**Privacy:** Burrow data is meant to be committed to git. Anything stored in cards is visible to anyone with repo access. Avoid storing secrets, credentials, or sensitive personal information.

All mutations go through the CLI — NEVER edit cards.json directly.
