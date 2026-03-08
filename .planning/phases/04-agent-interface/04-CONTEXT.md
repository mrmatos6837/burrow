# Phase 4: Agent Interface - Context

**Gathered:** 2026-03-08 (updated)
**Status:** Ready for planning

<domain>
## Phase Boundary

Workflow file and slash commands for natural language and direct interaction with Burrow. The agent interprets intent, calls CLI operations, and presents results. This phase builds on Phase 3's finalized output contract (human-readable default, --json for raw). Burrow is an independent tool with its own `/burrow:*` command namespace — not bundled with GSD.

</domain>

<decisions>
## Implementation Decisions

### Command namespace and independence
- Burrow is its own tool, not a GSD addon. Commands use `/burrow:*` namespace
- `/burrow` — NL parser (main entry point). With no args, shows root view at depth 1
- `/burrow:help` — usage examples and command reference
- Full shortcut surface — every CLI operation gets a direct slash command:
  - `/burrow:add`, `/burrow:show`, `/burrow:edit`, `/burrow:move`
  - `/burrow:delete`, `/burrow:archive`, `/burrow:unarchive`, `/burrow:dump`
- GSD integration deferred to v2 — Burrow ships standalone, GSD doesn't know about it yet
- REQUIREMENTS.md needs updating to reflect `/burrow:*` namespace and expanded command surface

### Shortcut command design
- Shortcuts require structured parameters — no NL interpretation. Mirror CLI tool flags exactly
  - `/burrow:add --title "login bug" --parent a1b2c3d4`
  - `/burrow:show a1b2c3d4 --depth 2`
  - `/burrow:edit a1b2c3d4 --title "new name"`
  - `/burrow:move a1b2c3d4 --to b5c6d7e8`
  - `/burrow:delete a1b2c3d4`
  - `/burrow:archive a1b2c3d4`
  - `/burrow:unarchive a1b2c3d4`
  - `/burrow:dump` (alias for show --depth 0)
- `/burrow` is the only command that accepts plain English. It parses intent, clarifies if needed, then runs structured commands on the user's behalf
- When `/burrow` parses NL, it shows what command it's running (transparency, teaches shortcuts)

### Agent rendering — pass through tool output
- Agent runs CLI without --json and passes rendered output straight to the user. Tool's formatting IS the user experience
- Agent never re-renders or reformats tool output. One rendering path, one look
- For multi-step operations: agent writes a plain English summary of changes, then runs one or more `get` commands to show the end state from the best perspective
- Agent uses --json behind the scenes when it needs to parse data (e.g., resolve card IDs, check tree state), but never shows raw JSON to the user unless explicitly asked

### Natural language intent parsing (from prior context, confirmed)
- Ambiguity handling: Always clarify before acting — never guess
- Multi-step operations: Chain CLI calls, then summarize + show end state
- Card reference resolution: Fuzzy title match via tree ingest, clarify on multiple matches
- Missing card handling: Offer to create
- Bulk operations: Confirm before executing
- Default depth: Depth 1 (card + direct children)
- Session memory: Track what was last shown, resolve relative references
- Proactive suggestions: Suggest but never act — wait for approval

### Agent guardrails — short invariant list
- Hard rules (invariants):
  1. Never delete without confirmation
  2. Never modify data without explicit user request
  3. Always clarify ambiguous card references — never guess
  4. Always use tool output for card rendering — never re-render
  5. Never show raw JSON unless the user asks for it
  6. Read before write — ingest tree state before mutations (skip for very large trees if token-expensive)
- Soft guidelines:
  - Suggest improvements when patterns emerge (e.g., "bugs has 20 flat children, want me to group them?")
  - Show context views after multi-step operations
  - Keep prose terse and functional — no personality, no burrow metaphors
  - For positional references ("the third one"), use judgment based on recent context
- Data integrity: Tool handles it (atomic writes, .bak files). Agent doesn't need to double-check
- Tone: Functional and terse. "Added 'OAuth bug' under bugs."

### Workflow file structure
- Claude's discretion on organization, section layout, and number of worked examples
- Must include: the hard invariant list, command reference, and worked examples
- File location: Claude's discretion (workflow in .claude/burrow/ or as the main /burrow command file)

### Claude's Discretion
- Workflow file organization and section layout
- Number and selection of worked examples
- Whether shortcut commands are thin wrappers or self-contained
- Command file locations (.claude/commands/burrow/ vs .claude/burrow/commands/)
- Whether to include a brief data model section in the workflow
- When to show more or less context after mutations
- How to handle edge cases not covered by rules

</decisions>

<specifics>
## Specific Ideas

- User said: "it's very important to me that this tool feels consistent. It should behave in predictable and expected ways and I believe if we keep the set of rules to a minimal and design clear and elegant interfaces we can achieve that"
- Burrow should be its own thing — GSD just learns how to use it, not the other way around
- /burrow NL parser should show what command it ran — transparency builds trust and teaches the user the shortcuts
- "the agent should always read before write" (if it doesn't take too long or consume too many tokens)
- For multi-step: "agent can work on a summary in plain english and then trigger a get from a perspective that would get all the changes"

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `burrow-tools.cjs`: Full CLI router with all CRUD + view + archive commands, --json global flag, pretty-print rendering
- `lib/mongoose.cjs`: Tree operations (renderTree, addCard, editCard, deleteCard, moveCard, archiveCard, findById, getPath)
- `lib/warren.cjs`: Atomic storage (load/save with .bak backup)
- `lib/render.cjs`: Pure render functions (renderCard, renderMutation, renderPath, renderError) — returns strings, no side effects
- `lib/core.cjs`: JSON output helpers (output/errorOut) used in --json mode

### Established Patterns
- CommonJS (.cjs), util.parseArgs, sync fs, zero dependencies
- JSON output contract: `{success: true, data: {...}}` or `{success: false, error: "...", code: "..."}`
- CLI commands: add, edit, delete, move, get, dump, path, archive, unarchive
- Pretty-print is default, --json bypasses rendering
- --full flag shows complete body without truncation

### Integration Points
- Workflow file will be referenced by all /burrow:* command .md files
- Slash commands live in `.claude/commands/` (standard Claude Code location)
- Agent consumes tool's rendered output by default, --json when it needs to parse data programmatically

</code_context>

<deferred>
## Deferred Ideas

- GSD integration (teaching GSD about Burrow) — deferred to v2 per PROJECT.md and user confirmation
- Color/ANSI support — could add later with --color flag
- Search command — agent ingests full tree and searches in memory (per REQUIREMENTS.md out-of-scope)

</deferred>

---

*Phase: 04-agent-interface*
*Context gathered: 2026-03-08 (updated — Phase 3 complete, namespace and guardrails finalized)*
