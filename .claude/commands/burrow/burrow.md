---
name: burrow
description: Interact with Burrow using natural language -- add, view, move, archive cards
argument-hint: "[natural language request, or empty for root view]"
allowed-tools:
  - Bash
  - Read
---
<objective>
Interpret the user's natural language request and perform the corresponding Burrow operations.
With no arguments, show the root view at depth 1.
</objective>

<execution_context>
@./.claude/burrow/workflows/burrow.md
</execution_context>

<context>
User request: $ARGUMENTS
CLI path: node .claude/burrow/burrow-tools.cjs
</context>

<process>
Follow the workflow instructions to:
1. Parse the user's intent from $ARGUMENTS
2. If empty, run: node .claude/burrow/burrow-tools.cjs get
3. If a data operation, read tree state first (--json) to resolve references
4. Show what command you're running (transparency)
5. Run the CLI command(s) without --json
6. Output the result directly -- do not reformat
</process>
