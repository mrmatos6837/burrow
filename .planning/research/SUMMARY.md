# Project Research Summary

**Project:** Burrow v1.3 — Onboarding & Configuration
**Domain:** CLI tool configuration system with context loading modes for an AI agent memory tool
**Researched:** 2026-04-01
**Confidence:** HIGH

## Executive Summary

Burrow v1.3 adds a configuration system, configurable context loading modes, installer onboarding prompts, and the `/burrow:config` command to the existing v1.2 foundation. The work is entirely self-contained within Node.js built-in APIs — no new external dependencies are introduced. Every capability needed (file I/O, JSON parsing, readline prompts, TTY detection) is already available in the current runtime (Node.js v22.14.0) and most of it is already in use by v1.2. The additions are architecture patterns and new modules, not new technology.

The recommended approach follows a strict dependency order: build `lib/config.cjs` first (the foundation all other features read from), then `burrow index` (the output that `index` and `auto` modes emit), then `burrow load` (the dispatcher that branches on loadMode), then CLAUDE.md snippet variants, then installer onboarding, then `/burrow:config`. This order is not arbitrary — each step unblocks the next, and building out of order creates rework. The minimum viable chain (Steps 1-3 plus the workflow update) already delivers the core token-reduction value. The remaining steps complete the user-facing configuration experience.

The primary risks are coherence failures, not implementation complexity. Three places simultaneously describe loading behavior: `config.json` (the setting), `burrow.md` (invocation-time instructions), and the CLAUDE.md sentinel block (session-start instructions). If any of these go out of sync, the agent receives conflicting instructions and silently does the wrong thing. Preventing this requires treating `config.json` writes and CLAUDE.md sentinel block updates as a single atomic transaction everywhere a mode change can occur — during install, during upgrade, and via `/burrow:config`.

## Key Findings

### Recommended Stack

Burrow v1.3 needs no new external libraries or Node.js APIs beyond what v1.2 already uses. Two new built-in API usages are added: `fs.statSync()` for the `auto` mode file-size threshold check, and explicit `process.stdin.isTTY` detection for non-interactive mode. All other additions — config JSON load/save, index tree walk, CLAUDE.md snippet generation — are pure JavaScript patterns using APIs stable since Node.js v0.1. The existing callback-style `readline` in `install.cjs` should not be migrated to `readline/promises`; it works correctly and migration is churn with no functional gain.

**Core technologies:**
- `node:fs` (readFileSync, writeFileSync, renameSync, statSync): config.json read/write with atomic write pattern — already established in warren.cjs
- `node:readline` (callback-style): loadMode prompt in installer onboarding — already in use, no changes to style
- `util.parseArgs()`: new `--set` option for `burrow config` subcommand — already in use for all other commands
- `process.stdin.isTTY`: explicit non-interactive detection for `--yes` fallback — implicit today, made explicit in v1.3
- `JSON.parse` / `JSON.stringify`: config.json read/write, `burrow index` output — no library needed

### Expected Features

The six v1.3 features form a coherent dependency chain. `burrow index` and `config.json` are the foundation; everything else builds on them.

**Must have (table stakes):**
- `burrow config get/set/list` — every CLI tool with settings provides this interface; users expect it
- Config persists across sessions — settings in a file, not in-memory; core utility requirement
- Defaults that work without config — first run must not require configuration; backward compatibility with v1.2 installs
- CLAUDE.md sentinel variant matches chosen loadMode — agent instructions must match the configured behavior or the agent is confused
- Workflow LOAD step is mode-aware — config has no effect if the workflow ignores it
- Installer asks about load mode — modern CLI installers prompt for key choices during setup

**Should have (differentiators):**
- `auto` load mode with threshold — agent dynamically selects index vs full based on tree size; no tuning required
- `burrow index` as ~95% token reduction — quantified value; titles + IDs only vs full cards.json is the core pitch for this milestone
- Onboarding prompt explains the tradeoff — informed user choice increases trust and feature adoption
- `/burrow:config` command — agent-native config interface; wraps CLI with natural language understanding

**Defer (v2+):**
- Named config profiles (dev/ci) — no current use case
- Config import/export — no current use case
- Threshold auto-tuning from usage history — over-engineered at this scale
- Per-user config overrides — single dev + agent use case; no multi-user scenario in scope

### Architecture Approach

The v1.3 architecture extends the existing module pattern cleanly. `lib/config.cjs` is a new sibling to `lib/warren.cjs` — both own a single JSON file in `.planning/burrow/`, both use the same atomic write pattern (tmp + rename), neither imports the other. The `burrow load` command is the runtime dispatcher that calls both `config.cjs` and `warren.cjs` and branches on `loadMode`. The `burrow index` command is a pure data command — it bypasses `render.cjs` entirely and emits raw JSON to stdout. The `stripToIndex()` function (3-5 lines) lives as an inline helper in `burrow-tools.cjs`, not in `mongoose.cjs` (which owns tree CRUD, not serialization).

**Major components:**
1. `lib/config.cjs` (NEW) — owns `config.json` read/write/validate/defaults; exports `load()`, `save()`, `get()`, `set()`, `DEFAULTS`
2. `burrow-tools.cjs` (MODIFIED) — adds `index`, `load`, and `config` subcommands; routes to config.cjs and warren.cjs
3. `lib/installer.cjs` (MODIFIED) — adds `generateSnippet(loadMode)` for three CLAUDE.md sentinel variants
4. `install.cjs` (MODIFIED) — adds loadMode prompt to interactive flow; calls `config.save()` after install
5. `workflows/burrow.md` (MODIFIED) — LOAD step reads config and branches; no longer hardcodes `cards.json`
6. `.claude/commands/burrow/config.md` (NEW) — thin `/burrow:config` slash command; pass-through to CLI

### Critical Pitfalls

1. **Non-defensive config load crashes on user hand-edit** — always wrap `JSON.parse` in try/catch; merge loaded config over `DEFAULTS` spread; validate enum fields; treat missing file as defaults, never as error. This is the foundation — get it wrong and every feature built on top is fragile. Address in Phase 1.

2. **CLAUDE.md sentinel block write is not atomic** — refactor `writeSentinelBlock()` to write-to-tmp then rename, same as `warren.cjs`. A crash during variant switching corrupts the agent's entire instruction set. Highest-severity data integrity risk in v1.3. Address in Phase 2.

3. **Config change and CLAUDE.md update are not atomic** — `/burrow:config set loadMode <value>` must update both `config.json` AND the CLAUDE.md sentinel block in a single transaction. If only one succeeds, the agent gets conflicting instructions across the same session. No partial success is acceptable. Address in Phase 4.

4. **Upgrade path overwrites user config** — `config.json` must live in `.planning/burrow/` (user data directory), not `.claude/burrow/` (source directory). The upgrade logic already preserves everything in `.planning/burrow/`. Placing config there is immune to `copyDirSync` overwrites by design. Address in Phase 1 (location decision) and Phase 4 (upgrade path test).

5. **Onboarding re-prompts on upgrade** — detect existing `config.json` on upgrade and skip all config prompts; preserve the user's settings. For pre-v1.3 upgrades where config.json is absent, create it with defaults and log a single notification line — no prompt. Address in Phase 4.

## Implications for Roadmap

Based on research, the dependency graph is unambiguous. Each phase must complete before the next can start. The minimum viable chain (Phases 1-3) delivers the core token-reduction feature end-to-end. Phase 4 completes the user-facing configuration experience.

### Phase 1: Config Foundation + Index Command

**Rationale:** Everything else reads from `config.json` or calls `burrow index`. Neither can be built without this phase complete. These two items can be built in parallel (index does not need config.cjs), but both must finish before Phase 2.
**Delivers:** `lib/config.cjs` with defensive load/save/validate/defaults; `burrow index` command emitting stripped JSON tree; `burrow config get/set/list` subcommand
**Addresses:** config persistence, config get/set/list (table stakes), `burrow index` ~95% token reduction (differentiator)
**Avoids:** Non-defensive config load crashing on user hand-edit (Pitfall 1); config file in wrong location overwritten on upgrade (Pitfall 4); schema instability from `burrow index` (Pitfall 6); config accidentally gitignored (Pitfall 10)

### Phase 2: CLAUDE.md Sentinel Variants

**Rationale:** Installer and `/burrow:config` both need `generateSnippet(loadMode)` from `installer.cjs`. This must exist before either the installer flow or the config command is built. Atomic write for `writeSentinelBlock()` is a correctness requirement that cannot be retrofitted after shipping.
**Delivers:** Three CLAUDE.md snippet variants (`full`, `index`, `auto`); `generateSnippet(loadMode)` export; atomic `writeSentinelBlock()` using tmp+rename
**Addresses:** CLAUDE.md sentinel variant matches chosen loadMode (table stakes)
**Avoids:** Non-atomic CLAUDE.md write corrupting agent instruction set (Pitfall 2); sentinel marker matched as substring in user content (Pitfall 2)

### Phase 3: Workflow LOAD Step + `burrow load` Command

**Rationale:** The workflow is the agent's operating procedure. Updating it to read `config.json` and branch on `loadMode` is what makes the entire config system meaningful at session time. `burrow load` is the programmatic entry point the workflow calls in `index` and `auto` modes. These must ship together to avoid the three-way coherence split (config.json, workflow, CLAUDE.md).
**Delivers:** `burrow load` command dispatching by loadMode; updated `workflows/burrow.md` LOAD step with conditional branches; `auto` mode threshold logic
**Addresses:** Workflow LOAD step is mode-aware (table stakes); `auto` mode (differentiator)
**Avoids:** Workflow ignoring config (Pitfall 3); CLAUDE.md and workflow giving conflicting instructions (Pitfall 3); auto-threshold checked at wrong time (Pitfall 8)

### Phase 4: Installer Onboarding + `/burrow:config` Command

**Rationale:** These are the user-facing entry points for setting the load mode. Both depend on Phases 1-3 being complete — config.cjs, snippet variants, and load command must all work before the installer can wire them together. The upgrade path correctness is only testable once fresh install works.
**Delivers:** loadMode prompt in interactive installer flow; `config.json` written on install; upgrade path preserves existing config; `/burrow:config` slash command; single notification line for pre-v1.3 upgrades
**Addresses:** Installer asks about load mode (table stakes); `/burrow:config` command (differentiator); informed onboarding prompt (differentiator)
**Avoids:** Installer upgrade path losing user config (Pitfall 4); re-prompting on upgrade (Pitfall 5); `/burrow:config` not updating CLAUDE.md (Pitfall 9); `--yes` hanging on new prompts (Pitfall 11)

### Phase Ordering Rationale

- Phase 1 first because it is the literal dependency for every other phase — config.cjs unblocks all config-reading features; `burrow index` unblocks `index` and `auto` modes
- Phase 2 before Phases 3 and 4 because `generateSnippet()` is called by both the installer (Phase 4) and workflow regeneration (Phase 3 side effect); atomic writes must be correct before any variant switching ships
- Phase 3 before Phase 4 because the installer's onboarding prompt must write a CLAUDE.md that actually works — the workflow and `burrow load` must be tested before the installer points users at them
- This ordering addresses all five critical pitfalls at the phase where each first becomes relevant, preventing rework

### Research Flags

Phases with standard patterns (skip research-phase):
- **Phase 1:** All patterns are derived directly from the existing codebase (warren.cjs atomic write, mongoose.cjs tree walk). No new research needed.
- **Phase 2:** `writeSentinelBlock()` already exists; this is a refactor + extension. Pattern is clear from existing code.
- **Phase 3:** Workflow conditional logic is straightforward markdown authoring. `burrow load` follows the same dispatch pattern as existing commands.
- **Phase 4:** Installer prompt follows existing readline pattern already in `install.cjs`. No new primitives.

No phases in this milestone require `/gsd:research-phase`. All patterns are either already in the codebase or directly analogous to existing patterns. Research confidence is HIGH across all areas.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All APIs verified on Node.js v22.14.0 in the running environment; all are stable built-ins already in use |
| Features | HIGH | Based on official CLI pattern docs (npm, git) and direct codebase inspection; token-cost estimates from multiple sources |
| Architecture | HIGH | Based on direct codebase inspection — all integration points traced through existing source files |
| Pitfalls | HIGH | Critical pitfalls grounded in Claude Code GitHub issues (documented real failures) and direct code review of installer.cjs and warren.cjs |

**Overall confidence:** HIGH

### Gaps to Address

- **`auto` mode hysteresis:** Research flags that mode flapping (tree grows past threshold, then shrinks below) may need hysteresis. If the complexity is unacceptable during implementation, defer `auto` mode to v1.4 and ship only `full` and `index` for v1.3. The architecture supports this deferral cleanly.
- **`lazy` mode naming vs `index` mode naming:** PITFALLS.md uses both `lazy` and `index` interchangeably for the "titles only" mode. The canonical name is `index` (as specified in STACK.md, FEATURES.md, and ARCHITECTURE.md). Confirm `lazy` is not used in any shipped code or documentation before releasing.
- **CLAUDE.md atomic write refactor scope:** `writeSentinelBlock()` currently uses `writeFileSync` directly (non-atomic). Treat the atomic refactor as a prerequisite for Phase 2, not a parallel task.

## Sources

### Primary (HIGH confidence)
- Node.js v22 `fs` docs (nodejs.org/api/fs.html) — statSync, readFileSync, writeFileSync, renameSync
- Node.js v22 `util.parseArgs()` (nodejs.org/docs/latest-v22.x/api/util.html) — already in use in burrow-tools.cjs
- Node.js v22 TTY docs (nodejs.org/api/tty.html) — process.stdin.isTTY behavior when piped
- Direct codebase inspection: burrow-tools.cjs, warren.cjs, core.cjs, render.cjs, installer.cjs, version.cjs, burrow.md, install.cjs
- npm config command docs (docs.npmjs.com/cli/v8/commands/npm-config/) — CLI config pattern baseline
- git config docs (git-scm.com/docs/git-config) — CLI config pattern baseline
- Claude Code CLAUDE.md docs (claude.com/blog/using-claude-md-files) — sentinel block behavior
- Claude Code GitHub issues #28809, #15608 — non-atomic write corruption documented in production

### Secondary (MEDIUM confidence)
- LLM context problem strategies — LogRocket 2026 — token cost estimates for large context loads
- LLM token optimization — Redis 2026 — index vs dump pattern quantification
- AI agent memory: index vs dump pattern — bswen 2026 — behavioral patterns for index-mode agents
- Context engineering for AI agents — Manus — session-start context loading patterns
- Claude Code GitHub issues #7336, #11364, #16458, #19105 — lazy loading failure rates (feature request threads)

### Tertiary (LOW confidence)
- Lazy-loaded prompt engineering patterns (gopubby.com) — "skill discovery fails 10-20% of the time" in lazy mode; single source, unverified

---
*Research completed: 2026-04-01*
*Ready for roadmap: yes*
