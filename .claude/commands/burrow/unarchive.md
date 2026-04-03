---
name: burrow:unarchive
description: Restore archived card and descendants
argument-hint: "<id>"
allowed-tools:
  - Bash
---
Restore an archived burrow card.

Run: `node .claude/burrow/burrow-tools.cjs unarchive $ARGUMENTS`

Do not repeat the CLI output — it is already visible to the user. Say nothing after read-only commands.
