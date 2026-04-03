---
name: burrow:index
description: Show lightweight tree index
argument-hint: "[--depth N] [--include-archived] [--json]"
allowed-tools:
  - Bash
---
Show a lightweight tree index (IDs, titles, child counts).

Run: `node .claude/burrow/burrow-tools.cjs index $ARGUMENTS`

Do not repeat the CLI output — it is already visible to the user. Say nothing after read-only commands.
