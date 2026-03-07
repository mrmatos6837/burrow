# Phase 2: Views and Features - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Depth-configurable tree rendering, archive system, and data model simplification. Users can view any slice of the tree at any depth, archive/unarchive items, and the data model drops position/ordering in favor of implicit array order. Search is NOT a CLI feature -- the agent ingests the tree and searches in memory. Burrow is a structured dataset and a view renderer, not a query engine.

</domain>

<decisions>
## Implementation Decisions

### Data model changes (affects Phase 1 code)
- **Drop `position` field** from items -- array index IS the display order
- **Drop `ordering` field** from containers -- no more `custom`/`alpha-asc`/`alpha-desc`
- **Rename `notes` to `body`** -- generic free-form content field, not just "notes"
- Item schema becomes: `{id, title, created, archived, body, children[]}`
- Sorting is a move operation -- the agent rearranges items in whatever order the user asks
- `recompact()`, `getOrderedChildren()`, and position/ordering logic simplify or go away

### Body field purpose
- The `body` field stores anything: bug descriptions, future ideas, agent instructions, format guidance
- A parent item's body can instruct the agent on how to interpret its children (e.g., "Store bugs here. Title = short description. Body = repro steps.")
- The agent reads body content to understand structure and purpose of subtrees

### Render data shape
- CLI returns a **flat render array** for view operations
- Each item in array: `{id, title, depth, descendantCount, hasNotes, notesPreview, created, archived}`
- `hasNotes` = boolean indicating body has content (field name kept as hasNotes in render output for brevity, maps to body)
- `notesPreview` = first ~80 chars of body truncated
- Archived items **excluded by default** from render views
- Focused subtree renders the **focused item as root** plus **ancestry breadcrumbs** for orientation

### Breadcrumbs
- When viewing a focused subtree, include ancestry path so the user knows where they are
- Breadcrumb presentation at Claude's discretion (header line, path string, etc.)
- Breadcrumbs don't need to be in the same place as the rendered items

### Depth model
- `get <id>` -- item full details + direct children listed with (N) descendant counts
- `get <id> --depth N` -- N levels of full child details; depth = distance from requested item
- `--depth 0` = infinite / no cutoff -- shows the full tree from that point down
- Items at the depth cutoff boundary show `(N)` total active descendant count
- No flag = item details + direct children (equivalent to depth 1 behavior)

### Archive behavior
- **Cascade archive** -- archiving a parent archives all descendants
- **Cascade unarchive** -- symmetrical, restores the whole subtree
- Descendant counts only count **active (non-archived) items**
- Archived items viewed in their **original tree position** (not flattened) when requested via flag

### Search philosophy
- **No search CLI command** -- the agent ingests the tree via `get` and searches in memory
- Agent and human use the **same interface**; the agent's advantage is bulk ingestion via `get --depth 0`
- Agent optimizes token consumption with smart depth queries
- Agent can cache frequently-used item IDs/shortcuts in its own context (e.g., conversation memory, CONTEXT.md)

### CLI command surface
- **`get`** is the universal view command -- no separate `render`, `list`, `dump`, or `view` commands
  - `get` (no args) -- root items + direct children
  - `get <id>` -- item details + direct children
  - `get <id> --depth N` -- N levels deep
  - `get --depth 0` -- full tree, no cutoff
- **`list`** -- alias for `get` (backward compat)
- **`dump`** -- alias for `get --depth 0` (convenience)
- **`children`** -- alias into `get` (backward compat)
- **`archive <id>`** -- new, cascades to all descendants
- **`unarchive <id>`** -- new, cascades to all descendants
- **`path`** -- folded into `get` output as breadcrumbs; standalone `path` kept as lightweight alias
- Phase 1 commands unchanged: `add`, `edit`, `delete`, `move`
- **Stateless CLI** -- no persistent working directory; agent holds context conversationally

### Size and limits
- No artificial limits on tree size -- the limit is the user's machine capabilities
- Safe guardrails that **warn** but don't block (e.g., "Tree has 5000+ items, consider using --depth to limit ingestion")
- Agent is smart about queries to optimize token consumption
- Agent can store shortcuts to frequently-accessed burrow items in its working context

### Claude's Discretion
- Breadcrumb presentation format
- Render array field naming and exact shape
- Warning thresholds for large trees
- How aliases map internally (thin wrappers vs switch cases)
- Error messages and edge case handling

</decisions>

<specifics>
## Specific Ideas

- Same interface for humans and agents -- the difference is that agents can ingest the full state into memory (or up to a depth/memory threshold), then use direct ID-based commands instead of navigating step by step
- Body field as agent instruction mechanism: parent items can describe the schema/purpose of their children, creating self-documenting tree structures
- "The burrow is a structured dataset and a view renderer" -- this is the mental model for what CLI commands should and shouldn't do

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `mongoose.cjs`: `findById()`, `getPath()`, `countDescendants()` -- all directly useful for render/archive
- `core.cjs`: `output()`, `errorOut()`, `generateId()`, `collectAllIds()` -- unchanged
- `warren.cjs`: `load()`, `save()` -- unchanged (atomic write pattern)

### Code to Simplify
- `recompact()` -- remove entirely (no position field)
- `getOrderedChildren()` -- simplify to just return `container.items` (array order is truth)
- `addItem()` -- remove position calculation logic
- `moveItem()` -- remove position assignment, just splice and insert
- `editItem()` -- remove `ordering` param, add `body` (was `notes`)

### Integration Points
- CLI router in `burrow-tools.cjs` -- add `archive`/`unarchive` cases, enhance `get` with `--depth` flag, add alias routing
- Phase 3 (Agent Interface) will consume `get --depth N` as its primary read mechanism

</code_context>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 02-views-and-features*
*Context gathered: 2026-03-07*
