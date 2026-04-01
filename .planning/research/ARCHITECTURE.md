# Architecture: v1.3 Integration Points

**Domain:** Burrow — existing CLI tool, adding config system + new commands + onboarding flow
**Researched:** 2026-04-01
**Confidence:** HIGH (based on direct codebase inspection)

## Scope

This document covers only the integration concerns for v1.3: how `lib/config.cjs`, the `index` command, the `config` command, the `load` command, the updated installer onboarding, and the updated workflow fit into the existing architecture. It does not re-document what already exists and works.

---

## Existing Architecture (Stable Boundaries)

```
burrow-tools.cjs          ← CLI router (switch on command name)
  lib/core.cjs            ← ensureDataDir(), generateId()
  lib/warren.cjs          ← load(cwd), save(cwd, data)  [cards.json only]
  lib/mongoose.cjs        ← all tree CRUD (addCard, editCard, etc.)
  lib/render.cjs          ← all pretty-print output (no mongoose dependency)
  lib/version.cjs         ← checkForUpdate(), passive notification
  lib/init.cjs            ← burrow init command
  lib/installer.cjs       ← detect(), performInstall/Upgrade/Repair, sentinel mgmt
install.cjs               ← interactive onboarding (readline, calls installer.cjs)
```

Data scope for warren.cjs: `.planning/burrow/cards.json` only.

**Nothing in the existing lib/ touches `.planning/burrow/config.json`.** That file does not yet exist. It is the primary new artifact of v1.3.

---

## New Component: lib/config.cjs

### Role

Owns all reads and writes to `.planning/burrow/config.json`. Parallel to warren.cjs — warren owns `cards.json`, config owns `config.json`. The two are never cross-dependent.

### File it manages

```
.planning/burrow/config.json
```

### Schema (v1)

```json
{
  "version": 1,
  "loadMode": "full",
  "autoThreshold": 50
}
```

- `loadMode`: `"full"` | `"index"` | `"auto"`
  - `full` — agent reads `cards.json` on every LOAD step (current behavior)
  - `index` — agent runs `burrow index` instead; only titles + IDs
  - `auto` — agent checks card count; uses index if count > `autoThreshold`, otherwise full
- `autoThreshold`: integer, only meaningful when `loadMode === "auto"`

### API surface (what burrow-tools.cjs will call)

```javascript
// lib/config.cjs exports:
load(cwd)              // returns config object, applies defaults if file missing
save(cwd, config)      // atomic write (tmp + rename, same pattern as warren.cjs)
get(cwd, key)          // convenience: load then return config[key]
set(cwd, key, value)   // convenience: load, mutate, save
DEFAULTS               // exported constant: { version: 1, loadMode: 'full', autoThreshold: 50 }
```

### Integration with warren.cjs

No integration. They are sibling modules. Both use the same path convention (`.planning/burrow/<file>`) and the same atomic write pattern. Neither imports the other.

### Integration with core.cjs

`config.cjs` calls `ensureDataDir(cwd)` from core.cjs before writing, exactly as warren.cjs does. The data directory is guaranteed to exist before any write.

### Placement in module dependency graph

```
core.cjs
  ↑
  config.cjs    (new — parallel to warren.cjs)
  warren.cjs    (existing — unchanged)
```

---

## New Command: index

### What it produces

Lightweight JSON tree of titles and IDs only — no body, no created dates, no descendant counts.

```json
[
  {
    "id": "a1b2c3d4",
    "title": "bugs",
    "children": [
      { "id": "e5f6g7h8", "title": "Login redirect broken", "children": [] }
    ]
  }
]
```

### How it differs from the existing render pipeline

The current `read` and `dump` commands go through this pipeline:

```
warren.load() → mongoose.renderTree() → render.renderCard() → pretty-printed text
```

The `index` command bypasses render.cjs entirely and bypasses mongoose.renderTree() — it needs only the raw tree with children stripped to `{id, title, children}`. render.cjs is the pretty-print module; it has no role here.

The `index` command pipeline:

```
warren.load() → stripToIndex(data.cards) → JSON.stringify() → stdout
```

`stripToIndex` is a small recursive function (3-5 lines) that can live directly in the `index` case handler in burrow-tools.cjs, or be exported from a utility. It does not belong in render.cjs (wrong domain) or mongoose.cjs (no tree logic needed — children are already nested).

### Stdout contract

`index` prints JSON to stdout. This is a deliberate exception to the "pretty-print only" rule. The consumer is the agent's Read tool or a `load` command — not a human viewing terminal output. The output is raw JSON, no decorators.

This is consistent with the existing decision recorded in PROJECT.md: "Removed --json flag — agent reads cards.json directly for structured data." The `index` command is the lightweight alternative to reading the full cards.json — same JSON-to-agent pattern, different scope.

### Archive behavior

`index` skips archived cards by default (consistent with other active-view commands). An `--include-archived` flag is optional but not required for MVP.

### Integration with config.cjs

`index` does not read config. Config is read by the `load` command (see below) and by the updated workflow. The `index` command is a pure data command — it just strips and serializes the tree.

---

## New Command: load

### Purpose

A programmatic entry point for the agent's LOAD step. The agent calls `burrow load` instead of directly reading cards.json when `loadMode` is not `full`. The command reads config, decides what to emit, and outputs it.

### Behavior by loadMode

```
load --mode full    → emit full cards.json content (same as agent reading file directly)
load --mode index   → emit output of index command (titles + IDs JSON)
load --mode auto    → read card count; if > autoThreshold emit index, else emit full
load               → read loadMode from config.json, dispatch accordingly
```

When called with no flags (the common case), it reads config.json and dispatches. The `--mode` override flag allows the installer and `/burrow:config` to test/preview behavior without changing config.

### Stdout contract

The output of `load` is always JSON — either full cards.json data or index JSON. The agent reads this as structured data (via the Read tool on a tmpfile, or via direct Bash output). It is never rendered as pretty-print.

### Integration with warren.cjs and config.cjs

`load` calls both:

```
config.load(cwd) → get loadMode + autoThreshold
warren.load(cwd) → get cards data (always needed, at minimum for count check in auto mode)
```

In `auto` mode, warren.load() is always called to count cards. If count > threshold, only the index subset is emitted; the full data is still loaded in memory (this is unavoidable without a separate count-only operation). At the scale Burrow targets (hundreds of cards), this is acceptable.

---

## New Command: config

### Purpose

Human-facing settings viewer/editor. Called as `burrow config [get <key>] [set <key> <value>]`.

### Behavior

```
burrow config              → print current config (human-readable key-value list)
burrow config get loadMode → print current value of loadMode
burrow config set loadMode index → update loadMode, save, confirm
```

### Stdout contract

`burrow config` (no subcommand) and `burrow config get` output human-readable text, routed through render.cjs conventions (or inline string formatting — no complex rendering logic needed). `burrow config set` outputs a mutation confirmation like other mutating commands.

### Validation

Before saving: validate that `loadMode` is one of `"full" | "index" | "auto"`, that `autoThreshold` is a positive integer. On invalid input: `handleError()` as all other commands do.

### Integration with config.cjs

This is the primary consumer of the `config.cjs` `get`/`set` API. It is a thin command handler — all persistence logic lives in config.cjs.

---

## Updated: install.cjs Onboarding

### What changes

After `performInstall()` succeeds and before `writeSentinelBlock()`, the installer adds a new interactive prompt for `loadMode`.

### New prompt flow (fresh install, interactive mode)

```
  How should Burrow load your cards on session start?

  [1] full   — Read entire cards.json every session (default, works for small trees)
  [2] index  — Read titles + IDs only (fast, use /burrow:read for details)
  [3] auto   — Read index when tree exceeds N cards, full otherwise

  Choose [1/2/3] (default: 1):
```

If user selects `auto`, a follow-up prompt asks for the threshold (default: 50).

### Non-interactive mode (--yes)

Uses the default: `loadMode: "full"`. No prompt, no config.json written (defaults are applied at runtime by config.load()).

Wait — writing config.json on install is not strictly required if `config.load()` applies defaults when the file is missing. Non-interactive mode can skip writing config.json and rely on runtime defaults. Interactive mode writes config.json only if the user chose a non-default value, or unconditionally (simpler). Unconditional write is safer: the file exists after install, making its presence predictable.

### Where the write happens

After `performInstall()` returns, install.cjs calls `config.save(targetDir, { version: 1, loadMode, autoThreshold })` directly. The config module is imported in install.cjs alongside installer.cjs.

### Sentinel block variants

The CLAUDE_MD_SNIPPET in installer.cjs currently hardcodes the LOAD step as "read cards.json." For v1.3, `writeSentinelBlock` receives a snippet that varies by loadMode:

- `loadMode: "full"` → current snippet (read `.planning/burrow/cards.json`)
- `loadMode: "index"` → snippet instructs agent to run `burrow load` and parse JSON output
- `loadMode: "auto"` → snippet instructs agent to run `burrow load` (auto-resolves internally)

Implementation: installer.cjs exports a `generateSnippet(loadMode)` function that returns the correct snippet string. The `CLAUDE_MD_SNIPPET` constant becomes the `"full"` variant. `install.cjs` calls `generateSnippet(loadMode)` instead of passing `CLAUDE_MD_SNIPPET` directly to `writeSentinelBlock`.

On upgrade, if config.json exists at target, read loadMode from it and regenerate the snippet variant accordingly — so upgrades preserve the user's chosen mode.

---

## Updated: workflows/burrow.md (LOAD Step)

### Current LOAD step

"Read `.planning/burrow/cards.json` directly using the Read tool."

### Updated LOAD step

The workflow gets a conditional LOAD step:

```
LOAD step (one of these, depending on your CLAUDE.md instructions):

  - full mode:  Read `.planning/burrow/cards.json` with the Read tool (current behavior)
  - index mode: Run `node .claude/burrow/burrow-tools.cjs load` and parse the JSON output
  - auto mode:  Run `node .claude/burrow/burrow-tools.cjs load` — it resolves the mode internally

In index/auto mode, the agent has titles + IDs. For cards with body content or deep subtrees,
use `burrow read <id>` to fetch full detail on demand.
```

The workflow must also clarify the reduced-data constraint in index mode: the agent cannot answer body-dependent questions without a subsequent `read` call.

---

## New Command File: .claude/commands/burrow/config.md

### Role

Slash command `/burrow:config` — lets the agent view and change config settings during a session.

### Structure (follows existing command file pattern)

```markdown
---
name: burrow:config
description: View or change Burrow configuration settings
argument-hint: "[get <key> | set <key> <value>]"
allowed-tools:
  - Bash
---
View or update Burrow configuration.

Run: `node .claude/burrow/burrow-tools.cjs config $ARGUMENTS`

Do not repeat the CLI output. After a set operation, confirm the change in one line.
```

No agent interpretation needed — this is a thin pass-through to the CLI, like `dump.md`.

---

## Component Boundaries Summary

| Component | New or Modified | Owns | Does Not Touch |
|-----------|----------------|------|----------------|
| `lib/config.cjs` | NEW | `config.json` read/write, defaults, validation | `cards.json`, mongoose, render |
| `lib/installer.cjs` | MODIFIED | `generateSnippet(loadMode)`, snippet variants | readline (stays in install.cjs) |
| `install.cjs` | MODIFIED | loadMode prompt, calls config.save() | Any engine lib (warren, mongoose) |
| `burrow-tools.cjs` | MODIFIED | Routes `index`, `config`, `load` commands | New lib internals |
| `workflows/burrow.md` | MODIFIED | LOAD step conditionality | CLI implementation |
| `.claude/commands/burrow/config.md` | NEW | `/burrow:config` slash command | Any logic |

---

## Data Flow Changes

### LOAD Step (v1.2 vs v1.3)

**v1.2 (current):**
```
Agent session start
  → Read tool: .planning/burrow/cards.json
  → Agent has full tree in memory
```

**v1.3 (full mode — unchanged behavior):**
```
Agent session start
  → Read tool: .planning/burrow/cards.json  (same as before)
  → Agent has full tree in memory
```

**v1.3 (index mode):**
```
Agent session start
  → Bash: node burrow-tools.cjs load
    → config.load(cwd) → loadMode: "index"
    → warren.load(cwd) → cards data
    → stripToIndex(cards) → [{id, title, children}...]
    → JSON.stringify → stdout
  → Agent parses JSON: has titles + IDs, no bodies
  → On demand: burrow read <id> for full card detail
```

**v1.3 (auto mode):**
```
Agent session start
  → Bash: node burrow-tools.cjs load
    → config.load(cwd) → loadMode: "auto", autoThreshold: 50
    → warren.load(cwd) → count active cards
    → if count > 50: emit index JSON
    → if count <= 50: emit full cards.json content
  → Agent parses JSON accordingly
```

### Config Mutation Flow

```
/burrow:config set loadMode index
  → burrow-tools.cjs config set loadMode index
    → config.load(cwd) → existing config
    → validate: "index" is valid loadMode
    → config.save(cwd, {...config, loadMode: "index"})
    → render confirmation: "loadMode: full -> index"
  → Agent: "Updated loadMode to index."
```

### Install Flow (v1.3 additions)

```
npx create-burrow (interactive)
  → detect() → mode: fresh
  → ask: Add CLAUDE.md? [Y/n]
  → ask: Load mode? [1/2/3]   ← NEW
  → (if auto) ask: Threshold? [50]  ← NEW
  → performInstall(sourceDir, targetDir)
  → config.save(targetDir, {version:1, loadMode, autoThreshold})  ← NEW
  → snippet = generateSnippet(loadMode)  ← NEW
  → writeSentinelBlock(claudeMdPath, snippet)
  → printGettingStarted()
```

---

## Build Order (Dependency-Driven)

Dependencies determine the order. Each step can only start when its dependencies are complete.

```
Step 1: lib/config.cjs
  Depends on: core.cjs (ensureDataDir) — already exists
  Unblocks: all other v1.3 work
  Deliverable: load(), save(), get(), set(), DEFAULTS — all tested

Step 2: burrow-tools.cjs — index command
  Depends on: warren.cjs (already exists), config.cjs not needed
  Can be built in parallel with Step 1 if Step 1 is not needed for index
  Deliverable: `burrow index` outputs stripped JSON tree

Step 3: burrow-tools.cjs — load command
  Depends on: config.cjs (Step 1), warren.cjs, index logic (Step 2)
  Deliverable: `burrow load` dispatches by loadMode

Step 4: burrow-tools.cjs — config command
  Depends on: config.cjs (Step 1)
  Deliverable: `burrow config`, `burrow config get/set`

Step 5: installer.cjs — generateSnippet() + snippet variants
  Depends on: config.cjs schema known (Step 1 complete)
  Deliverable: three snippet variants, generateSnippet(loadMode) exported

Step 6: install.cjs — onboarding prompts
  Depends on: config.cjs (Step 1), installer.cjs (Step 5)
  Deliverable: loadMode prompt in fresh install flow, config.json written

Step 7: .claude/commands/burrow/config.md
  Depends on: config command working (Step 4)
  Deliverable: /burrow:config slash command

Step 8: workflows/burrow.md — updated LOAD step
  Depends on: load command working (Step 3), all commands complete
  Deliverable: workflow respects loadMode, documents index-mode constraints
```

**Minimum viable chain:** Step 1 → Step 2 → Step 3 → Step 8 (core token-reduction path)
**Full feature chain:** Steps 1-8 in order above

---

## Anti-Patterns to Avoid

### Warren/Config Coupling

Do not make warren.cjs config-aware. The storage module reads one file. If the load command needs both, it calls both modules sequentially in burrow-tools.cjs. Cross-module imports between warren and config would create circular dependency risk and violate single-responsibility.

### Putting stripToIndex in mongoose.cjs

mongoose.cjs does tree operations (CRUD, find, archive, renderTree). Stripping to index shape is a serialization concern, not a tree operation. It belongs in burrow-tools.cjs as a local helper or in a small export from render.cjs — but given render.cjs is specifically the pretty-print module, an inline helper in burrow-tools.cjs is the cleanest fit for a 5-line function.

### Snippet logic in install.cjs

install.cjs is the interactive shell. The snippet content and its variants should be data/functions in installer.cjs (the engine). install.cjs calls `generateSnippet(loadMode)` — it does not construct snippet strings itself. This preserves the installer engine/CLI separation already established.

### Config.json in Cards Format

config.json is not a Burrow card tree. It is a flat settings object. Do not store it as `{ version, cards: [...] }`. Warren's schema and config's schema are separate. version in config.json is config schema version (starts at 1), independent of cards.json version (currently 2).

### Blocking load command on full warren.load() in index mode

In index mode, `burrow load` still calls warren.load() to get the data to strip. This is fine — the file read is the same either way. The token saving is agent-side (less content to process), not I/O side. Do not add a separate "read headers only" optimization path; it adds complexity for negligible gain at this scale.

---

## Key Integration Invariants

1. `config.json` is always optional — `config.load()` returns DEFAULTS if the file does not exist. The system works without a config file (backward compatible with v1.2 installs).

2. `burrow index` output is always JSON to stdout, never pretty-printed. The agent, not a human, consumes it.

3. `burrow load` output is always JSON to stdout (either full cards.json content or index JSON). It is not a human-facing command.

4. `burrow config` (no subcommand) output is human-readable. It is a human-facing command.

5. The sentinel block variant is determined at install/upgrade time, not at runtime. The workflow snippet in CLAUDE.md tells the agent what to do; the agent does not query config at LOAD time. This keeps the LOAD step minimal.

6. Upgrade from v1.2 to v1.3: if no config.json exists, defaults apply. If the sentinel block predates v1.3, the upgrade flow detects the existing sentinel and regenerates it with the `full` mode snippet (preserving current behavior). No breaking change.

---

## Sources

All findings are from direct inspection of the current codebase:
- `/Users/mrmatos6837/Projects/personal/burrow/.claude/burrow/burrow-tools.cjs`
- `/Users/mrmatos6837/Projects/personal/burrow/.claude/burrow/lib/warren.cjs`
- `/Users/mrmatos6837/Projects/personal/burrow/.claude/burrow/lib/core.cjs`
- `/Users/mrmatos6837/Projects/personal/burrow/.claude/burrow/lib/render.cjs`
- `/Users/mrmatos6837/Projects/personal/burrow/.claude/burrow/lib/installer.cjs`
- `/Users/mrmatos6837/Projects/personal/burrow/.claude/burrow/lib/version.cjs`
- `/Users/mrmatos6837/Projects/personal/burrow/.claude/burrow/workflows/burrow.md`
- `/Users/mrmatos6837/Projects/personal/burrow/install.cjs`
- `/Users/mrmatos6837/Projects/personal/burrow/.planning/PROJECT.md`

Confidence: HIGH — all claims are grounded in code that exists today.
