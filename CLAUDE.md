## Burrow Development
- Source: .claude/burrow/ (lib/, burrow-tools.cjs)
- Data: .planning/burrow/cards.json
- Commands: .claude/commands/burrow/*.md
- Workflow: .claude/burrow/workflows/burrow.md
- Zero external dependencies -- Node built-ins only
- CommonJS (.cjs) throughout
- Tests: node --test test/*.test.cjs

<!-- Agent instructions for Burrow. User docs: /burrow:help or https://www.npmjs.com/package/create-burrow -->
## Burrow — Agent Memory

Persistent card storage across sessions. All operations use the CLI (`burrow` below = `node .claude/burrow/burrow-tools.cjs`).

**Session start:** Silently run `burrow load`. It returns a JSON envelope with card data, mode (full or index), and a list of all available commands. In index mode, fetch bodies on demand with `burrow read <id> --full`.

**Auto-save:** When the user says "remember", "don't forget", "always do X", "note this", "save this", "keep track of", "burrow this", or similar intent to persist information — run `burrow add --title "<summary>" --body "<details>"` and organize under relevant parents.

**Rules:** Data is committed to git — no secrets or credentials. Never edit cards.json directly; all mutations go through the CLI.
