# Phase 4: Agent Interface - Context

**Gathered:** 2026-03-08
**Status:** Partial — shortcut design and guardrails not yet discussed (blocked on Phase 3 output contract)

<domain>
## Phase Boundary

Workflow file and GSD slash commands for natural language and direct interaction with Burrow. The agent interprets intent, calls CLI operations, and presents results. This phase builds on top of Phase 3's finalized output contract (human-readable default, --json for raw).

</domain>

<decisions>
## Implementation Decisions

### Natural language intent parsing
- **Ambiguity handling**: Clarify before acting — agent asks which operation the user meant before executing
- **Multi-step operations**: Yes, chain operations — agent breaks compound requests ("add a bugs card and put three items under it") into sequential CLI calls
- **Card reference resolution**: Fuzzy title match — agent ingests tree, fuzzy-matches card titles to NL references, falls back to clarification on multiple matches
- **Missing card handling**: Offer to create — "No 'design decisions' card found. Want me to create one?"
- **Bulk operations**: Yes, with confirmation — agent identifies matching cards, lists them, asks for confirmation before executing
- **Default depth**: Depth 1 (card + direct children) — matches CLI default
- **Session memory**: Yes — agent tracks what it last showed, resolves relative references ("the third one", "that card", "the last one I added")
- **Proactive suggestions**: Suggest but don't act — agent can notice patterns ("bugs has 20 flat children, want me to group them?") but waits for approval

### Workflow philosophy
- **Strict rules, creative freedom**: Workflow defines the "physics" of the burrow (schema shape, atomic writes, invariants) as hard rules. Agent improvises everything else within those bounds.
- **Include worked examples**: 5-10 example interactions showing full request→response flows to ground the agent's behavior
- **Not a fixed intent list**: Agent understands the structure and capabilities but runs free within the constraints

### Output rendering & tone
- **Tone**: Functional and terse — no personality, no burrow metaphors. "Added 'OAuth bug' under bugs."
- **Tree rendering**: Agent renders CLI output as indented list with plain indentation (spaces, no box-drawing characters)
- **Post-mutation context**: Smart — show tree context for adds/moves (where placement matters), confirm-only for edits/deletes/archives
- **Change highlighting**: Mark new/moved cards with annotations (← NEW, ← MOVED)
- **Card IDs**: Show inline on every card — e.g., "[a1b2c3d4] bugs (5)"
- **Body display**: Full body below title on focused views, no truncation
- **Metadata in tree views**: Title + descendant count + relative age ("2d ago")
- **Breadcrumbs**: Path header line — "root > bugs > OAuth issue"
- **Large trees**: Warn once on first encounter of too much data. Agent decides whether to truncate or warn. If user confirms they want everything, let it rip.
- **Empty subtrees**: Just show the card — no special "(empty)" treatment
- **Consistency**: Top priority. Predictable, expected behavior. Minimal rules, elegant interfaces.

**NOTE**: Many rendering decisions above may shift to Phase 3 (tool-level rendering) vs Phase 4 (agent presentation). To be revisited after Phase 3 context is gathered.

### Shortcut command design (PARTIAL — discussion paused)
- **Dual mode**: Every shortcut accepts both flags (for precision) and natural language fragments (for convenience). Agent detects mode by presence of flags.
- **Architecture**: Thin wrappers — each shortcut sets the intent and delegates to the main workflow file. One behavior definition, consistent across all entry points.
- **Naming convention**: `/gsd:burrow-{verb}` — burrow-add, burrow-show, burrow-move, burrow-archive, etc.
- **Full command surface**: Every CLI operation gets a direct shortcut command. `/gsd:burrow` is specifically the NL parser. Direct commands = explicit intent, NL command = agent interprets.
- **Tool output contract**: The tool always returns structured results. The workflow nudges the agent on how to present it, but agent has discretion.

### Agent guardrails (NOT YET DISCUSSED)
- Deferred — will discuss after Phase 3 output contract is locked

### Claude's Discretion
- Exact rendering format details (spacing, alignment)
- When to show more or less context after mutations
- How to handle edge cases not covered by rules
- Error message wording

</decisions>

<specifics>
## Specific Ideas

- User said: "it's very important to me that this tool feels consistent. It should behave in predictable and expected ways and I believe if we keep the set of rules to a minimal and design clear and elegant interfaces we can achieve that"
- The tool always returns structured JSON internally; a render function produces human-readable output by default; --json bypasses rendering (this is Phase 3's job, agent builds on top)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `burrow-tools.cjs`: Full CLI router with all CRUD + view + archive commands
- `lib/mongoose.cjs`: Tree operations (renderTree, addCard, editCard, etc.)
- `lib/warren.cjs`: Atomic storage (load/save)
- `lib/core.cjs`: Output helpers (output/errorOut)

### Established Patterns
- CommonJS (.cjs), util.parseArgs, sync fs, zero dependencies
- JSON output contract: `{success: true, data: {...}}` or `{success: false, error: "..."}`
- Flat subcommand router in burrow-tools.cjs

### Integration Points
- Workflow file will live at `.claude/burrow/workflows/burrow.md`
- Slash commands will live at `.claude/commands/gsd/burrow-*.md`
- Agent consumes Phase 3's rendered output (human-readable default) or --json for programmatic use

</code_context>

<deferred>
## Deferred Ideas

- Phase swap: Phases 3 and 4 were swapped during this discussion. Original Phase 3 (Agent Interface) became Phase 4. Original Phase 4 (CLI pretty-print) became Phase 3. Rendering needs to be locked before agent design.

</deferred>

---

*Phase: 04-agent-interface*
*Context gathered: 2026-03-08 (partial — blocked on Phase 3)*
