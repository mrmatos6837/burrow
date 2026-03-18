---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Packaging & Distribution
status: completed
stopped_at: Completed 12-01-PLAN.md
last_updated: "2026-03-17T00:05:23.961Z"
last_activity: "2026-03-17 — Plan 12-01 complete: added .claude/commands/burrow.md to npm files whitelist, fixing ENOENT in npx create-burrow"
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 6
  completed_plans: 6
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-14)

**Core value:** One recursive data structure — cards containing cards — navigated by an agent that can traverse, summarize, and render any slice at any depth.
**Current focus:** v1.2 Packaging & Distribution — COMPLETE

## Current Position

Phase: 12 of 12 (Fix npm Files Whitelist)
Plan: 1 of 1 complete
Status: Complete
Last activity: 2026-03-17 — Plan 12-01 complete: added .claude/commands/burrow.md to npm files whitelist, fixing ENOENT in npx create-burrow

Progress: [██████████] 100%

## Performance Metrics

**v1.1 Velocity:**
- Total plans completed: 8
- Average duration: ~14 min
- Total execution time: ~115 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 6 | 2 | ~10 min | ~5 min |
| Phase 7 | 2 | ~28 min | ~14 min |
| Phase 8 | 4 | ~77 min | ~19 min |

*Updated after each plan completion*
| Phase 09-installer-rewrite P02 | 3 | 2 tasks | 2 files |
| Phase 10-version-tracking P01 | 12 | 2 tasks | 4 files |
| Phase 10-version-tracking-update-command P02 | 8 | 2 tasks | 2 files |
| Phase 11-npm-package P01 | 8 | 2 tasks | 2 files |
| Phase 12-fix-npm-files-whitelist P01 | 3 | 1 task | 1 file |

## Accumulated Context

### Decisions

All v1.1 decisions archived in PROJECT.md Key Decisions table and milestones/v1.1-ROADMAP.md.

v1.2 decisions:
- UPD-01 assigned to Phase 9 (installer rewrite) because "re-run preserves data" is installer logic, not a separate update feature
- Phase 11 (npm) depends on Phase 9 (installer) — can't publish what doesn't exist — but not on Phase 10 (versions)
- Sentinel markers are HTML comments (<!-- burrow:start --> / <!-- burrow:end -->) so they are invisible in rendered markdown
- Engine/CLI separation: pure-function engine module (Plan 01) with no readline; CLI wired on top in Plan 02
- performRepair takes an explicit missingFiles parameter from detect() output to remain pure/testable
- cards.json preservation in upgrade is unconditional (not a flag) — hardcoded guarantee
- [Phase 09-installer-rewrite]: readline interface only created when interactive mode needed; --yes skips it to avoid hanging on stdin
- [Phase 09-installer-rewrite]: Uninstall default confirmation is NO (destructive) while upgrade/repair default to YES
- [Phase 10-version-tracking]: Cache-only notification in CLI — burrow-tools reads cache seeded by installer, never initiates check itself
- [Phase 10-version-tracking]: null semver treated as 0.0.0 so missing VERSION file always shows outdated notice
- [Phase 10-version-tracking]: Update notices go to stderr to keep stdout clean for agent-parseable output
- [Phase 10-version-tracking-update-command]: /burrow:update reads .claude/burrow/.source-dir to find installer path — no hardcoded paths
- [Phase 10-version-tracking-update-command]: Breadcrumb writes happen after install and upgrade but NOT after repair — repair doesn't change versions
- [Phase 11-npm-package]: npm package name is create-burrow so users can run npx create-burrow; files whitelist of 3 entries excludes all dev/planning/internal tooling; README.md auto-included by npm regardless of whitelist (acceptable)
- [Phase 12-fix-npm-files-whitelist]: Added .claude/commands/burrow.md as 4th entry in package.json files array — installer line 162 references this file as commandFile during every install; audit install.cjs labelMap when modifying files whitelist

### Pending Todos

See burrow cards for tracked work:
- `burrow get d6e53b29` — Backlog (future work)

### Roadmap Evolution

- Phase 13 added: npm-First Update System — replace local git clone assumptions with npm registry version checks and npx-based /burrow:update

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-03-17T00:03:00Z
Stopped at: Completed 12-01-PLAN.md
Resume file: None
