# Project Research Summary

**Project:** Burrow
**Domain:** CLI bucket-based task manager / Claude Code addon (zero-dependency Node.js, flat-file storage)
**Researched:** 2026-03-06
**Confidence:** HIGH

## Executive Summary

Burrow is a bucket-based task manager that runs as a Claude Code addon, using flat markdown files with YAML frontmatter for storage and a zero-dependency Node.js CLI for deterministic operations. The research is unambiguous: this is a well-constrained problem with proven patterns. The GSD framework already provides a battle-tested CLI tool architecture (router + lib modules), a working frontmatter parser, and an established command registration system. Burrow should fork these patterns rather than inventing new ones. The stack is entirely Node.js 22 built-in APIs -- no npm packages, no build step, no install step.

The recommended approach is to build bottom-up following strict dependency ordering: core utilities and config first, then item CRUD and bucket management, then views and archive, then the CLI router and agent workflow, and finally GSD integration with reconciliation. The architecture follows an "Agent + Deterministic CLI" split where the agent handles all fuzzy judgment (intent parsing, reconciliation matching, user interaction) and the CLI handles all deterministic work (file I/O, data transformation, rendering). Every CLI command returns structured JSON; the agent or workflow formats output for the user. This separation is non-negotiable -- violating it creates brittle code that is worse than either layer alone.

The key risks are frontmatter parsing fragility (YAML edge cases with colons, dashes, and special characters in user input), file I/O race conditions (non-atomic writes causing data loss), and feature creep beyond the intentionally minimal schema (bucket, title, tags, created, notes). All three must be addressed in the first phase. The reconciliation feature -- matching completed work against open items -- is the highest-value differentiator but also the highest-risk feature; it should be built last, after the core workflow is proven, to avoid building an annoying nag system instead of a helpful assistant.

## Key Findings

### Recommended Stack

The entire stack is Node.js 22 built-in APIs. No external dependencies are permitted -- Burrow is distributed as flat files with no install step. This constraint simplifies every technology decision.

**Core technologies:**
- **Node.js 22 LTS (CommonJS):** Runtime already required by Claude Code. Provides all needed APIs natively. `.cjs` format matches GSD convention.
- **`util.parseArgs()`:** Stable CLI argument parsing. Replaces minimist/yargs entirely. Handles subcommands, flags, and positionals.
- **`util.styleText()`:** Terminal coloring and formatting. Replaces chalk/picocolors. Supports bold, dim, and all ANSI colors.
- **`crypto.randomUUID()`:** Safe item ID generation. Avoids timestamp-based collisions entirely.
- **Synchronous `fs` APIs:** Correct choice for a CLI that runs, does one thing, and exits. Async adds complexity with zero benefit here.
- **Custom YAML frontmatter parser:** Forked from GSD's proven `extractFrontmatter()`. Simplified for Burrow's flat schema (no deep nesting). Approximately 40 lines of code.

**Critical version requirement:** Node.js 22+ minimum. `util.styleText()` is not available in earlier versions.

### Expected Features

**Must have (table stakes):**
- Item CRUD (add, edit, delete markdown files with YAML frontmatter)
- User-defined buckets (config-driven, ordered)
- Move items between buckets
- Pan view (bucket names + item counts, dotted alignment)
- Drill view (items grouped by tag within a bucket)
- Archive system (move completed items to archive/, hidden from default views)
- Tags in frontmatter (free-form, no predefined list)
- Search and filter (by text, tag, bucket)
- CLI helper with JSON output (burrow-tools.cjs)
- Shortcut commands (bw-add, bw-show, bw-move, bw-archive)
- Natural language command (/gsd:burrow)

**Should have (differentiators):**
- Agent-driven reconciliation (match completed work against open items)
- Bucket limits with agent-guided resolution
- GSD workflow integration hooks
- Bulk operations (archive/move/tag multiple items)

**Defer (v2+):**
- Config templates, item statistics, export/reporting, cross-bucket tag views
- Priority scores, due dates, recurring tasks, sub-tasks, custom fields -- these are explicitly anti-features

### Architecture Approach

Four-layer architecture: Entry (command .md files) -> Workflow (agent logic in burrow.md) -> CLI Tool (deterministic Node.js with lib/ modules) -> Storage (flat files). The CLI router dispatches to domain-specific modules (items, buckets, archive, renderer, config, core). All modules depend on core.cjs for shared utilities. Items depends on config (to validate bucket names). Renderer depends on items (to read data). Archive is essentially items with a different directory target.

**Major components:**
1. **burrow-tools.cjs (router)** -- Parse args, dispatch to correct module. Thin by design.
2. **lib/core.cjs** -- Shared utilities: output formatting, error handling, frontmatter parse/serialize, atomic file writes.
3. **lib/items.cjs** -- Item CRUD: create, read, update, delete, list, filter by bucket/tag.
4. **lib/buckets.cjs** -- Bucket management: list, create, rename, reorder, enforce limits via config.json.
5. **lib/renderer.cjs** -- Pure functions: data in, formatted text out. Pan view and drill view.
6. **lib/archive.cjs** -- Move items between items/ and archive/, search archived items.
7. **lib/config.cjs** -- JSON config read/write with defaults and validation.
8. **workflows/burrow.md** -- Agent-side logic: intent parsing, reconciliation, user interaction.

### Critical Pitfalls

1. **YAML frontmatter fragility** -- Colons in titles, `---` in note bodies, and special YAML characters break naive parsers. Prevent by: quoting all string values on write, wrapping every parse in try/catch with file-identifying errors, testing with adversarial fixtures. Address in Phase 1.
2. **File I/O race conditions** -- Non-atomic writes cause zero-byte files on crash; timestamp IDs collide under rapid calls. Prevent by: write-to-tmp-then-rename pattern, `crypto.randomUUID()` for IDs. Address in Phase 1.
3. **Agent output ambiguity** -- Mixing human-readable and machine-readable formats causes the agent to misparse data or the user to see raw JSON. Prevent by: CLI always returns JSON, workflow/agent formats for display. Strict `{success, data, error?}` contract. Address in Phase 1.
4. **Feature creep beyond schema** -- Each "just one more field" compounds into a poor Jira clone. Prevent by: schema freeze at bucket/title/tags/created/notes. New metadata goes in the markdown body, not frontmatter. Enforce every phase.
5. **Reconciliation annoyance** -- Too many false positives or too-frequent triggers train users to ignore it. Prevent by: batch presentation, confidence filtering, single decision point, always-skippable. Build last (Phase 5+).

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation (Core + Config)
**Rationale:** Everything depends on core utilities and config management. The frontmatter parser, atomic file operations, output helpers, and config schema must be rock-solid before any feature is built. This is where the three most critical pitfalls (YAML fragility, race conditions, output ambiguity) are prevented or introduced.
**Delivers:** core.cjs (frontmatter parse/serialize, atomic writes, output/error helpers, slug generation), config.cjs (read/write config.json, default bucket setup, validation), directory structure creation (.planning/burrow/items/, archive/).
**Addresses features:** Persistent flat-file storage, item creation timestamps (created field).
**Avoids pitfalls:** YAML fragility (adversarial test coverage), file I/O races (atomic writes baked in), output ambiguity (JSON contract established).

### Phase 2: Data Operations (Items + Buckets)
**Rationale:** With core and config in place, item CRUD and bucket management are the next dependency. Every subsequent feature (views, archive, search) reads items. Buckets must exist before items can reference them.
**Delivers:** items.cjs (add, get, list, update, remove, filter), buckets.cjs (create, list, rename, reorder, delete).
**Addresses features:** Item CRUD, user-defined buckets, move items between buckets, tags in frontmatter, search/filter.
**Avoids pitfalls:** Feature creep (schema freeze enforced here -- only bucket/title/tags/created allowed).

### Phase 3: Views and Archive
**Rationale:** With items and buckets working, users need to see their data and clean up completed work. Renderer depends on items module for data. Archive is item movement to a different directory.
**Delivers:** renderer.cjs (pan view with dotted alignment, drill view with tag grouping), archive.cjs (archive, unarchive, archive search).
**Addresses features:** Pan view, drill view, archive system, bulk operations.
**Avoids pitfalls:** Rendering breakage (test with 0/1/50+ items, long titles, Unicode, no-tag and many-tag scenarios).

### Phase 4: CLI Router and Workflow
**Rationale:** All lib modules must exist before the router can dispatch to them. The workflow file requires a functional CLI to reference. Commands require a workflow to invoke.
**Delivers:** burrow-tools.cjs (argument parsing, subcommand routing, --json flag), workflows/burrow.md (agent instructions), command files (bw-add.md, bw-show.md, bw-move.md, bw-archive.md, bw-buckets.md, burrow.md).
**Addresses features:** CLI helper with JSON output, shortcut commands, natural language command.
**Avoids pitfalls:** Monolithic CLI (router is thin, modules own logic), workflow duplication (all shortcuts reference single workflow), rendering in agent (CLI generates formatted views).

### Phase 5: GSD Integration and Reconciliation
**Rationale:** This is the highest-complexity, highest-risk feature. It requires all other systems working reliably. Building it last means the core workflow is proven before adding the integration layer. Reconciliation quality depends on having real item data to test against.
**Delivers:** Reconciliation logic in workflow (agent matches completed work to open items), GSD workflow integration hooks (post-phase reconciliation prompts), bucket limits with agent guidance.
**Addresses features:** Agent-driven reconciliation, GSD workflow integration hooks, bucket limits.
**Avoids pitfalls:** Reconciliation annoyance (batch presentation, confidence filtering, skippable). Does NOT modify any files inside `.claude/get-shit-done/`.

### Phase Ordering Rationale

- **Bottom-up by dependency:** Core -> Data -> Views -> CLI -> Integration. Each phase only depends on prior phases, never on later ones. This matches the architecture research's explicit build order.
- **Critical pitfalls front-loaded:** The three most dangerous pitfalls (YAML parsing, file I/O, output contract) are all addressed in Phase 1. Waiting to address them would mean building features on an unreliable foundation.
- **Highest-risk feature last:** Reconciliation is deferred to Phase 5 because it requires (a) all CRUD working, (b) archive working, (c) search working, and (d) real usage data to tune the agent's matching quality. Building it earlier would mean testing against synthetic data only.
- **Feature grouping by module:** Each phase maps cleanly to one or two lib modules. This keeps phases focused and independently verifiable.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (CLI Router and Workflow):** The workflow markdown format and agent instruction patterns need careful design. How the agent parses intent and dispatches to CLI commands is the core UX -- this needs prototype-and-iterate, not just implementation.
- **Phase 5 (GSD Integration):** Reconciliation matching heuristics, integration hook injection points, and the interaction model (batch vs per-item) all need exploration. Sparse precedent -- no other CLI task tool does agent-driven reconciliation.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** GSD's existing frontmatter.cjs and core.cjs are direct reference implementations. Fork and simplify.
- **Phase 2 (Data Operations):** Standard file CRUD. Well-understood patterns.
- **Phase 3 (Views and Archive):** String formatting and file movement. Straightforward implementation.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero ambiguity. All Node.js 22 built-ins, verified working. GSD provides reference implementations. |
| Features | HIGH | Clear MVP scoped against competitor analysis. Anti-features explicitly identified. Feature dependency graph is clean. |
| Architecture | HIGH | Direct fork of GSD's proven CLI tool pattern. Four-layer architecture with clear boundaries. Build order derives naturally from dependencies. |
| Pitfalls | HIGH | Critical pitfalls have concrete prevention strategies. Real-world evidence cited (Claude Code race condition issue, js-yaml CVE). Phase mapping is explicit. |

**Overall confidence:** HIGH

### Gaps to Address

- **Workflow instruction format:** How exactly the agent follows burrow.md instructions needs prototyping during Phase 4. The command file format is known, but the workflow logic (especially intent parsing heuristics) will require iteration.
- **Reconciliation UX:** The interaction model for presenting matches and collecting user decisions has no direct precedent. Phase 5 should start with a minimal prototype and iterate based on real usage.
- **Filename collision handling:** Research recommends `crypto.randomUUID()` but the UX of UUID-based filenames (vs human-readable slugs) needs a decision. Recommendation: use slugs as primary with UUID suffix only on collision (e.g., `fix-login-bug.md`, then `fix-login-bug-a1b2c3.md` on collision).
- **Performance at scale:** Research says 500+ items is unlikely but does not provide a concrete mitigation plan beyond "archive aggressively." If needed, an index cache (.index.json) can be added in a future phase without architectural changes.

## Sources

### Primary (HIGH confidence)
- GSD `gsd-tools.cjs` and `lib/` modules -- directly inspected, proven CLI tool architecture
- GSD `lib/frontmatter.cjs` -- reference YAML frontmatter implementation
- Node.js v22 official documentation -- `util.parseArgs()`, `util.styleText()`, `crypto.randomUUID()` verified on v22.14.0
- PROJECT.md -- explicit architecture decisions and constraints

### Secondary (MEDIUM confidence)
- Taskwarrior official docs -- feature landscape, lessons on scope discipline
- todo.txt format and CLI -- flat-file task management precedent
- taskell, clikan, kanban-tui -- CLI kanban tool feature comparison
- Node.js CLI Apps Best Practices (github.com/lirantal) -- error handling and output patterns

### Tertiary (LOW confidence)
- CVE-2025-64718 (js-yaml prototype pollution) -- cited for YAML safety awareness, not directly applicable since Burrow uses a custom parser
- Claude Code issue #29036 (race condition) -- real-world evidence for file I/O atomicity concern

---
*Research completed: 2026-03-06*
*Ready for roadmap: yes*
