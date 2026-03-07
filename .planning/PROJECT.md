# Burrow

## What This Is

A general-purpose agent-navigated nested list tool for Claude Code. Burrow stores everything as items that can contain items — infinitely nestable, like Workflowy — but instead of a human struggling to navigate deep trees, the AI agent is the navigator. The user talks naturally ("show me all my bugs with details", "add a note under the OAuth issue"), and the agent traverses, renders, and manipulates the tree. It sits in the sweet spot between a flat todo list and a full project manager: enough structure to stay organized, zero ceremony. V1 ships as a GSD addon with GSD commands; the core engine is designed to be adapter-agnostic for future Claude Code plugin packaging.

### Branding

There's a hole in the ground next to your project. Not a real one — a metaphysical one. Chuck any thought into it and it's stored before you finish the sentence. Need it back? Already there. It doesn't matter how deep the thought was buried, or how many thoughts are nested inside other thoughts inside other thoughts — the burrow goes down forever and it doesn't care. It works at the speed of not-thinking-about-it.

That's the model. The **burrow** is infinitely recursive and metaphysical — it holds whatever structure your mind wants to throw at it. Something in the hole stores, retrieves, rearranges, and navigates at a speed that makes the whole thing feel like it was always just *there*. You'll never need to think about what. That's the point.

<!-- If you're reading the source and wondering what lives in the hole: check lib/mongoose.cjs. It's fast. It built the tunnels. It doesn't need credit. -->

## Core Value

One recursive data structure — items containing items — navigated by an agent that can traverse, summarize, and render any slice of the tree at any depth, on demand. The human sees exactly what they need; the agent handles the complexity.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. -->

- [ ] Infinitely nestable items (each item can contain child items)
- [ ] Single JSON storage (`items.json`) — one file, all data, fast and deterministic
- [ ] CLI helper (`burrow-tools.cjs`) returns structured JSON for all operations
- [ ] Depth-configurable rendering: indented list with cutoff, collapsed descendant counts shown as `(N)`
- [ ] Natural language navigation via `/gsd:burrow` (agent interprets intent, picks depth/focus)
- [ ] Direct shortcut commands for common operations
- [ ] Archive system: archived items hidden from active views but searchable
- [ ] Search across all items at any depth
- [ ] Per-project scope (`.planning/burrow/`)
- [ ] GSD adapter: commands registered as `/gsd:burrow`, `/gsd:bw-*` shortcuts

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Web UI, database, external dependencies — runs entirely in Claude Code's terminal
- Priority scores or sorting algorithms — tree structure IS the organization
- Integration with external task managers — Burrow IS the task manager
- Multi-user or sync features — single dev + agent, local files
- Interactive TUI (full-screen) — nested TUI breaks agent output model
- Due dates, recurring tasks, custom fields — use nesting and natural text instead
- GSD workflow integration (reconciliation, auto-tracking) — deferred to v2

## Context

Burrow is a standalone tool that ships as a GSD addon for v1. It lives outside `.claude/get-shit-done/` so it survives `/gsd:update`. The core engine is adapter-agnostic — GSD commands are one adapter; a generic Claude Code plugin adapter can be built later.

**Data model:**
One recursive type: items containing items. No separate concepts for "buckets", "tags", or "categories" — those are just items at different depths. The user decides what the tree means.

```json
{
  "version": 1,
  "ordering": "custom",
  "items": [
    {
      "id": "a1b2c3d4",
      "title": "bugs",
      "position": 0,
      "created": "2026-03-06T14:30:00Z",
      "archived": false,
      "notes": "",
      "children": {
        "ordering": "custom",
        "items": [
          {
            "id": "e5f6g7h8",
            "title": "Login redirect broken",
            "position": 0,
            "created": "2026-03-06T14:35:00Z",
            "archived": false,
            "notes": "OAuth callback sends to /dashboard instead of original page",
            "children": {
              "ordering": "custom",
              "items": [
                {
                  "id": "i9j0k1l2",
                  "title": "Root cause: callback URL not stored in session",
                  "position": 0,
                  "created": "2026-03-06T15:00:00Z",
                  "archived": false,
                  "notes": "",
                  "children": { "ordering": "custom", "items": [] }
                }
              ]
            }
          }
        ]
      }
    }
  ]
}
```

**Rendering model:**
Indented list with configurable depth cutoff. Items beyond the cutoff collapse into a descendant count `(N)` — total items at all depths below that point.

```
depth=1:
  bugs ...................... (5)
  features .................. (3)
  research .................. (4)

depth=2:
  bugs
    * Login redirect broken
    * API timeout ........... (2)
    * Dark mode flicker
    * Sidebar overlap
    * Auth token race
```

**Addon code:**
```
.claude/burrow/
  burrow-tools.cjs       # CLI helper (CRUD, tree traversal, rendering data)
  workflows/burrow.md    # Agent workflow (all interaction)
```

**GSD adapter (commands):**
```
.claude/commands/gsd/
  burrow.md              # /gsd:burrow — natural language
  bw-add.md               # /gsd:bw-add
  bw-show.md              # /gsd:bw-show
  bw-move.md              # /gsd:bw-move
  bw-archive.md           # /gsd:bw-archive
```

**Data:**
```
.planning/burrow/
  items.json              # The entire tree
```

## Constraints

- **Runtime**: Node.js built-in APIs only — zero npm dependencies
- **Storage**: Single JSON file (`items.json`) — atomic writes (tmp + rename)
- **Independence**: Must not modify any files inside `.claude/get-shit-done/`
- **GSD compatibility**: Works alongside GSD v1.22.4+ without conflicts
- **Context efficiency**: CLI returns structured JSON; agent does rendering and navigation

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Nested list model (not buckets + tags) | One recursive concept replaces three separate models. Simpler data, simpler code, more flexible. Agent handles navigation complexity. | -- Pending |
| Single JSON storage | One file read per operation. No YAML parsing, no directory enumeration. Fast, minimal, deterministic. | -- Pending |
| Position + ordering per parent | Each item has a `position`; each parent has `children.ordering` (custom/alpha-asc/alpha-desc). Moves are deterministic. | -- Pending |
| Plain JS for v1 | Schema is small enough that TS types don't buy much. Upgrade to TS if/when plugin packaging happens. | -- Pending |
| General-purpose core + GSD adapter | Core engine is adapter-agnostic. GSD commands are v1 adapter. Opens path to standalone Claude Code plugin. | -- Pending |
| Agent-as-navigator | Humans struggle with deep trees (Workflowy problem). Agents don't. The agent picks depth, focus, and rendering — user just talks. | -- Pending |
| Metaphysical branding | The burrow is infinite and recursive. Something fast lives in it. The name sells the concept; the code rewards the curious. | -- Pending |
| Depth-configurable rendering | One view model with a depth parameter. No separate "pan" vs "drill" concepts — just different depths of the same tree. | -- Pending |
| Standalone addon, not GSD core modification | Survives `/gsd:update`, installable in any project independently | -- Pending |
| Per-project scope only | Keeps contexts isolated, simpler data model | -- Pending |

---
*Last updated: 2026-03-07 — renamed from Todobox to Burrow*
