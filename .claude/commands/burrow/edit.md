---
name: burrow:edit
description: Edit a card's title or body
argument-hint: "<id> [--title \"new title\"] [--body \"new body\"]"
allowed-tools:
  - Bash
---
Edit a burrow card with the given flags.

Run: `node .claude/burrow/burrow-tools.cjs edit $ARGUMENTS`

Do not repeat the CLI output — it is already visible to the user. Say nothing after read-only commands.
