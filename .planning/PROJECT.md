# Todobox

## What This Is

A standalone addon for the GSD framework that replaces its built-in todo system with a bucket-based task manager. Todobox lets a solo developer and their AI agent organize thoughts, tasks, bugs, ideas, and anything else into user-defined buckets — with tags for sub-grouping, archiving for done items, and a minimal text UI designed for quick capture and triage. It sits in the sweet spot between a flat todo list and a full project manager like Linear: enough structure to stay organized, zero ceremony.

## Core Value

The agent and the developer share a structured, scannable view of everything in flight — and the agent can reason about it, suggest updates, and reconcile completed work against open items without the developer lifting a finger.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. -->

- [ ] User-defined buckets with display order and optional per-bucket item limits
- [ ] Items as markdown files with YAML frontmatter (bucket, title, created, tags, optional notes)
- [ ] Tags within buckets for sub-grouping (status, area, or any user-defined category)
- [ ] Tags emerge naturally from usage or can be defined upfront — either way works
- [ ] Pan view: minimal bucket names + item counts for at-a-glance status
- [ ] Drill view: items grouped by tag (indented), untagged items listed flat when no tags exist
- [ ] Archive system: done items removed from view but stored and searchable
- [ ] Natural language command handling via `/gsd:todobox` (agent interprets intent)
- [ ] Direct shortcut commands (`/gsd:tb-add`, `/gsd:tb-show`, `/gsd:tb-move`, `/gsd:tb-archive`, etc.)
- [ ] Bucket limits: when hit, agent informs user and asks what to do (move, raise limit, skip)
- [ ] Node.js CLI helper (`todobox-tools.cjs`) for deterministic CRUD, rendering data, and config management
- [ ] GSD workflow integration: reconciliation step after phase execution, debug sessions, and verification
- [ ] Reconciliation: agent compares completed work against open items, suggests matches, user decides
- [ ] Per-project scope (each project gets its own `.planning/todobox/`)
- [ ] Consistent, structured CLI output for agent consumption (JSON for tools, formatted text for display)

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Web UI, database, external dependencies — this runs entirely in Claude Code's terminal
- Priority scores or complex sorting algorithms — the user defines structure via buckets and tags
- Integration with external task managers (Linear, Jira, etc.) — Todobox IS the task manager
- Multi-user or sync features — single dev + agent, local files
- Global cross-project buckets — per-project only, keeps contexts isolated
- Smart fuzzy auto-matching via hooks — reconciliation is agent-driven, not automated scripts

## Context

Todobox is a GSD addon, not a modification to GSD core. It lives outside `.claude/get-shit-done/` so it survives `/gsd:update`. The architecture:

**Addon code (logic + behavior):**
```
.claude/todobox/
  todobox-tools.cjs       # CLI helper for CRUD, rendering, config
  workflows/todobox.md    # Main workflow (handles all interaction)
  templates/              # Output templates
```

**Commands (user entry points):**
```
.claude/commands/gsd/
  todobox.md              # Main: /gsd:todobox — natural language
  tb-add.md               # Shortcut: /gsd:tb-add
  tb-show.md              # Shortcut: /gsd:tb-show
  tb-move.md              # Shortcut: /gsd:tb-move
  tb-archive.md           # Shortcut: /gsd:tb-archive
  + other relevant bucket/item management shortcuts
```

**Data (per-project):**
```
.planning/todobox/
  config.json             # Bucket names, display order, limits
  items/                  # Active item files (markdown + YAML frontmatter)
  archive/                # Archived items (searchable, hidden from default view)
```

**GSD Integration:**
- Reconciliation step injected into GSD workflows (execute-phase, debug, verify-work)
- Agent reads completed work summary + open Todobox items
- Agent presents matches with options (archive, move, skip) + free text
- User decides — agent never auto-closes items without confirmation

**Rendering model:**
- Pan view: bucket names + counts (dotted alignment, minimal)
- Drill view: items under tag sub-headers (indented), untagged items flat
- All CLI tool output is structured JSON; all user-facing output is formatted text

## Constraints

- **Runtime**: Node.js (same as GSD's `gsd-tools.cjs` — no additional runtime dependencies)
- **Storage**: Flat files only (markdown + YAML frontmatter for items, JSON for config)
- **Independence**: Must not modify any files inside `.claude/get-shit-done/` — addon lives separately
- **GSD compatibility**: Must work alongside GSD v1.22.4+ without conflicts
- **Context efficiency**: CLI returns structured data; agent does the thinking, not the script

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Standalone addon, not GSD core modification | Survives `/gsd:update`, installable in any project independently | — Pending |
| Agent-driven reconciliation, not automated hooks | Smart matching requires agent judgment; user always decides | — Pending |
| Tags are flexible (emerge or defined) | Supports both structured workflows and loose capture without forcing either | — Pending |
| Pan + drill two-level rendering | Minimal overview for status, detailed drill-down for triage | — Pending |
| Per-project scope only | Keeps contexts isolated, simpler data model, matches GSD's project-local pattern | — Pending |

---
*Last updated: 2026-03-06 after initialization*
