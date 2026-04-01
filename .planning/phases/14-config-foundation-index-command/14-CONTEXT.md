# Phase 14: Config Foundation + Index Command - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Config system (`lib/config.cjs`) with get/set/list API and persistent `config.json`, plus `burrow index` command for lightweight JSON tree output. Config and index are independent building blocks in this phase — they get wired together in Phase 16 (Workflow LOAD Step).

</domain>

<decisions>
## Implementation Decisions

### Config Defaults
- **D-01:** Default loadMode is `auto` — checks cards.json size and picks full or index
- **D-02:** Auto-threshold is token-based, default 4000 tokens. Stored as token count in config, estimated from file size (~4 chars/token). Implementation must note that token count is an estimate, not actual tokenization
- **D-03:** Closed schema — only known keys (`loadMode`, `autoThreshold`) are accepted. `set` rejects unknown keys with an error listing valid keys
- **D-04:** Validation on set — invalid values rejected immediately with valid options listed. Invalid data never hits disk

### Config File Format
- **D-05:** Flat key structure — `{"loadMode": "auto", "autoThreshold": 4000}`, no nested objects
- **D-06:** Write-time defaults merge — on first creation (install/upgrade), config.json is written with all default values. File always has every key
- **D-07:** Config.json created during install or upgrade only — not lazily on first config command
- **D-08:** No version field in config.json — keep it simple, handle future migration by presence/absence of keys
- **D-09:** Atomic writes via shared `atomicWriteJSON()` extracted to `core.cjs` — used by both `warren.cjs` and `config.cjs`

### CLI Surface
- **D-10:** Git-style subcommands: `burrow config get <key>`, `burrow config set <key> <value>`, `burrow config list`
- **D-11:** `config get` outputs raw value only (e.g., just `auto`) — easy for agent and scripts to parse
- **D-12:** `config list` outputs a rendered box via `render.cjs` — consistent with other burrow command styling
- **D-13:** `config set` prints brief confirmation: `loadMode = auto`

### Index Command
- **D-14:** `burrow index` is a separate command from `dump` — distinct purpose, different default behavior
- **D-15:** Nested tree output (mirrors cards.json structure) stripped to: id, title, childCount, hasBody (boolean), archived flag, children array
- **D-16:** Human-readable minimal tree by default; `--json` flag for raw JSON output (agent uses this during session-start loading)
- **D-17:** Output goes through `render.cjs` — a `renderIndex()` function handles both human-readable and JSON formats
- **D-18:** Supports `--depth N` to limit output depth and `--include-archived` to include archived cards

### Error Handling
- **D-19:** All errors go through `render.renderError()` via existing `handleError()` — consistent error styling across all commands
- **D-20:** Unknown config key → error listing valid keys: "Unknown config key 'foo'. Valid keys: loadMode, autoThreshold"
- **D-21:** Missing config.json → error directing to installer: "No config.json found. Run npx create-burrow to set up."

### Testing
- **D-22:** Match existing test pattern: `test/config.test.cjs` for lib unit tests, new cases in `test/cli.test.cjs` for config+index CLI integration. Same tmpDir/beforeEach/afterEach pattern

### Config + Index Interaction
- **D-23:** Config and index are independent in Phase 14 — index uses CLI flags only, does not read config. Phase 16 workflow wires them together

### Claude's Discretion
- Exact renderIndex() formatting for human-readable mode
- Whether atomicWriteJSON() includes backup file creation or just tmp+rename
- Internal config schema definition structure (enum arrays, etc.)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Config system
- `.planning/REQUIREMENTS.md` — CFG-01 through CFG-05: config file requirements, defaults-merge, atomic writes, upgrade safety, auto-mode threshold
- `.planning/ROADMAP.md` §Phase 14 — Success criteria for config get/set/list and upgrade preservation

### Index command
- `.planning/REQUIREMENTS.md` — IDX-01 through IDX-03: index output format, depth limiting, archive inclusion
- `.planning/ROADMAP.md` §Phase 14 — Success criteria for index JSON output and flag behavior

### Existing patterns
- `.claude/burrow/lib/warren.cjs` — Atomic write pattern (tmp + rename + backup) to replicate/extract
- `.claude/burrow/lib/core.cjs` — ensureDataDir(), generateId() — atomicWriteJSON() will be added here
- `.claude/burrow/burrow-tools.cjs` — CLI parseArgs pattern, handleError(), writeAndExit() for new commands
- `.claude/burrow/lib/render.cjs` — renderError(), renderCard() patterns for renderIndex() and renderConfigList()
- `test/warren.test.cjs` — Test pattern (tmpDir, node:test, node:assert/strict) to follow

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `warren.cjs` save(): atomic write with tmp+rename+backup — pattern to extract into core.cjs as `atomicWriteJSON()`
- `core.cjs` ensureDataDir(): creates `.planning/burrow/` directory — config.json lives here
- `render.cjs`: renderError(), renderCard() — patterns for new renderIndex() and renderConfigList() functions
- `burrow-tools.cjs` handleError()/writeAndExit(): CLI scaffolding for new config and index command cases

### Established Patterns
- All CLI commands use `parseArgs()` from `node:util` with strict mode
- All output goes through render.cjs functions — never raw console.log
- Storage uses `.planning/burrow/` directory (ensureDataDir)
- Tests use `node:test` describe/it with tmpDir setup/teardown

### Integration Points
- `burrow-tools.cjs` switch statement: new `case 'config'` and `case 'index'` entries
- `core.cjs`: new `atomicWriteJSON()` export, warren.cjs refactored to use it
- `render.cjs`: new `renderIndex()` and `renderConfigList()` exports
- `lib/config.cjs`: new module — get(), set(), list(), load(), save()
- `install.cjs`: must create config.json with defaults during install/upgrade (Phase 17 wires this, but config.cjs API must support it)

</code_context>

<specifics>
## Specific Ideas

- Token count is an *estimate* from file size, not actual tokenization — document this clearly in config and in any user-facing help text
- `burrow index` is the agent's cheap entry point: `--json` flag during loading, human-readable by default for the user
- Config.json is "sacred" like cards.json — never overwritten on upgrade
- The `dump` command stays as-is (full pretty-print). `index` is the lightweight alternative, not a replacement

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-config-foundation-index-command*
*Context gathered: 2026-04-01*
