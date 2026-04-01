# Technology Stack

**Project:** Burrow v1.3 — Onboarding & Configuration
**Researched:** 2026-04-01
**Scope:** NEW features only. Config system, index command, installer onboarding prompts. Existing v1.2 stack not re-researched.

---

## Constraint (Unchanged)

**Zero external npm dependencies.** Burrow is distributed as flat files via `npx create-burrow`. There is no install step at the target project. Every capability must come from Node.js built-in modules or custom code. This is a hard constraint, not a preference.

**Node.js 22 LTS** is the target runtime (verified: v22.14.0 in use). All APIs below are stable on this version.

---

## What v1.3 Actually Needs

The milestone adds four capabilities, each with its own stack requirements:

| Capability | What It Needs |
|------------|---------------|
| `config.json` management | Read/write JSON, defaults merging, validation, atomic write (already have in warren.cjs) |
| `burrow index` command | Recursive tree walk producing `{id, title, children[]}` — pure JS, no new APIs |
| Installer onboarding prompts | New `readline`-based `ask()` calls in install.cjs; TTY detection for `--yes` auto-fallback |
| `/burrow:config` command | New subcommand in burrow-tools.cjs; reads/writes config.json; no new APIs |
| CLAUDE.md snippet variants | String template selection based on `loadMode`; already have `writeSentinelBlock()` |

None of these capabilities require new external libraries or new Node.js APIs beyond what v1.2 already uses. The additions are patterns and modules, not new technology.

---

## Recommended Stack — New Additions Only

### New Built-in APIs

| API | Module | Purpose | Confidence |
|-----|--------|---------|-----------|
| `fs.statSync(path)` | `node:fs` | File size check for `auto` mode threshold — `stat.size` in bytes, divide by 4 for token estimate | HIGH — stable, used widely, verified v22.14.0 |
| `readline/promises` (for future migration) | `node:readline/promises` | Async `question()` returning a Promise instead of callback — available Node.js 17+, stable on 22 | HIGH — verified available. Current install.cjs uses callback-style `readline`, either style works. No forced migration needed. |

**Note on `readline/promises`:** The existing installer uses callback-style `readline.createInterface` + manual Promise wrappers. This works. `readline/promises` provides native async/await support but is functionally equivalent. Recommend keeping callback style for consistency unless refactoring.

### New Patterns (Pure JS, No New APIs)

| Pattern | Implementation | Where |
|---------|---------------|-------|
| Config JSON load with defaults | `JSON.parse` + object spread `{ ...DEFAULTS, ...parsed }` | New `lib/config.cjs` |
| Config JSON save atomic | Reuse `warren.cjs` atomic write pattern (tmp + rename) | New `lib/config.cjs` |
| Config validation | Plain `typeof` + `Array.includes()` for enum values | New `lib/config.cjs` |
| Index tree walk | Recursive map: `cards.map(c => ({ id, title, children: buildIndex(c.children) }))` | New function in `mongoose.cjs` or inline in `burrow-tools.cjs` |
| Auto-threshold check | `fs.statSync(cardsPath).size > config.autoThreshold * 1024` | In workflow or `burrow-tools.cjs` index/load routing |
| CLAUDE.md snippet variants | Function returning snippet string based on `loadMode` param | In `installer.cjs` |
| TTY detection | `Boolean(process.stdin.isTTY)` — `undefined` when piped (non-interactive), `true` in terminal | Already implicit in install.cjs `--yes` flag; make explicit |

---

## Component Design

### New: `lib/config.cjs`

Single responsibility: read and write `config.json` in `.planning/burrow/`.

```javascript
// Path: .planning/burrow/config.json
// Schema:
{
  "loadMode": "full",       // "full" | "index" | "auto"
  "autoThreshold": 50       // KB threshold for auto mode (integer)
}
```

**Key decisions:**
- `CONFIG_DEFAULTS` constant defines fallbacks — missing keys on read get defaults via spread
- Validation on read: coerce invalid `loadMode` to `"full"`, clamp `autoThreshold` to 1–10000
- Atomic write: write to `.tmp`, rename — same pattern as `warren.cjs` `save()`
- ENOENT on read returns defaults (config.json absence = unconfigured, not an error)
- Do NOT extend `warren.cjs` — config is a separate concern with different schema validation

**Built-in APIs used:** `node:fs` (readFileSync, writeFileSync, renameSync, existsSync), `node:path`

### Modified: `lib/mongoose.cjs`

Add one pure function: `buildIndex(cards)`.

```javascript
// Returns lightweight tree: id + title + children only (no body, created, archived)
function buildIndex(cards) {
  return cards.map(c => ({
    id: c.id,
    title: c.title,
    ...(c.children && c.children.length ? { children: buildIndex(c.children) } : {})
  }));
}
```

**Why here:** Mongoose owns tree operations. Index is a read-only tree transformation. No new APIs needed.

**Output contract:** Leaf cards omit `children` entirely (not `children: []`) to minimize output size. Archived cards follow the same include/exclude rules as `listCards` — by default, excluded.

### Modified: `lib/installer.cjs`

Add `buildClaudeMdSnippet(loadMode)` function that returns the appropriate CLAUDE.md sentinel block content based on the chosen loading mode.

Three variants:
- `"full"` — current snippet (read cards.json directly)
- `"index"` — instruct agent to run `burrow index` and read that
- `"auto"` — instruct agent to check index first, load full only if within threshold

**Why here:** `writeSentinelBlock()` already lives in installer.cjs and accepts `blockContent` as a string parameter. Snippet selection is just string branching.

**Built-in APIs used:** None new — pure string operations.

### Modified: `install.cjs`

Add loadMode prompt to the interactive onboarding flow (after install confirmation, before writing files).

```
? How should Claude load Burrow on session start?
  1. Full load — read cards.json directly (default, works for small trees)
  2. Index only — read titles+IDs only, fetch cards on demand (saves tokens)
  3. Auto — use index if tree is large, full load if small
```

**Non-interactive fallback:** If `--yes` flag is set OR `!process.stdin.isTTY`, skip the prompt and use `"full"` as default. This matches how the existing `--yes` path works for all other prompts.

**Built-in APIs used:** `node:readline` (already imported), `process.stdin.isTTY`

### Modified: `burrow-tools.cjs`

Add two new subcommands:

**`index`** — emit lightweight JSON index to stdout:
```
node .claude/burrow/burrow-tools.cjs index
```
Output: `JSON.stringify({ cards: buildIndex(data.cards) })` — single-line JSON (no pretty-print, agent parses it).

**`config`** — view or set config values:
```
node .claude/burrow/burrow-tools.cjs config              # show current config
node .claude/burrow/burrow-tools.cjs config --set loadMode=index
node .claude/burrow/burrow-tools.cjs config --set autoThreshold=100
```
Outputs human-readable confirmation text (consistent with all other commands).

**`util.parseArgs()` additions:** Two new options: `--set` (string type) for config set; no new flags for index.

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Any npm package | Hard constraint | Node.js built-ins only |
| `readline/promises` migration | Current callback-style readline works, migration is churn for zero gain | Keep existing `ask()` wrapper pattern |
| `fs.promises` / async file ops | Config reads are startup-time, synchronous is correct for a CLI that runs-and-exits | `fs.readFileSync` |
| Schema versioning in config.json | Config has 2 fields. Defaults-spread handles forward/backward compat. A version field is premature. | Defaults-spread on every read |
| Separate config CLI module | `/burrow:config` is a thin wrapper around `lib/config.cjs` — it belongs in `burrow-tools.cjs` switch/case | Add `case 'config':` in existing switch |
| TOML or YAML for config | JSON is already the storage format for cards.json. JSON.parse/stringify with no dependencies. | JSON |
| File watching (`fs.watch`) | Burrow does not hot-reload. Each CLI invocation is stateless. | N/A |
| OS-level config location (`os.homedir()`) | All config is per-project in `.planning/burrow/config.json`. Global config is out of scope. | Per-project only |

---

## Integration Points

### How config.json flows through the system

```
install.cjs (prompt)
  → writes .planning/burrow/config.json
  → writes CLAUDE.md sentinel block (variant based on loadMode)

burrow-tools.cjs config --set
  → reads .planning/burrow/config.json (lib/config.cjs)
  → validates new value
  → writes .planning/burrow/config.json
  → does NOT update CLAUDE.md (user must re-run installer to change snippet)

burrow-tools.cjs index
  → reads .planning/burrow/cards.json (warren.cjs load())
  → builds index (mongoose.cjs buildIndex())
  → writes JSON to stdout

workflows/burrow.md (LOAD step)
  → reads .planning/burrow/config.json (agent reads directly or via burrow-tools.cjs config)
  → branches: full → read cards.json | index → run burrow index | auto → check size, pick one
```

### Files touched by v1.3

| File | Change Type | Description |
|------|-------------|-------------|
| `.claude/burrow/lib/config.cjs` | **NEW** | Config load/save/validate/defaults |
| `.claude/burrow/lib/mongoose.cjs` | Modified | Add `buildIndex()` export |
| `.claude/burrow/lib/installer.cjs` | Modified | Add `buildClaudeMdSnippet(loadMode)`, export it |
| `.claude/burrow/burrow-tools.cjs` | Modified | Add `index` and `config` subcommands |
| `install.cjs` | Modified | Add loadMode prompt to interactive flow |
| `.claude/burrow/workflows/burrow.md` | Modified | LOAD step respects loadMode |

---

## Version Compatibility

All APIs verified on Node.js v22.14.0.

| API | Minimum Node.js | Status |
|-----|-----------------|--------|
| `fs.statSync()` | All versions | Stable — been there since v0.1 |
| `fs.readFileSync` / `writeFileSync` / `renameSync` | All versions | Stable |
| `readline.createInterface` (callback style) | All versions | Stable — in use since v1.2 |
| `readline/promises.createInterface` | 17+ (stable 22+) | Available, not required for v1.3 |
| `process.stdin.isTTY` | All versions | `undefined` when piped, `true` in terminal |
| `util.parseArgs()` | 18.3+ experimental, 20+ stable | Stable on v22 — already in use |
| `JSON.parse` / `JSON.stringify` | All versions | Stable |

---

## Sources

- Node.js v22 `fs` docs: https://nodejs.org/api/fs.html — `statSync`, `readFileSync`, `writeFileSync`, `renameSync`
- Node.js v22 `readline/promises`: https://nodejs.org/api/readline.html#promises-api — verified available
- Node.js v22 `util.parseArgs()`: https://nodejs.org/docs/latest-v22.x/api/util.html#utilparseargsconfig — already in use
- `process.stdin.isTTY`: https://nodejs.org/api/tty.html — `undefined` when not a TTY (non-interactive), `true` when terminal
- Verified on runtime: `node --version` → `v22.14.0`, all APIs confirmed present

---

*Stack research for: Burrow v1.3 Onboarding & Configuration milestone*
*Researched: 2026-04-01*
*Confidence: HIGH — all APIs verified on Node.js v22.14.0, patterns derived from existing codebase*
