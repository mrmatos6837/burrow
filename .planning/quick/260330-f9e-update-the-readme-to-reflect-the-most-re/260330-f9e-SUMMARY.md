---
phase: quick
plan: 260330-f9e
subsystem: documentation
tags: [readme, docs, v1.2, npm, install]
dependency_graph:
  requires: []
  provides: [updated-readme]
  affects: []
tech_stack:
  added: []
  patterns: []
key_files:
  created: []
  modified:
    - README.md
decisions:
  - "npx create-burrow is the primary install method; git clone kept as manual fallback"
  - "Interactive installer description covers fresh install, upgrade, repair, uninstall"
  - "/burrow:update added to shortcut list in Usage section"
metrics:
  duration: "1m"
  completed: "2026-03-30T09:03:00Z"
  tasks_completed: 1
  files_modified: 1
---

# Phase quick Plan 260330-f9e: Update README for v1.2 Summary

**One-liner:** README updated for v1.2 — npx create-burrow as primary install with interactive installer, --yes flag, /burrow:update shortcut, Node 18+ requirement, and MIT license.

## What Was Done

Updated README.md to reflect v1.2 (Packaging & Distribution) changes:

1. **Setup section** — Replaced git clone install with `npx create-burrow` as the primary method. Added description of the interactive installer (fresh install, upgrade, repair, uninstall detection). Added `--yes` flag documentation for CI/non-interactive use. Kept git clone as a "Manual install" subsection.

2. **Requirements** — Changed "Node.js v19+" to "Node.js 18+" to match `package.json` engines field.

3. **Shortcut commands** — Added `/burrow:update` to the shortcut list in the Usage section.

4. **Uninstall section** — Added npx-based uninstall path (`npx create-burrow` offers uninstall in its interactive menu) as the primary option, with manual rm -rf as fallback.

5. **License** — Changed "TBD" to "MIT".

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Update README.md for v1.2 | 55610cc | README.md |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- README.md exists and contains all required updates
- Commit 55610cc verified in git log
