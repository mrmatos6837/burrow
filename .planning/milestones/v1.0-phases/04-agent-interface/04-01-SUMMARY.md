---
phase: 04-agent-interface
plan: 01
subsystem: agent-interface
tags: [workflow, slash-commands, natural-language, claude-code]

requires:
  - phase: 03-cli-pretty-print
    provides: "Pretty-print rendering and --json flag for CLI output"
provides:
  - "Workflow file defining agent behavior for all Burrow interactions"
  - "/burrow NL command entry point"
affects: [04-02, agent-commands]

tech-stack:
  added: []
  patterns: ["workflow @-reference from command file", "NL command with $ARGUMENTS processing"]

key-files:
  created:
    - .claude/burrow/workflows/burrow.md
    - .claude/commands/burrow/burrow.md
  modified: []

key-decisions:
  - "Workflow file at .claude/burrow/workflows/burrow.md, separate from command files"
  - "4 worked examples covering creation, viewing, multi-step, and ambiguity resolution"

patterns-established:
  - "Workflow @-reference: command files load workflow via @./.claude/burrow/workflows/burrow.md"
  - "Shortcut commands will NOT load workflow (context budget optimization)"

requirements-completed: [CMDS-06, CMDS-01]

duration: 2min
completed: 2026-03-08
---

# Phase 4 Plan 1: Workflow and NL Command Summary

**Agent workflow file with 6 invariants, CLI command reference, 4 worked examples, and /burrow NL entry point**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-08T21:02:24Z
- **Completed:** 2026-03-08T21:03:52Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Workflow file defines complete agent behavior: invariants, command reference, rendering rules, NL parsing, worked examples, tone
- /burrow NL command wired to workflow via @-reference with $ARGUMENTS processing
- 6 hard invariants covering delete confirmation, explicit intent, ambiguity, rendering pass-through, no raw JSON, read-before-write

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the Burrow workflow file** - `3e741e8` (feat)
2. **Task 2: Create the /burrow NL command file** - `26e68c9` (feat)

## Files Created/Modified
- `.claude/burrow/workflows/burrow.md` - Agent behavior definition with invariants, command reference, rendering rules, NL parsing, worked examples, tone guidelines
- `.claude/commands/burrow/burrow.md` - NL parser slash command entry point with frontmatter and workflow @-reference

## Decisions Made
- Placed workflow at `.claude/burrow/workflows/burrow.md` (separate from command registration) for reusability and independent editing
- Included 4 worked examples: simple creation, viewing/navigation, multi-step operation, ambiguity resolution
- Command file uses `allowed-tools: [Bash, Read]` -- Bash for CLI execution, Read for file context

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Workflow and NL command ready for use
- `.claude/commands/burrow/` directory established for shortcut commands (Plan 02)
- Shortcut commands (add, show, edit, move, delete, archive, unarchive, dump, help) to be created in Plan 02

## Self-Check: PASSED

- [x] `.claude/burrow/workflows/burrow.md` exists
- [x] `.claude/commands/burrow/burrow.md` exists
- [x] `04-01-SUMMARY.md` exists
- [x] Commit `3e741e8` found
- [x] Commit `26e68c9` found

---
*Phase: 04-agent-interface*
*Completed: 2026-03-08*
