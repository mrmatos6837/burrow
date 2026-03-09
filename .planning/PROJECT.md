# Burrow

> Infinitely nestable Trello for AI agents.

## What This Is

A general-purpose agent-navigated nested card tool for Claude Code. Burrow stores everything as cards that can contain cards — infinitely nestable, like Workflowy — but instead of a human struggling to navigate deep trees, the AI agent is the navigator. The user talks naturally ("show me all my bugs with details", "add a note under the OAuth issue"), and the agent traverses, renders, and manipulates the tree. It sits in the sweet spot between a flat todo list and a full project manager: enough structure to stay organized, zero ceremony. V1 ships with its own `/burrow` command namespace; the core engine is adapter-agnostic for future standalone Claude Code plugin packaging.

### Branding

There's a hole in the ground next to your project. Not a real one — a metaphysical one. Chuck any thought into it and it's stored before you finish the sentence. Need it back? Already there. It doesn't matter how deep the thought was buried, or how many thoughts are nested inside other thoughts inside other thoughts — the burrow goes down forever and it doesn't care. It works at the speed of not-thinking-about-it.

That's the model. The **burrow** is infinitely recursive and metaphysical — it holds whatever structure your mind wants to throw at it. Something in the hole stores, retrieves, rearranges, and navigates at a speed that makes the whole thing feel like it was always just *there*. You'll never need to think about what. That's the point.

<!-- If you're reading the source and wondering what lives in the hole: check lib/mongoose.cjs. It's fast. It built the tunnels. It doesn't need credit. -->

## Core Value

One recursive data structure — cards containing cards — navigated by an agent that can traverse, summarize, and render any slice of the tree at any depth, on demand. The human sees exactly what they need; the agent handles the complexity.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ Infinitely nestable cards (each card can contain child cards) — v1.0
- ✓ Single JSON storage (`cards.json`) — one file, all data, fast and deterministic — v1.0
- ✓ CLI helper (`burrow-tools.cjs`) returns pretty-printed text for all operations — v1.0
- ✓ Depth-configurable rendering: box-drawing tree with counts, body indicators, relative ages — v1.0
- ✓ Natural language navigation via `/burrow` (agent interprets intent, picks depth/focus) — v1.0
- ✓ Direct shortcut commands (`/burrow:add`, `/burrow:read`, `/burrow:move`, etc.) — v1.0
- ✓ Archive system: cascade archive/unarchive, hidden from active views by default — v1.0
- ✓ Per-project scope (`.planning/burrow/`) — v1.0
- ✓ Agent memory: persistent instructions stored as cards, read on session start — v1.0

### Active

<!-- Current scope. Building toward these. -->

(v1 shipped — define v2 requirements with `/gsd:new-milestone`)

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Web UI, database, external dependencies — runs entirely in Claude Code's terminal
- Priority scores or sorting algorithms — tree structure IS the organization
- Integration with external task managers — Burrow IS the task manager
- Multi-user or sync features — single dev + agent, local files
- Interactive TUI (full-screen) — nested TUI breaks agent output model
- Due dates, recurring tasks, custom fields — use nesting and natural text instead
- Search / query engine — `find` command does lightweight title-match; agent ingests full tree and searches in memory
- GSD workflow integration (reconciliation, auto-tracking) — deferred to v2

## Context

Burrow is a standalone tool that lives outside `.claude/get-shit-done/` so it survives `/gsd:update`. The core engine is adapter-agnostic — the `/burrow` command namespace is one adapter; a generic Claude Code plugin adapter can be built later for standalone distribution.

**Data model:**
One recursive type: cards containing cards. No separate concepts for "buckets", "tags", or "categories" — those are just cards at different depths. The user decides what the tree means.

```json
{
  "version": 2,
  "cards": [
    {
      "id": "a1b2c3d4",
      "title": "bugs",
      "created": "2026-03-06T14:30:00Z",
      "archived": false,
      "body": "",
      "children": [
        {
          "id": "e5f6g7h8",
          "title": "Login redirect broken",
          "created": "2026-03-06T14:35:00Z",
          "archived": false,
          "body": "OAuth callback sends to /dashboard instead of original page",
          "children": []
        }
      ]
    }
  ]
}
```

**Rendering model:**
Pretty-printed tree with box-drawing characters, descendant counts, body indicators, and right-aligned relative ages. Depth-configurable — default shows card + direct children, `--depth 0` shows the full tree.

```
  ├─ [a1b2c3d4] bugs (5)                                          1d ago
  │   ├─ [e5f6g7h8] Login redirect broken (1) …                   1d ago
  │   ├─ [f1234567] API timeout (2)                                1d ago
  │   └─ [abcdef01] Dark mode flicker …                            2d ago
  └─ [deadbeef] features (3)                                       3d ago
```

**Source code:**
```
.claude/burrow/
  burrow-tools.cjs         # CLI entry point (all commands)
  lib/core.cjs             # ID generation, directory setup
  lib/mongoose.cjs         # Tree operations engine (CRUD, find, archive)
  lib/warren.cjs           # Storage layer (atomic load/save, migration)
  lib/render.cjs           # Pretty-print rendering (tree, cards, mutations)
  workflows/burrow.md      # Agent workflow (NL interpretation, safeguards)
```

**Commands:**
```
.claude/commands/
  burrow.md                # /burrow — natural language
  burrow/add.md            # /burrow:add
  burrow/read.md           # /burrow:read
  burrow/edit.md           # /burrow:edit
  burrow/move.md           # /burrow:move
  burrow/remove.md         # /burrow:remove
  burrow/archive.md        # /burrow:archive
  burrow/unarchive.md      # /burrow:unarchive
  burrow/dump.md           # /burrow:dump
  burrow/help.md           # /burrow:help
```

**Data:**
```
.planning/burrow/
  cards.json               # The entire tree (version 2 schema)
```

**Installer:**
```
install.cjs                # Copies source, commands, and data into target project
```

## Constraints

- **Runtime**: Node.js built-in APIs only — zero npm dependencies
- **Storage**: Single JSON file (`cards.json`) — atomic writes (tmp + rename)
- **Independence**: Must not modify any files inside `.claude/get-shit-done/`
- **GSD compatibility**: Works alongside GSD without conflicts
- **Context efficiency**: CLI returns pretty-printed text; agent reads cards.json directly for full state

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Nested list model (not buckets + tags) | One recursive concept replaces three separate models. Simpler data, simpler code, more flexible. Agent handles navigation complexity. | ✓ Good — cards-in-cards handles every use case cleanly |
| Single JSON storage | One file read per operation. No YAML parsing, no directory enumeration. Fast, minimal, deterministic. | ✓ Good — near-instant reads, agent ingests full state every session |
| Drop position + ordering (v2 schema) | Array index IS display order. No position field, no ordering mode. Agent sorts via move operations. | ✓ Good — eliminated recompact logic, simplified schema to 6 fields |
| Plain JS for v1 | Schema is small enough that TS types don't buy much. Upgrade to TS if/when plugin packaging happens. | ✓ Good — zero build step, 150 tests pass, clean code |
| General-purpose core + `/burrow` namespace | Core engine is adapter-agnostic. `/burrow` commands are the v1 interface. Opens path to standalone Claude Code plugin. | ✓ Good — clean separation between engine and commands |
| Agent-as-navigator | Humans struggle with deep trees (Workflowy problem). Agents don't. The agent picks depth, focus, and rendering — user just talks. | ✓ Good — natural language works well for all operations |
| Metaphysical branding | The burrow is infinite and recursive. Something fast lives in it. The name sells the concept; the code rewards the curious. | ✓ Good — mongoose easter egg in lib/mongoose.cjs |
| Depth-configurable rendering | One view model with a depth parameter. No separate "pan" vs "drill" concepts — just different depths of the same tree. | ✓ Good — `--depth N` covers all use cases |
| Pretty-print default, no --json flag | CLI outputs human-readable tree by default. Removed --json flag — agent reads cards.json directly for structured data. | ✓ Good — simpler CLI, agent gets structured data from source |
| Standalone addon, not GSD core modification | Survives `/gsd:update`, installable in any project independently | ✓ Good — install.cjs copies into target project |
| Per-project scope only | Keeps contexts isolated, simpler data model | ✓ Good — `.planning/burrow/` per project |
| Rename notes → body | Generic free-form content field. Can store descriptions, instructions, rationale. Parent body can describe schema of children. | ✓ Good — self-documenting tree structures |

---
*Last updated: 2026-03-09 after v1.0 milestone*
