# Phase 16: Workflow LOAD Step + Load Command - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

The agent's session-start workflow reads `config.json` and branches to the correct loading behavior — full read, index-only, none, or auto-threshold — via a new `burrow load` command that serves as the universal dispatcher. The workflow's Step 1 (LOAD) is simplified to a single `burrow load` call. A new `lib/loader.cjs` module encapsulates all mode-branching logic.

</domain>

<decisions>
## Implementation Decisions

### Auto-Mode Threshold Logic
- **D-01:** Auto mode uses `fs.statSync()` to check cards.json file size — no file read needed for the size check
- **D-02:** Threshold comparison: file size in bytes / 4 = estimated tokens. If under `autoThreshold` (default 4000 tokens = ~16KB), load full. Otherwise, load index
- **D-03:** The threshold check and mode dispatching live inside `burrow load`, not in the workflow markdown

### `burrow load` Command
- **D-04:** `burrow load` is a universal dispatcher for ALL modes — workflow always calls this one command regardless of loadMode
- **D-05:** `burrow load` reads config.json, determines mode, and returns the appropriate output
- **D-06:** Config only, no flag overrides — `burrow load` always follows config.json. Change behavior by changing config
- **D-07:** Output is a JSON envelope to stdout: `{"mode": "<resolved>", "cardCount": N, "data": {...}}`. For auto mode, `mode` reflects what was actually chosen (full or index). For none mode, data is omitted but cardCount is included
- **D-08:** Logic lives in a new `lib/loader.cjs` module — dedicated module reads config, stats file, dispatches to full read or index build. `burrow-tools.cjs` gets a `case 'load'` that calls it

### Workflow LOAD Step
- **D-09:** Workflow Step 1 (LOAD) is replaced with a single `burrow load` call via Bash — replaces the current Read tool approach
- **D-10:** The agent parses the JSON envelope to know which mode was resolved and what data is available
- **D-11:** For none mode: agent notes that cards are available on demand via `burrow read` or `/burrow` and proceeds without loading data into context

### Index Depth at Runtime
- **D-12:** New `indexDepth` config key — controls `--depth N` flag passed to `burrow index` when loading in index mode
- **D-13:** Default `indexDepth` is 0 (unlimited) — full index tree, same as current Phase 15 behavior
- **D-14:** Power users with huge trees can set `burrow config set indexDepth 3` to cap depth
- **D-15:** `burrow load` passes `--depth N` to `burrow index` when `indexDepth > 0`

### Claude's Discretion
- Exact envelope field names and none-mode shape
- Whether loader.cjs imports from mongoose.cjs (buildIndex) or shells out to `burrow index`
- Error handling when config.json is missing (likely direct user to installer, consistent with config.cjs pattern)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Workflow
- `.claude/burrow/workflows/burrow.md` — Current LOAD/THINK/EXECUTE workflow to modify (Step 1 is the target)
- `.planning/REQUIREMENTS.md` — WFL-01 through WFL-06: workflow loading mode requirements

### Config system
- `.claude/burrow/lib/config.cjs` — Config load/save/get/set API, CONFIG_SCHEMA, DEFAULTS, TRIGGER_PRESETS
- `.planning/phases/14-config-foundation-index-command/14-CONTEXT.md` — Config decisions (D-01 through D-23)

### Index command
- `.claude/burrow/lib/mongoose.cjs` — buildIndex() function for index tree generation
- `.claude/burrow/burrow-tools.cjs` — CLI entry point, `case 'index'` for existing index command pattern

### Sentinel system
- `.claude/burrow/lib/installer.cjs` — generateSnippet(config) that produces mode-specific CLAUDE.md content — `burrow load` behavior must match what each snippet tells the agent
- `.planning/phases/15-claude-md-sentinel-variants/15-CONTEXT.md` — Sentinel decisions (D-01 through D-16)

### Roadmap
- `.planning/ROADMAP.md` §Phase 16 — Success criteria and requirements mapping

### Existing patterns
- `.claude/burrow/lib/core.cjs` — atomicWriteJSON, atomicWriteFile, ensureDataDir utilities
- `.claude/burrow/lib/warren.cjs` — Storage layer (load/save) that loader.cjs will call for full mode

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `config.cjs` load(): reads config.json with defaults merge — loader.cjs will call this
- `warren.cjs` load(): reads and returns full cards.json — loader.cjs calls for full mode
- `mongoose.cjs` buildIndex(): builds lightweight index tree — loader.cjs calls for index mode
- `burrow-tools.cjs` case 'index': existing index command pattern to reference for the new load case

### Established Patterns
- All CLI commands use `parseArgs()` from `node:util` with strict mode
- All output goes through render.cjs or direct `writeAndExit()` for JSON
- Config keys validated via closed CONFIG_SCHEMA — new `indexDepth` follows same pattern
- No external dependencies — Node.js built-ins only

### Integration Points
- `burrow-tools.cjs` switch: new `case 'load'` entry
- `lib/loader.cjs`: new module — load(cwd) function that returns the envelope object
- `lib/config.cjs` CONFIG_SCHEMA: add `indexDepth` key (type: number, default: 0, validate: non-negative integer)
- `workflows/burrow.md` Step 1: rewrite LOAD to call `burrow load` via Bash
- `installer.cjs` generateSnippet(): sentinel content for auto mode should reference `burrow load` (or may already be compatible)

</code_context>

<specifics>
## Specific Ideas

- The JSON envelope `{"mode": "full", "cardCount": 42, "data": {...}}` gives the agent everything in one shot — mode awareness + data + size context
- `burrow load` with zero flags keeps the command dead simple — a universal dispatcher that just does the right thing based on config
- `lib/loader.cjs` as a dedicated module keeps config.cjs focused on settings and loader.cjs focused on the dispatch logic
- The auto-mode stat() check is the cheapest possible path — no file read needed just to decide whether to read

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-workflow-load-step-load-command*
*Context gathered: 2026-04-02*
