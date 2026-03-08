---
phase: 04-agent-interface
plan: 02
subsystem: commands
tags: [slash-commands, cli, agent-interface]

requires:
  - phase: 03-cli-pretty-print
    provides: Pretty-print rendering and --json flag used by CLI invocations in shortcuts
provides:
  - 9 slash command files for /burrow:* namespace
  - Command reference via /burrow:help
  - Updated REQUIREMENTS.md with /burrow:* namespace
affects: [04-agent-interface]

tech-stack:
  added: []
  patterns: [thin-wrapper slash commands that shell out to burrow-tools.cjs]

key-files:
  created:
    - .claude/commands/burrow/add.md
    - .claude/commands/burrow/show.md
    - .claude/commands/burrow/edit.md
    - .claude/commands/burrow/move.md
    - .claude/commands/burrow/delete.md
    - .claude/commands/burrow/archive.md
    - .claude/commands/burrow/unarchive.md
    - .claude/commands/burrow/dump.md
    - .claude/commands/burrow/help.md
  modified:
    - .planning/REQUIREMENTS.md

key-decisions:
  - "Shortcuts are thin wrappers -- no workflow file loaded, no NL parsing"
  - "show maps to CLI get command (user-facing name differs from internal)"
  - "delete.md shows target card before confirmation for safety"
  - "help.md outputs static text with no CLI invocation"

patterns-established:
  - "Slash command pattern: frontmatter with name/description/argument-hint/allowed-tools, single Bash invocation of burrow-tools.cjs"
  - "User-facing show maps to internal get -- naming abstraction at command layer"

requirements-completed: [CMDS-02, CMDS-03, CMDS-04, CMDS-05]

duration: 1min
completed: 2026-03-08
---

# Phase 4 Plan 2: Shortcut Commands and Help Summary

**9 thin-wrapper /burrow:* slash commands mapping directly to burrow-tools.cjs CLI operations, plus command reference help**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-08T21:02:23Z
- **Completed:** 2026-03-08T21:03:45Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Created all 9 slash command files covering every CLI operation
- show.md maps to CLI get command (user-facing naming abstraction)
- delete.md includes confirmation step showing target before execution
- help.md provides formatted command reference table with usage examples
- REQUIREMENTS.md updated from /gsd:bw-* to /burrow:* namespace

## Task Commits

Each task was committed atomically:

1. **Task 1: Create all shortcut command files and help** - `fa1df37` (feat)
2. **Task 2: Update REQUIREMENTS.md with /burrow:* namespace** - `a85549e` (docs)

## Files Created/Modified
- `.claude/commands/burrow/add.md` - /burrow:add shortcut (maps to burrow-tools.cjs add)
- `.claude/commands/burrow/show.md` - /burrow:show shortcut (maps to burrow-tools.cjs get)
- `.claude/commands/burrow/edit.md` - /burrow:edit shortcut (maps to burrow-tools.cjs edit)
- `.claude/commands/burrow/move.md` - /burrow:move shortcut (maps to burrow-tools.cjs move)
- `.claude/commands/burrow/delete.md` - /burrow:delete shortcut with confirmation step
- `.claude/commands/burrow/archive.md` - /burrow:archive shortcut
- `.claude/commands/burrow/unarchive.md` - /burrow:unarchive shortcut
- `.claude/commands/burrow/dump.md` - /burrow:dump shortcut (alias for get --depth 0)
- `.claude/commands/burrow/help.md` - Command reference table (no CLI invocation)
- `.planning/REQUIREMENTS.md` - Updated Commands section to /burrow:* namespace

## Decisions Made
- Shortcuts are thin wrappers with no workflow file references and no NL parsing
- show maps to CLI get -- user-facing name differs from internal command name
- delete.md previews target card via get before asking for confirmation
- help.md uses static text output with no allowed-tools needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All shortcut commands ready for use
- CMDS-01 (NL /burrow command) and CMDS-06 (workflow file) remain for plan 04-01
- Command infrastructure complete for workflow file integration

---
*Phase: 04-agent-interface*
*Completed: 2026-03-08*
