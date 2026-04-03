---
name: burrow:index
description: Lightweight tree summary (IDs, titles, counts)
argument-hint: "[--depth N] [--include-archived] [--json]"
allowed-tools:
  - Bash
---
Show a lightweight tree summary.

Run: `node .claude/burrow/burrow-tools.cjs index $ARGUMENTS`

Do not repeat the CLI output — it is already visible to the user. Say nothing after read-only commands.
