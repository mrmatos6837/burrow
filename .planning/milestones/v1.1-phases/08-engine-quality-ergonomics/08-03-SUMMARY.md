---
phase: 08-engine-quality-ergonomics
plan: 03
subsystem: tooling
tags: [init, gitignore, claude-md, line-endings, crlf]

# Dependency graph
requires:
  - phase: 08-engine-quality-ergonomics
    provides: core.cjs ensureDataDir function used by init.cjs
provides:
  - init(cwd) function that bootstraps Burrow in a project directory
  - .gitignore cards.json.bak entry (INST-01)
  - CLAUDE.md Burrow instructions section with CRLF/LF matching (INST-02)
  - burrow init CLI command
affects: [onboarding, new-project-setup]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Line ending detection: check for \\r\\n in existing file before appending"
    - "Idempotent init: check before append to prevent duplication"
    - "Return status object: created|updated|unchanged per resource"

key-files:
  created:
    - .claude/burrow/lib/init.cjs
    - test/init.test.cjs
  modified:
    - .claude/burrow/burrow-tools.cjs

key-decisions:
  - "BURROW_SECTION_LF constant holds LF content; toCRLF() converts on demand — avoids storing two copies"
  - "Idempotent check uses includes('## Burrow') for CLAUDE.md and line-by-line trim for .gitignore"
  - "init CLI command added to burrow-tools as low-priority convenience — calls init(process.cwd()) and prints result"

patterns-established:
  - "Init pattern: check-then-write, never overwrite existing content"
  - "CRLF detection: existing.includes('\\r\\n') determines output line endings"

requirements-completed: [INST-01, INST-02]

# Metrics
duration: 12min
completed: 2026-03-14
---

# Phase 8 Plan 3: Init Script Summary

**init.cjs bootstraps Burrow in any project: adds .planning/burrow/cards.json.bak to .gitignore and appends Burrow agent-memory instructions to CLAUDE.md with CRLF/LF line-ending matching**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-14T04:32:00Z
- **Completed:** 2026-03-14T04:44:07Z
- **Tasks:** 1 (TDD: RED + GREEN + CLI wiring)
- **Files modified:** 3

## Accomplishments
- init(cwd) creates or updates .gitignore with cards.json.bak entry (INST-01)
- init(cwd) creates or updates CLAUDE.md with Burrow instructions section (INST-02)
- Line-ending detection ensures CRLF files stay CRLF, LF files stay LF
- Idempotent: no duplication on repeated runs
- CLI command `burrow init` added to burrow-tools.cjs
- 11 tests covering all combinations pass

## Task Commits

1. **RED: Failing tests for init.cjs** - `7055908` (test)
2. **GREEN: Implement init.cjs** - `1b36650` (feat)
3. **Wire init into CLI** - `e6b52d3` (feat)

_Note: TDD task split into 3 commits (test RED → feat GREEN → feat CLI wiring)_

## Files Created/Modified
- `.claude/burrow/lib/init.cjs` - init(cwd) function; .gitignore + CLAUDE.md handling with CRLF/LF detection
- `test/init.test.cjs` - 11 tests covering all init scenarios
- `.claude/burrow/burrow-tools.cjs` - Added `init` case and updated help strings

## Decisions Made
- BURROW_SECTION_LF holds the LF-normalized content constant; `toCRLF()` converts on demand rather than maintaining two copies
- Idempotency uses `includes('## Burrow')` for CLAUDE.md and line-by-line trim comparison for .gitignore
- `init` CLI command added as a convenience wrapper (not required by INST-01/02 but makes the module useful from the command line)

## Deviations from Plan

None - plan executed exactly as written. The "optional, low priority" CLI wiring was included and completed within the same task cycle.

## Issues Encountered

None. Pre-existing test failures (countActiveDescendants legacy, makePreview PERF-08) are unrelated to this plan and were present before this work began.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- INST-01 and INST-02 requirements satisfied
- init.cjs ready for integration into install/onboarding flows
- No blockers

---
*Phase: 08-engine-quality-ergonomics*
*Completed: 2026-03-14*
