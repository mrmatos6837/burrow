---
name: burrow:add
description: Create a card
argument-hint: "--title "card title" [--parent <id>] [--body "content"]"
allowed-tools:
  - Bash
---
Add a card to burrow with the given flags.

Run: `node .claude/burrow/burrow-tools.cjs add $ARGUMENTS`

Do not repeat the CLI output — it is already visible to the user. Say nothing after read-only commands.
