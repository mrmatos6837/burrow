---
name: burrow:edit
description: Edit a card's title or body
argument-hint: "<id> [--title \"new title\"] [--body \"new body\"]"
allowed-tools:
  - Bash
---
Edit a burrow card with the given flags.

Run: `node .claude/burrow/burrow-tools.cjs edit $ARGUMENTS`

Output the CLI result directly. Do not reformat or wrap in code blocks.
