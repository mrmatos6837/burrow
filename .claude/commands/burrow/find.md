---
name: burrow:find
description: Search cards by title
argument-hint: "<query>"
allowed-tools:
  - Bash
---
Search card titles for the given query.

Run: `node .claude/burrow/burrow-tools.cjs find $ARGUMENTS`

Do not repeat the CLI output — it is already visible to the user. Say nothing after read-only commands.
