# Feature Landscape: Onboarding & Configuration (v1.3)

**Domain:** CLI tool configuration system, context loading strategies, installer onboarding flows — for an AI agent memory tool (Claude Code addon)
**Researched:** 2026-04-01
**Confidence:** HIGH

---

## Scope

This document covers features for Burrow v1.3 only. All v1.0–v1.2 features (CRUD, rendering, installer, npm package) are already shipped and out of scope here. The six target features are:

1. `burrow index` command — lightweight JSON tree output
2. Config system (`config.json`) — persistent settings
3. Installer onboarding prompts — loadMode choice during setup
4. `/burrow:config` command — view and change settings from within Claude Code
5. CLAUDE.md snippet variants — sentinel block adapts to loadMode
6. Workflow update (LOAD step) — respects loadMode at session start

---

## Table Stakes

Features users expect from a config system. Missing = product feels broken or incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| `config get <key>` | Every CLI with settings supports reading a single value (npm config get, git config get). | LOW | Read from config.json, print value |
| `config set <key> <value>` | Every CLI with settings supports writing a single value. Essential feedback loop for changing behavior. | LOW | Read → mutate → write config.json |
| `config list` (or no-arg) | `npm config list`, `git config --list`. Users expect to see all current settings at once. | LOW | Print all key-value pairs as formatted text |
| Config persists across sessions | Settings in a file, not in-memory. If you set loadMode=index, it stays index next session. | LOW | Atomic write to config.json (same pattern as cards.json) |
| Config file co-located with data | Tools like ESLint, Prettier, TypeScript all put config next to the data they configure. `.planning/burrow/config.json` alongside `cards.json`. | LOW | Eliminates XDG complexity; per-project scope already established |
| Defaults that work without config | First-run must not require config. If config.json is absent, sensible defaults apply. | LOW | `loadMode: "full"` default — backward compat, zero onboarding required |
| `burrow index` outputs skeletal tree | A lightweight listing of IDs and titles only, no bodies or children details. Standard pattern: "summary vs full" (e.g., `git log --oneline` vs `git log`). | MEDIUM | JSON output: `[{id, title, children: [{id, title}]}]` recursively |
| Installer asks about load mode | Modern CLI installers (create-react-app, create-next-app) prompt for key choices during setup rather than post-install configuration. | MEDIUM | Single prompt after existing install questions; skip with --yes |
| CLAUDE.md snippet reflects chosen mode | The agent's session-start instructions must match the configured behavior. Sending full-read instructions when mode is `index` wastes tokens and causes agent confusion. | MEDIUM | Two sentinel block variants; installer writes the right one |
| Workflow LOAD step is mode-aware | The workflow is the agent's operating procedure. If it always reads cards.json regardless of mode, the config has no effect. | MEDIUM | Conditional logic in `burrow.md` workflow |

---

## Differentiators

Features that go beyond baseline expectations and add meaningful value for this specific domain (AI agent tooling, token management).

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| `auto` load mode with threshold | The agent dynamically chooses index vs full based on tree size. No user decision needed — works well by default, scales gracefully. | MEDIUM | Read `autoThreshold` from config; if card count >= threshold, load index; else load full. Default threshold: 50 cards. |
| `burrow index` as ~95% token reduction | Full cards.json for a 100-card tree could be 20KB+ including bodies. Index output (IDs + titles only) is ~500 bytes. Quantified savings matter — this is the core pitch for the feature. | MEDIUM | Strip body, children details. Return nested `{id, title, children}` structure only. |
| `config.json` separate from `cards.json` | Config and data should be separate concerns. Mixing them (storing loadMode in cards.json) creates coupling, breaks schema validation, and complicates version migration. Separate file mirrors the standard pattern (package.json vs package-lock.json, .eslintrc vs src/). | LOW | New file: `.planning/burrow/config.json`. Schema: `{version, loadMode, autoThreshold}`. |
| Onboarding prompt explains the tradeoff | Most installers ask without explaining. A one-line explanation of "full = always reads everything (more context), index = reads titles only (95% fewer tokens)" lets users make an informed choice. | LOW | Print brief explanation before prompt. Increases trust. |
| CLAUDE.md sentinel variants are invisible in rendered markdown | Sentinel markers as HTML comments means the mode-specific instructions appear in Claude Code context but not in a rendered markdown preview. Same pattern as v1.2 sentinel blocks. | LOW | Already established pattern — extend it to two variants |
| `/burrow:config` command scoped to Claude Code | Unlike `burrow config` (CLI), the `/burrow:config` command is a Claude Code slash command — the agent reads current settings and presents them, then accepts a change instruction in natural language. This is the AI-native config UX vs the human-native CLI UX. | MEDIUM | New command file: `.claude/commands/burrow/config.md` |

---

## Anti-Features

Features explicitly excluded from this milestone, with rationale.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Global config (`~/.config/burrow/`) | Burrow is per-project by design. Global config adds scope ambiguity and breaks the "per-project isolation" principle established in v1.0. XDG compliance is irrelevant at single-project scope. | Keep config at `.planning/burrow/config.json` |
| Config schema migration / versioning beyond `version` field | Over-engineering for a 2-key config file (`loadMode`, `autoThreshold`). Adding migration logic before the schema has ever needed migration is premature. | Add a `version` field. If unknown version detected, warn and use defaults. |
| Interactive TUI config editor | Config has two settings. An interactive editor for two settings is more ceremony than the problem warrants. `burrow config set loadMode index` is sufficient. | `config get/set/list` subcommands. Simple. |
| Config hot-reload / watch mode | Config is read once at session start by the agent. Hot-reload adds complexity (file watchers, cache invalidation) with no benefit — Claude Code sessions are ephemeral. | Read config.json once per operation |
| Encrypted / sensitive config values | Burrow config has no secrets. loadMode and autoThreshold are operational preferences, not credentials. Encryption adds dependency surface (crypto is already available in Node built-ins but unnecessary here). | Plain JSON. No encryption. |
| Per-user config overrides | Single dev + agent use case. No multi-user scenarios in scope. Per-user overrides add precedence rules, merge logic, and debugging complexity. | One config file per project. |
| Config wizard with backtracking | Multi-step wizards with "go back" support (like create-react-app prompts) are over-engineered for a single-choice onboarding prompt. | One clear prompt, one answer. `--yes` skips it. |
| Storing config in CLAUDE.md | CLAUDE.md is for agent instructions, not machine-readable settings. Parsing structured data out of a markdown file creates a fragile dependency. | Separate `config.json`. CLAUDE.md reads from it (indirectly via agent instructions). |

---

## Feature Dependencies

```
[config.json]
    +--required-by--> [burrow config get/set/list]
    +--required-by--> [installer onboarding writes loadMode]
    +--required-by--> [workflow LOAD step reads loadMode]
    +--required-by--> [auto mode threshold check]

[burrow index command]
    +--required-by--> [index load mode in workflow]
    +--required-by--> [auto mode (calls index when above threshold)]
    depends-on--> [existing mongoose.cjs tree walk]

[installer onboarding prompt]
    +--writes--> [config.json with chosen loadMode]
    +--writes--> [CLAUDE.md with matching sentinel variant]
    depends-on--> [existing readline-based installer flow]

[CLAUDE.md sentinel variants]
    +--required-by--> [installer writing correct variant]
    +--required-by--> [/burrow:config changing mode (must update sentinel)]
    depends-on--> [existing sentinel block insert/remove in install.cjs]

[/burrow:config command]
    +--reads--> [config.json]
    +--writes--> [config.json via burrow config set]
    +--may-update--> [CLAUDE.md sentinel variant on mode change]
    depends-on--> [burrow config CLI subcommands existing]

[workflow LOAD step]
    +--reads--> [config.json to determine loadMode]
    +--calls--> [burrow index (if index or auto+above-threshold)]
    +--reads--> [cards.json directly (if full or auto+below-threshold)]
    depends-on--> [config.json, burrow index]
```

### Key Dependency Notes

- `burrow index` must exist before the workflow can use index mode. It is the foundation.
- `config.json` must exist (even with defaults) before anything else reads load mode. Bootstrap order: install writes config, then all other features read it.
- CLAUDE.md sentinel variants depend on config being written first — you can't write the right variant without knowing the chosen mode.
- `/burrow:config` changing the load mode must also update the CLAUDE.md sentinel, otherwise agent instructions become stale. This is the trickiest dependency: one action has two side effects (config.json write + CLAUDE.md update).
- `--yes` flag on installer must choose a default loadMode (`full` for backward compat) and write the full sentinel variant. No prompt, no ambiguity.

---

## Load Mode Behavioral Specification

This is domain-specific to AI agent tooling. The three modes must behave consistently across all entry points (installer, workflow, /burrow:config).

| Mode | Behavior | When to Use | Token Cost |
|------|----------|-------------|------------|
| `full` | Agent reads entire `cards.json` directly. All fields, all bodies, all children. | Small trees (<50 cards), or when bodies contain critical context needed frequently. | Baseline (~100% of tree size) |
| `index` | Agent runs `burrow index` first. Gets IDs + titles only. Drills into specific cards via `burrow read <id>` when needed. | Large trees (>50 cards), or when agent mostly navigates rather than reads bodies. | ~5% of full load |
| `auto` | Agent runs `burrow index` to count cards. If count < `autoThreshold`, loads full. If count >= threshold, stays in index mode. | Default recommendation. Works well without tuning. | Dynamic |

### Index Output Format

The `burrow index` command output must be machine-readable JSON (not pretty-print) since it is consumed by the agent, not displayed to a human. Format:

```json
{
  "count": 23,
  "cards": [
    {"id": "a1b2c3d4", "title": "bugs", "childCount": 3, "children": [
      {"id": "e5f6g7h8", "title": "Login redirect broken", "childCount": 0, "children": []}
    ]}
  ]
}
```

Top-level `count` enables the `auto` threshold check without additional traversal.

---

## Onboarding Prompt Specification

The installer already supports interactive (readline) and non-interactive (`--yes`) modes. The new prompt follows the same pattern.

### Prompt placement

After existing prompts (project dir confirmation, upgrade/repair detection), before writing files. The prompt informs the user, presents choices, and records the answer for config.json and CLAUDE.md variant.

### Prompt text (HIGH confidence this pattern works)

```
How should Burrow load your cards at session start?

  1. full   — Read everything. Agents see all cards, titles, and notes.
               Best for small trees. Higher token cost.
  2. index  — Read titles only. Agents fetch details on demand.
               Best for large trees. ~95% fewer tokens.
  3. auto   — Start with titles, load everything if tree is small (<50 cards).
               Recommended default.

Load mode [auto]:
```

User presses Enter = accepts default `auto`. Types `1`, `2`, or `3` = selects that mode.

### --yes behavior

Selects `auto` (the default) without prompting. Writes config.json with `{loadMode: "auto", autoThreshold: 50}`.

---

## CLAUDE.md Sentinel Variants

Two variants of the session-start LOAD instructions. Installer writes the correct one. `/burrow:config` swaps them when mode changes.

### Variant: full

```
<!-- burrow:start -->
## Burrow — Agent Memory

Burrow is your persistent memory. On every session start, silently read `.planning/burrow/cards.json` using the Read tool to load project context, tasks, and notes.
<!-- burrow:end -->
```

### Variant: index or auto

```
<!-- burrow:start -->
## Burrow — Agent Memory

Burrow is your persistent memory. On every session start, run `node .claude/burrow/burrow-tools.cjs index` to get the card tree (titles + IDs only). Load the full tree with the Read tool only when you need card bodies. Use `burrow read <id>` to fetch individual cards on demand.
<!-- burrow:end -->
```

The sentinel block content changes; the markers do not. This means the existing `removeSentinel` + `insertSentinel` pattern from install.cjs handles the swap without new primitives.

---

## /burrow:config Command Specification

The command is the agent-facing config interface. It does not replace `burrow config` (CLI) — it wraps it with natural language understanding.

### Behaviors the command must support

| User intent | Agent action |
|-------------|-------------|
| "show my config" / "what's the load mode?" | Run `burrow config list`, display output |
| "set load mode to index" | Run `burrow config set loadMode index`, confirm |
| "set threshold to 30" | Run `burrow config set autoThreshold 30`, confirm |
| "reset config to defaults" | Run `burrow config set` for each default, confirm |
| "change load mode" (ambiguous) | Ask which mode, then set |

On mode change, the agent must also update the CLAUDE.md sentinel block to match. This is the one non-trivial behavior — the command file must instruct the agent to call the installer's sentinel-swap utility or perform the swap manually.

---

## MVP Recommendation

Build in this order (phase sequencing rationale in SUMMARY.md):

1. **`burrow index` command** — Foundation. All other features depend on it.
2. **`config.json` system with `burrow config get/set/list`** — Required before anything reads loadMode.
3. **Workflow LOAD step update** — Makes the config meaningful at session start.
4. **CLAUDE.md sentinel variants** — Two variants exist; installer and config use them.
5. **Installer onboarding prompt** — Wires config + sentinel together at install time.
6. **`/burrow:config` command** — Runtime interface; depends on config CLI being solid.

Defer (v2+):
- Named config profiles (dev/ci) — no use case yet
- Config import/export — no use case yet
- Threshold auto-tuning based on usage history — over-engineered

---

## Sources

- [npm config command pattern](https://docs.npmjs.com/cli/v8/commands/npm-config/) — HIGH confidence (official docs)
- [git config pattern](https://git-scm.com/docs/git-config) — HIGH confidence (official docs)
- [Node.js readline module](https://nodejs.org/api/readline.html) — HIGH confidence (official docs)
- [LLM context problem and strategies — LogRocket 2026](https://blog.logrocket.com/llm-context-problem-strategies-2026) — MEDIUM confidence
- [LLM token optimization — Redis 2026](https://redis.io/blog/llm-token-optimization-speed-up-apps/) — MEDIUM confidence
- [AI agent memory: index vs dump pattern — bswen 2026](https://docs.bswen.com/blog/2026-03-13-ai-agent-memory-organization/) — MEDIUM confidence
- [Context engineering for AI agents — Manus](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus) — MEDIUM confidence
- [Using CLAUDE.md files — Anthropic](https://claude.com/blog/using-claude-md-files) — HIGH confidence (official docs)
- [Claude Code settings](https://code.claude.com/docs/en/settings) — HIGH confidence (official docs)
- [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir/latest/) — HIGH confidence (official spec, used to justify NOT adopting XDG for per-project scope)
- [Building an NPX script for project setup — GetStream](https://getstream.io/blog/npx-script-project-setup/) — MEDIUM confidence

---

*Feature research for: Burrow v1.3 — Onboarding & Configuration milestone*
*Researched: 2026-04-01*
