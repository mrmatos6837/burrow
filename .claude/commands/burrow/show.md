---
name: burrow:show
description: View cards in burrow
argument-hint: "[<id>] [--depth N] [--full] [--include-archived] [--archived-only]"
allowed-tools:
  - Bash
---
Show burrow cards. With no arguments, shows root at depth 1.

Run: `node .claude/burrow/burrow-tools.cjs get $ARGUMENTS`

Output the CLI result directly. Do not reformat or wrap in code blocks.
