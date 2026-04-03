---
name: burrow:read
description: View a card (default depth 1)
argument-hint: "[<id>] [--depth N] [--full] [--include-archived] [--archived-only]"
allowed-tools:
  - Bash
---
Show burrow cards. With no arguments, shows root at depth 1.

Run: `node .claude/burrow/burrow-tools.cjs read $ARGUMENTS`

Do not repeat the CLI output — it is already visible to the user. Say nothing after read-only commands.
