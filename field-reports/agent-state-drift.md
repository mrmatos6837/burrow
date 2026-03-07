# Report: Agent State Drift in Multi-Agent Workflows

**Date:** 2026-03-07
**Context:** Frederico project, GSD workflow framework
**Trigger:** Discovered STATE.md pending todos list was missing 5 of 13 items that existed in the `pending/` directory

---

## 1. The Problem: Data Lives in Multiple Places

The GSD framework stores project state across multiple locations, with the same data represented in different forms in different files. The canonical example we hit today:

**Pending todos** exist in two places:
- `.planning/todos/pending/` — one markdown file per todo (the source of truth)
- `.planning/STATE.md` under `### Pending Todos` — a bullet-point summary list

These two representations drifted apart. STATE.md listed 8 pending todos. The directory had 13. Five todos were invisible to any agent that only read STATE.md.

### How it happened

The `/gsd:add-todo` workflow (line 111-122 of `add-todo.md`) explicitly instructs agents to:
1. Create the todo file in `pending/`
2. Update the `### Pending Todos` section in STATE.md
3. Commit both files

In practice, agents created the file and committed it, but skipped the STATE.md update step. This happened at least 5 times across multiple sessions. The git history confirms it — commits like `1a4479d`, `47b63e0`, `cb93d3d`, `8b09297`, `6f19c32` all add todo files but don't touch STATE.md.

**Root cause:** The workflow has the right steps. The agents executing those steps don't always complete them. The "main work" (creating the todo file) succeeds, and the denormalization step (updating STATE.md) gets dropped — likely because the agent treats it as secondary, or runs into context/attention limits on multi-step operations.

---

## 2. The Scope of the Problem: STATE.md as Denormalized Cache

This isn't isolated to todos. STATE.md is a **denormalized summary document** that aggregates data from multiple sources. It has 135 commits in this project's history and is written to by **19 of the GSD workflows**.

Data that STATE.md duplicates from other sources:

| Data | Source of Truth | STATE.md Section |
|------|----------------|-----------------|
| Pending todos | `todos/pending/` directory | `### Pending Todos` bullet list |
| Phase progress | ROADMAP.md + plan SUMMARY files on disk | Frontmatter `progress:` block |
| Quick task history | `.planning/quick/` directories + git log | `### Quick Tasks Completed` table |
| Key decisions | PROJECT.md `## Key Decisions` table | `### Decisions` section |
| Current position | ROADMAP.md phase markers | `## Current Position` section |
| Blockers | Accumulated across phase executions | `### Blockers/Concerns` section |
| Session continuity | Git log + last agent actions | `## Session Continuity` section |

Every one of these is a drift risk. If the agent that completes a phase updates ROADMAP.md but not STATE.md's progress section, the next agent reads stale progress. If a quick task executor updates the quick tasks table but not the "Last activity" line, continuity breaks.

**Observed:** The pending todos section drifted. The quick tasks table appears correct today, but that's because the executor happened to update it. There's no guarantee it stays in sync.

---

## 3. Why STATE.md Exists This Way

The design rationale is sound: **minimize tool calls at agent startup**.

When a new agent session begins (e.g., `/gsd:resume-work`, `/gsd:progress`), it needs to understand:
- What phase are we on?
- What's done, what's next?
- Any blockers or context from previous sessions?
- Any deferred work (todos)?

Without STATE.md, the agent would need to: read ROADMAP.md, list and parse the `pending/` directory, read PROJECT.md for decisions, check git log for last activity — multiple tool calls before it can even orient itself.

STATE.md collapses this into a single file read. **It's a cache optimized for agent context loading.**

The problem is that caches need invalidation strategies, and the current strategy is "every workflow that changes source data must also update the cache." With 19 workflows touching STATE.md and agents that don't always complete all steps, cache invalidation fails silently.

---

## 4. The Impediments

### 4.1 No enforcement mechanism

Nothing prevents an agent from committing a todo file without updating STATE.md. The `gsd-tools.cjs commit` command doesn't validate that STATE.md is included when it should be. The workflow says "update STATE.md" but it's a suggestion in a markdown file, not a constraint in code.

**Evidence:** 5 out of ~17 total todos added to this project were added without updating STATE.md. That's a ~29% failure rate on a two-step write operation.

### 4.2 Silent drift

When STATE.md goes stale, nothing breaks immediately. Agents continue working. The todo still exists in `pending/`. The drift only surfaces when a human or agent tries to get a complete picture from STATE.md alone — and by then, nobody knows how long it's been wrong.

**Evidence:** The 5 missing todos accumulated over roughly 24 hours of work across multiple sessions. Nobody noticed until the user asked "is that list updated?" today.

### 4.3 Multi-writer contention

19 workflows write to STATE.md. When agents run in parallel (which GSD encourages for performance), they can overwrite each other's STATE.md changes. Agent A reads STATE.md, Agent B updates it, Agent A writes its version — Agent B's update is lost. This is the classic last-writer-wins problem.

**Assumption:** I haven't directly observed a parallel write conflict on STATE.md in this project, but the architecture makes it possible. GSD spawns parallel executor agents, and the `execute-plan.md` workflow has each executor update STATE.md after completion.

### 4.4 Cognitive overhead on workflow authors

Every new GSD workflow that introduces or modifies trackable data must remember to update STATE.md. This is an implicit contract that's easy to forget. The `add-todo` workflow author got it right in the spec — the agents executing it didn't. The workflow is correct; the execution is unreliable.

### 4.5 Unbounded growth and staleness

STATE.md has a soft limit of 150 lines (per `execute-plan.md` line 373), but there's no automated pruning. Blockers from v1.2 are still listed. The pending todos list was a mix of current and outdated items. An agent reading STATE.md can't easily distinguish fresh context from stale context without cross-referencing the source of truth — which defeats the purpose of having the cache.

---

## 5. The Potential Problems

### 5.1 Wrong recommendations from stale context

If an agent reads STATE.md and sees 8 todos instead of 13, it might recommend priorities based on incomplete data. Today, I ranked the "easiest fix" from the full 13-item list only because we happened to run `init todos` (which reads the directory). If we'd relied on STATE.md alone, 5 items would have been invisible.

### 5.2 Duplicate work

If an agent doesn't see a todo or a completed quick task in STATE.md, it might re-create it or re-do the work. The quick tasks table prevents this for completed work, but only if it's kept in sync.

### 5.3 Conflicting agent understanding

In a multi-agent session, Agent A might read STATE.md at timestamp T1 and Agent B at T2 (after another agent updated it). They now have different views of reality. Decisions made by Agent A based on stale state could conflict with Agent B's actions.

### 5.4 Erosion of trust

The user asked "is that list updated?" — that's a trust question. When users have to verify the system's own bookkeeping, the system is creating work instead of removing it. Every drift incident makes the user trust the state tracking less.

---

## 6. Expert Assessment: Would a Single Source of Truth Fix This?

**The core question:** Would a single source of truth that is cheap and fast to CRUD and query fix the agent misalignment problem we perceive when working with multiple agents on a project?

### Yes — with caveats.

The fundamental issue is not that STATE.md exists, but that we have **two classes of state storage with different update mechanisms and no synchronization guarantee:**

1. **Structured data on disk** (todo files, plan files, directories) — updated reliably because it's the primary action
2. **Denormalized summaries in markdown** (STATE.md) — updated unreliably because it's a secondary side-effect

If you replace both with a single store that agents can query cheaply, you eliminate the entire class of drift bugs. An agent asking "how many pending todos?" would get the real answer every time, not a cached answer from whenever STATE.md was last updated.

### What "cheap and fast" means in this context

The reason STATE.md exists is that file reads are the cheapest operation for an LLM agent. One tool call, one file, full context. A single source of truth needs to match or beat that:

- **Query cost:** One tool call to get a filtered, formatted view of any data slice (todos by area, phase progress, recent decisions)
- **Write cost:** One tool call to create/update an entity, with no secondary "also update the cache" step
- **Read consistency:** Every query returns current state, not a snapshot from whenever something last wrote to it
- **No multi-writer conflicts:** Concurrent agents can write without overwriting each other's changes

### What it would specifically fix

1. **Eliminates drift by design.** No denormalized copies means no copies to go stale. The pending todos problem disappears entirely — there's one list, always current.

2. **Reduces workflow complexity.** Every GSD workflow that currently says "update STATE.md" can drop that step. That's 19 workflows simplified. Fewer steps means fewer opportunities for agents to skip steps.

3. **Enables reliable multi-agent coordination.** If Agent A marks a todo as "in progress" in the store, Agent B sees it immediately. No file-level merge conflicts. No last-writer-wins on a markdown file.

4. **Makes "what's the current state?" a solved problem.** Instead of an agent reading STATE.md and hoping it's current, it queries the store and gets ground truth. Trust is built into the infrastructure, not dependent on every workflow doing its bookkeeping correctly.

### What it wouldn't fix (on its own)

- **Agent attention/completion failures.** If an agent is supposed to write to the store and doesn't, that's still a problem — but it's now a single-write failure, not a "write to source + update cache" failure. The blast radius shrinks.
- **Schema evolution.** As the project evolves, the data model changes. A store needs a way to handle that without breaking existing queries.
- **Context loading cost.** STATE.md's value is that one file read gives full context. A store-based approach needs an equivalent — probably a "snapshot" or "summary" query that returns a comparable context payload in one call.

### Bottom line

The denormalized-markdown-as-cache pattern made sense when agent tool calls were expensive and file reads were the only cheap operation. But the pattern breaks down at scale: 19 workflows writing to one file, agents skipping secondary update steps, silent drift accumulating over sessions.

A single source of truth with cheap CRUD and query would eliminate the entire category of drift bugs we've seen. The agent misalignment problem is fundamentally a **stale reads problem** — agents making decisions on outdated state because the system relies on best-effort cache invalidation instead of reading from a single canonical store.

The answer is yes: this would fix it. Not by making agents smarter about updating caches, but by removing the need for caches entirely.

---

## Appendix: Evidence Trail

| Claim | Evidence |
|-------|----------|
| STATE.md missing 5 of 13 todos | Compared `ls .planning/todos/pending/` (13 files) with STATE.md Pending Todos section (8 items) |
| 19 workflows write to STATE.md | `grep -rln "STATE.md" .claude/get-shit-done/workflows/` returns 19 files |
| 135 commits touch STATE.md | `git log --oneline -- ".planning/STATE.md" | wc -l` |
| `add-todo` workflow specifies STATE.md update | `add-todo.md` lines 111-122 |
| Agents skipped STATE.md update | Git commits `1a4479d`, `47b63e0`, `cb93d3d`, `8b09297`, `6f19c32` add todo files without STATE.md changes |
| `init todos` reads from directory, not STATE.md | `gsd-tools.cjs` `list-todos` / `init todos` commands scan `pending/` directory |
| STATE.md 150-line soft limit | `execute-plan.md` line 373: "Keep STATE.md under 150 lines" |
| ~29% failure rate on STATE.md todo sync | 5 failures out of ~17 total todos added to project |
