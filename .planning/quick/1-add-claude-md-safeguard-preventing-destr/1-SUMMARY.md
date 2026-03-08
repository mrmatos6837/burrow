---
phase: quick
plan: 1
subsystem: project-config
tags: [safeguards, claude-md, destructive-ops]
key-files:
  created:
    - CLAUDE.md
metrics:
  duration: "28s"
  completed: "2026-03-08T22:35:05Z"
  tasks_completed: 1
  tasks_total: 1
---

# Quick Plan 1: Add CLAUDE.md Safeguard Summary

Project-level CLAUDE.md with 6 safeguard rules preventing destructive burrow operations without explicit user consent.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create CLAUDE.md with burrow safeguard rules | c0a8293 | CLAUDE.md |

## What Was Built

Created `CLAUDE.md` at project root -- automatically loaded by Claude Code on every session. Contains:

1. **Project overview** -- pointers to source, data, commands, workflow
2. **6 safeguard rules** -- destructive op consent, show-before-modify, no batch ops, read-only safe list, no direct cards.json edits, no side-effect source changes
3. **Code conventions** -- zero deps, CJS, test command

## Why This Matters

The workflow file (`.claude/burrow/workflows/burrow.md`) already has invariants, but those only load when `/burrow` is invoked. CLAUDE.md is loaded globally, ensuring safeguards apply even during autonomous operation or outside the `/burrow` command flow.

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

- CLAUDE.md exists at project root: PASS
- Contains destructive operation prohibition: PASS
- Contains cards.json direct-edit prohibition: PASS
- Contains source code protection: PASS
- Read-only operations marked safe: PASS
