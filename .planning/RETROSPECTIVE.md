# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-09
**Phases:** 5 | **Plans:** 10 | **Tests:** 150

### What Was Built
- Recursive tree engine (mongoose.cjs) — CRUD, move, find, path for infinitely nestable cards
- v2 schema with 6-field cards — dropped position/ordering complexity from v1
- Pretty-print rendering with box-drawing tree lines, counts, body indicators, relative ages
- Natural language agent interface via /burrow + 9 shortcut commands
- Atomic storage layer with backup (warren.cjs) and v1→v2 migration
- Install script for standalone project setup

### What Worked
- **2-day build**: 5 phases, 10 plans, ~90 commits in 2 calendar days — GSD framework kept execution tight
- **Zero-dependency constraint**: Node built-ins only. No build step, no npm, no supply chain risk. 1,415 LOC total.
- **Schema simplification early**: Dropping position/ordering in Phase 2 prevented cascading complexity in later phases
- **Audit-driven tech debt phase**: Phase 5 was born from the milestone audit — caught init.cjs bug and doc drift that would have shipped broken
- **Cards-in-cards model**: One recursive type replaced buckets, tags, categories, and priorities. Simpler than expected.

### What Was Inefficient
- **Naming churn**: tree.cjs → ferret.cjs → mongoose.cjs required renames across tests and imports. Decide names earlier.
- **Pretty-print iteration**: Phase 3 needed a gap-closure plan (03-03) for --depth rendering, archive tags, and count alignment. Better success criteria would have caught these in 03-01/03-02.
- **Multiple audit rounds**: 4 re-audits before passing. First audit found real issues, but subsequent rounds were mostly paperwork reconciliation.

### Patterns Established
- **CommonJS throughout** (.cjs) — explicit module format, no ambiguity
- **Pure render functions** — return strings, no stdout, no side effects
- **Atomic writes** — tmp + rename pattern for all JSON persistence
- **Agent-as-navigator** — human talks naturally, agent picks depth/focus/rendering
- **Workflow + slash commands** — workflow.md defines behavior, thin .md wrappers for shortcuts

### Key Lessons
1. Schema simplicity pays compound interest — every operation got simpler after dropping position/ordering
2. Pretty-print rendering is harder than it looks — box-drawing alignment, depth recursion, and indicator ordering each need explicit attention
3. The milestone audit caught a real shipping bug (init.cjs format) — always audit before marking complete
4. Zero dependencies is a feature, not a constraint — faster tests, no supply chain, instant installs

### Cost Observations
- Model mix: primarily Opus for execution, Sonnet for agents
- Sessions: ~6-8 across 2 days
- Notable: GSD parallelization (executor agents) kept each plan under 5 minutes average

---

## Milestone: v1.1 — Rendering & Ergonomics

**Shipped:** 2026-03-14
**Phases:** 3 | **Plans:** 8 | **Tests:** 240

### What Was Built
- Rendering pipeline rewrite — renderTree returns nested structure, eliminating flatten-renest roundtrip
- Dynamic terminal width via resolveTermWidth() with MIN_TERM_WIDTH=40 floor
- Engine optimizations — moveCard 4→2 walks, parameterized countDescendants, inline archive counting
- Schema validation on load — corrupted cards.json caught with human-readable errors
- CLI hardening — strict flag parsing, NaN/negative guards, enriched CRUD returns
- Project bootstrapping — `burrow init` command with .gitignore and CLAUDE.md setup

### What Worked
- **Tight requirements mapping**: 33 requirements across 7 categories, all mapped 1:1 to phases — zero scope drift
- **TDD throughout**: Failing tests written first for every plan — caught several edge cases that manual testing would have missed
- **Pre-computed metadata pattern**: Computing descendantCount/hasBody once in renderTree and passing down eliminated redundant tree walks everywhere
- **Enriched CRUD returns**: Single architectural decision (mutations return context) eliminated ~6 post-mutation findById/getBreadcrumbs calls
- **Audit before completion**: Milestone audit passed first time — clean separation of phases prevented integration issues

### What Was Inefficient
- **Nyquist validation gaps**: 2 of 3 phases missing VALIDATION.md — validation step needs to be more integrated into plan execution rather than a retroactive step
- **STATE.md drift**: STATE.md showed 0% progress and "Ready to plan" even after all 8 plans were executed — frontmatter tracking lagged behind actual work

### Patterns Established
- **resolveTermWidth()** — centralized width resolution for all rendering commands
- **Enriched CRUD returns** — {card, breadcrumbs, ...} pattern eliminates post-mutation walks
- **O(1) schema validation** — spot-check first card ID, don't walk the tree
- **searchCards in engine** — search logic centralized in mongoose.cjs, CLI is thin wrapper
- **Idempotent init** — check-then-write with line-ending detection

### Key Lessons
1. Pre-computed metadata pays off enormously — compute once during tree traversal, pass to all consumers
2. Enriched returns > post-mutation queries — if a mutation has the context, return it instead of making callers re-walk
3. STATE.md needs automatic progress tracking — manual updates drift fast
4. Nyquist validation should run during execution, not after

### Cost Observations
- Model mix: Opus for execution, Sonnet for agents, Haiku for research
- Sessions: ~4-5 across 2 days
- Notable: Wave-based parallelization in Phase 8 (4 plans, 2 waves) kept execution efficient despite plan dependencies

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 5 | 10 | First milestone — established GSD + Burrow workflow |
| v1.1 | 3 | 8 | Rendering rewrite + engine optimization — enriched returns pattern |

### Cumulative Quality

| Milestone | Tests | LOC (source) | LOC (tests) | Zero-Dep |
|-----------|-------|-------------|-------------|----------|
| v1.0 | 150 | 1,415 | 2,065 | Yes |
| v1.1 | 240 | 1,559 | 3,236 | Yes |

### Top Lessons (Verified Across Milestones)

1. Schema simplicity pays compound interest
2. Audit before shipping — catches real bugs
3. Pre-computed metadata > redundant tree walks (v1.1: rendering + engine)
4. Enriched returns > post-mutation queries (v1.1: CRUD pattern)
