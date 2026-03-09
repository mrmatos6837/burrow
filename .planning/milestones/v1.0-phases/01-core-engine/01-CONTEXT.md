# Phase 1: Core Engine - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Recursive tree data layer with CLI tool skeleton and single JSON storage. Users can create, read, update, delete, and move items in a recursive tree stored as a single JSON file, via a CLI tool that returns structured JSON. Rendering, search, archive, and agent commands are separate phases.

</domain>

<decisions>
## Implementation Decisions

### CLI command surface
- Flat subcommands: `add`, `edit`, `delete`, `move`, `get`, `children`, `list`, `path`
- ID is always the first positional argument (e.g., `burrow-tools.cjs get a1b2c3d4`)
- Flags for everything else (`--title`, `--notes`, `--parent`, `--position`, `--ordering`)
- `list` returns root items (no arg) or children of a parent (`list <parentId>`) — separate from `children` for semantic clarity
- Matches GSD's `gsd-tools.cjs` flat subcommand pattern

### Output contract
- Every response: `{success: true, data: {...}}` or `{success: false, error: "message"}`
- Mutations return the full item after mutation (add returns created item with ID/timestamps, edit returns updated item, delete returns deleted item's ID, move returns item in new location)
- Errors written as JSON to stdout (not stderr), exit code 1 still set for scripting
- Agent parses one stream — always stdout, always JSON

### Move & ordering behavior
- Position auto-calculated for alpha-sorted parents (`alpha-asc`, `alpha-desc`) — position field is ignored, items sort by title
- Position only matters for `custom` ordering
- Move to root is valid — item becomes a top-level burrow alongside siblings
- Sibling positions recompacted on move (no gaps — if [0,1,2] and 1 is moved, remaining become [0,1])
- Default insertion point for `custom`-ordered parents: end of list (highest position + 1)
- `--position N` flag to override default insertion point

### Init & empty state
- First command auto-creates `.planning/burrow/` directory and `items.json` — zero setup friction
- Initial `items.json`: `{version: 1, ordering: "custom", items: []}`
- Root level defaults to `custom` ordering
- Every new item's `children.ordering` defaults to `custom`
- Ordering changed via `edit <id> --ordering alpha-asc` — not specified at creation time

### Claude's Discretion
- Read operation depth behavior (how `get`, `children`, `list` handle nested children — depth flags, default depth)
- Internal module structure (single file vs lib/ modules)
- Error message wording and error categories
- Backup file rotation (just `.bak` or numbered backups)
- ID generation method (first 8 chars of UUID, random hex, etc. — must be 8-char hex per requirements)

</decisions>

<specifics>
## Specific Ideas

- Root level is "the surface" — multiple burrows exist side by side at the top level, each growing infinitely deep. No concept of "above" the root. The root is underground — you're always in the burrow.
- Mental model: adjacent burrows at root, infinite depth below. Tree grows down, never up.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `gsd-tools.cjs`: Reference implementation for CLI router pattern (flat subcommands, `util.parseArgs()`, JSON output)
- `lib/core.cjs`: Reference for output helpers, error formatting
- `lib/frontmatter.cjs`: Reference for file I/O patterns (though Burrow uses JSON, not YAML)

### Established Patterns
- CommonJS (`.cjs`) format — matches GSD convention
- `util.parseArgs()` for argument parsing (Node.js 22 built-in)
- Synchronous `fs` APIs for CLI that runs-and-exits
- Zero npm dependencies — Node.js built-in APIs only

### Integration Points
- CLI lives at `.claude/burrow/burrow-tools.cjs` (addon, outside GSD)
- Data lives at `.planning/burrow/items.json`
- Phase 2 (rendering) and Phase 3 (agent commands) will consume this CLI

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-core-engine*
*Context gathered: 2026-03-07*
