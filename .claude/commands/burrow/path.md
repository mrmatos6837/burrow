---
name: burrow:path
description: Show ancestry from root to card
argument-hint: "<id>"
allowed-tools:
  - Bash
---
Show the ancestry path from root to a card.

Run: `node .claude/burrow/burrow-tools.cjs path $ARGUMENTS`

Do not repeat the CLI output — it is already visible to the user. Say nothing after read-only commands.
