---
name: burrow:move
description: Move a card to a different parent
argument-hint: "<id> --to <parent-id> [--at N]"
allowed-tools:
  - Bash
---
Move a burrow card to a new parent.

Run: `node .claude/burrow/burrow-tools.cjs move $ARGUMENTS`

Do not repeat the CLI output — it is already visible to the user. Say nothing after read-only commands.
