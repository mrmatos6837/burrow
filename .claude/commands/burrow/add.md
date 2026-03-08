---
name: burrow:add
description: Add a new card to burrow
argument-hint: "--title \"card title\" [--parent <id>] [--body \"content\"]"
allowed-tools:
  - Bash
---
Add a card to burrow with the given flags.

Run: `node .claude/burrow/burrow-tools.cjs add $ARGUMENTS`

Output the CLI result directly. Do not reformat or wrap in code blocks.
