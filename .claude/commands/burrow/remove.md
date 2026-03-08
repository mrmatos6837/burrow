---
name: burrow:remove
description: Delete a card and its descendants
argument-hint: "<id>"
allowed-tools:
  - Bash
---
Ask the user to confirm before running the remove command. Show what will be removed by running `node .claude/burrow/burrow-tools.cjs read <id>` first.

After confirmation, run: `node .claude/burrow/burrow-tools.cjs remove $ARGUMENTS`

Do not repeat the CLI output — it is already visible to the user. Say nothing after read-only commands.
