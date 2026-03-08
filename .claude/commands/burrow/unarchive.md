---
name: burrow:unarchive
description: Restore an archived card and its descendants
argument-hint: "<id>"
allowed-tools:
  - Bash
---
Unarchive a burrow card.

Run: `node .claude/burrow/burrow-tools.cjs unarchive $ARGUMENTS`

Do not repeat the CLI output — it is already visible to the user. Say nothing after read-only commands.
