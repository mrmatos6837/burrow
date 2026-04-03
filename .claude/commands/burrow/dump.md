---
name: burrow:dump
description: Show full tree (alias for read --depth 0)
argument-hint: ""
allowed-tools:
  - Bash
---
Show the full burrow tree at all depths.

Run: `node .claude/burrow/burrow-tools.cjs dump $ARGUMENTS`

Do not repeat the CLI output — it is already visible to the user. Say nothing after read-only commands.
