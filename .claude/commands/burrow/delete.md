---
name: burrow:delete
description: Delete a card and its descendants
argument-hint: "<id>"
allowed-tools:
  - Bash
---
Ask the user to confirm before running the delete command. Show what will be deleted by running `node .claude/burrow/burrow-tools.cjs get <id>` first.

After confirmation, run: `node .claude/burrow/burrow-tools.cjs delete $ARGUMENTS`

Output the CLI result directly. Do not reformat or wrap in code blocks.
