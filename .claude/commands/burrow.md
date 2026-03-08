---
name: burrow
description: Interact with Burrow using natural language -- add, view, move, archive cards
argument-hint: "[card-id] [natural language request]"
allowed-tools:
  - Bash
  - Read
---
<execution_context>
@./.claude/burrow/workflows/burrow.md
</execution_context>

<context>
User request: $ARGUMENTS
CLI path: node .claude/burrow/burrow-tools.cjs
</context>
