# Phase 15: CLAUDE.md Sentinel Variants - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the CLAUDE.md sentinel block dynamic — `generateSnippet()` replaces the hardcoded `CLAUDE_MD_SNIPPET` constant, and `writeSentinelBlock()` becomes crash-safe via atomic writes. The snippet content varies by loadMode and user-configured trigger words.

</domain>

<decisions>
## Implementation Decisions

### Snippet Content Per Mode
- **D-01:** Each loadMode (full/index/none/auto) gets a mode-specific paragraph explaining loading behavior — not just a one-liner. The agent needs clear instructions per mode (e.g., index mode explains lazy body fetching)
- **D-02:** Shared sections (mutations, privacy) stay constant across all modes — only the loading instruction and trigger words section change
- **D-03:** Index mode snippet uses `burrow index --json` with no depth flag — depth handling deferred to Phase 16 workflow LOAD step

### Configurable Trigger Words
- **D-04:** Trigger words (keywords that prompt the agent to create a Burrow card) are configurable via config.json, new `triggerWords` key
- **D-05:** Default trigger word set (broad): "remember", "don't forget", "always do X", "note this", "save this", "keep track of", "burrow this"
- **D-06:** Minimal option available: just "burrow this" — explicit, no ambiguity
- **D-07:** Empty/disabled trigger words = omit the trigger section from the snippet entirely. Agent won't auto-store from conversation keywords
- **D-08:** `generateSnippet()` takes the full config object (not just loadMode) and interpolates trigger words into the snippet

### Atomic Write Strategy
- **D-09:** New `atomicWriteFile(filePath, content)` function in `core.cjs` — generic text-level atomic write (tmp + rename), separate from `atomicWriteJSON()`
- **D-10:** `atomicWriteJSON()` remains its own function (handles JSON serialization) — does NOT become a wrapper around `atomicWriteFile()`. They share the tmp+rename pattern but are distinct functions since they do different things
- **D-11:** `writeSentinelBlock()` in installer.cjs refactored to use `atomicWriteFile()` for crash-safe CLAUDE.md writes

### Code Organization
- **D-12:** `generateSnippet()` lives in `installer.cjs` — replaces the `CLAUDE_MD_SNIPPET` constant. Co-located with existing sentinel logic (writeSentinelBlock, removeSentinelBlock)
- **D-13:** `atomicWriteFile()` lives in `core.cjs` alongside `atomicWriteJSON()` — shared utility layer

### Config Schema Expansion
- **D-14:** Add `triggerWords` key to `CONFIG_SCHEMA` in `lib/config.cjs` — type: array of strings, default: broad set (D-05)
- **D-15:** Add `triggerPreset` key to `CONFIG_SCHEMA` — enum: "broad" | "minimal" | "none" | "custom". Controls which trigger word set is active. Default: "broad"
- **D-16:** When `triggerPreset` is "custom", `triggerWords` array is user-defined. For "broad"/"minimal"/"none", the array is derived from the preset (not stored separately)

### Claude's Discretion
- Exact wording of each mode's paragraph in the snippet
- Whether `atomicWriteFile` and `atomicWriteJSON` share any internal helper or just duplicate the 3-line pattern
- How `triggerPreset` presets map to word lists internally (constants vs function)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Sentinel system
- `.claude/burrow/lib/installer.cjs` lines 8-25 — Current SENTINEL_START/END markers, hardcoded CLAUDE_MD_SNIPPET constant, and sentinel block helpers
- `.claude/burrow/lib/installer.cjs` lines 158-237 — writeSentinelBlock() and removeSentinelBlock() implementations to refactor
- `.planning/REQUIREMENTS.md` — SNP-01, SNP-02, SNP-03: sentinel variant requirements

### Config system
- `.claude/burrow/lib/config.cjs` — Existing config get/set/list API with closed CONFIG_SCHEMA
- `.claude/burrow/lib/core.cjs` lines 34-44 — atomicWriteJSON() pattern to parallel with atomicWriteFile()

### Roadmap
- `.planning/ROADMAP.md` Phase 15 — Success criteria (generateSnippet per mode, atomic writeSentinelBlock, mode change updates sentinel)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `installer.cjs` writeSentinelBlock(): already handles insert/replace/append of sentinel blocks — refactor to use atomicWriteFile() instead of raw fs.writeFileSync()
- `installer.cjs` removeSentinelBlock(): needs same atomic treatment
- `core.cjs` atomicWriteJSON(): pattern to follow (tmp + rename) for new atomicWriteFile()
- `config.cjs` CONFIG_SCHEMA: closed schema pattern to extend with triggerWords/triggerPreset keys
- `installer.cjs` detectLineEnding() and normaliseLineEndings(): already handle cross-platform line endings in sentinel content

### Established Patterns
- All config keys validated via closed schema (CONFIG_SCHEMA) — new keys follow same pattern
- Atomic writes use tmp+rename (core.cjs) — new text writes follow same approach
- Sentinel markers are HTML comments (`<!-- burrow:start -->` / `<!-- burrow:end -->`) — invisible in rendered markdown
- All exports grouped at bottom of each module

### Integration Points
- `install.cjs` (CLI entry): calls `writeSentinelBlock(claudeMdPath, CLAUDE_MD_SNIPPET)` — must change to `writeSentinelBlock(claudeMdPath, generateSnippet(config))`
- `installer.cjs` exports: add `generateSnippet` to exports, remove `CLAUDE_MD_SNIPPET`
- `config.cjs` CONFIG_SCHEMA: add triggerWords (array) and triggerPreset (enum) definitions
- `core.cjs` exports: add `atomicWriteFile`

</code_context>

<specifics>
## Specific Ideas

- "burrow this" as the signature trigger word — explicit, branded, no ambiguity
- Broader default set catches natural phrasing ("remember", "note this", etc.) but user can pare down to just "burrow this" for minimal mode
- No triggers = completely silent agent (no auto-card creation from conversation) — power user option
- Snippet should feel like the current one but tailored per mode — not a generic template with blanks filled in

</specifics>

<deferred>
## Deferred Ideas

- Index depth in snippet (`--depth N` from config) — deferred to Phase 16 workflow LOAD step where depth can be applied dynamically
- `/burrow:config` command for changing trigger words interactively — Phase 17 scope

</deferred>

---

*Phase: 15-claude-md-sentinel-variants*
*Context gathered: 2026-04-02*
