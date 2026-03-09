# Phase 3: CLI Pretty-Print Rendering - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Bake human-readable output into `burrow-tools.cjs`. Every command outputs formatted text by default. `--json` flag bypasses rendering and returns raw structured JSON (current behavior becomes opt-in). Each command internally produces structured data, then passes it through a render function unless `--json` is set.

Also: remove `list` and `children` aliases (confusing). Keep only `dump` as shortcut for `get --depth 0`. Everything that outputs cards is a `get` command.

</domain>

<decisions>
## Implementation Decisions

### Core rendering principle
- Everything is a card. Root is a card. The same card detail format is used everywhere.
- The tool is dumb — it renders what it's asked to render. No warnings, no confirmation logic, no safety checks. That's the agent's job (Phase 4).
- `--json` always returns complete, untruncated data. Limits and truncation are rendering concerns only.

### Card detail format (universal)
- Used for `get <id>`, add output, edit output — any time a single card is shown in detail
- Section order: header (breadcrumb) → title → metadata → children → body
- Sections delimited by horizontal rules (────────)
- Children shown above body (structure before content — body is more likely to be long)
- Children always shown: cards listed or "(none)"
- Body always shown: content displayed or "(empty)"
- Body capped at ~200 chars by default with "…(truncated — use --full for complete body)"
- `--full` flag shows complete body without truncation

```
burrow › bugs › Login bug

────────────────────────────────────────
Login bug
────────────────────────────────────────
id:       a1b2c3d4
created:  2026-03-06 (2d ago)
archived: no
────────────────────────────────────────
children:
  ├─ [i9j0k1l2] Root cause            1d ago
  └─ [j2k3l4m5] Workaround            6h ago
────────────────────────────────────────
body:
  OAuth callback sends to /dashboard
  instead of original page
────────────────────────────────────────
```

Empty card:
```
burrow › bugs › OAuth bug

────────────────────────────────────────
OAuth bug
────────────────────────────────────────
id:       f8a2b1c3
created:  2026-03-08 (just now)
archived: no
────────────────────────────────────────
children: (none)
────────────────────────────────────────
body:     (empty)
────────────────────────────────────────
```

### Root card
- Root is rendered as a card like any other
- Root ID shown as `(root)` — special marker, not a real ID
- `get` with no args shows the root card in standard detail format

```
burrow

────────────────────────────────────────
burrow
────────────────────────────────────────
id:       (root)
created:  2026-03-07
archived: no
────────────────────────────────────────
children: 4 cards (23 total)
  ├─ [8eaff688] Phase 2 Decisions •      1d ago  (12)
  ├─ [90eb1ae1] v1 Remaining Work •     4h ago  (2)
  ├─ [bfb9243c] v2 Ideas •              6h ago  (7)
  └─ [30059067] Branding •              2h ago  (2)
────────────────────────────────────────
body:     (empty)
────────────────────────────────────────
```

### Header / Breadcrumbs
- Always present. Format: `burrow › ancestors › card name`
- Breadcrumb always includes the card itself, not just ancestors
- Root breadcrumb is just `burrow`
- Optional context field after `·` for filters: `burrow · archived only`, `burrow › bugs · full tree`
- Header reflects whatever filters are applied (archived only, including archived, full tree, etc.)
- Context field is concise — a few words max

### Tree listing format (children in card view, depth views)
- Box-drawing lines: ├─, └─, │
- Each card line: `[8-char ID] title •  age  (N)`
- `•` dot marker indicates card has body content
- `(N)` parenthesized number for descendant count at depth cutoff
- Right-aligned age column — consistent position across cards
- Age format: "Xd ago", "Xw ago", "Xh ago", "just now" — short with "ago"
- Archived cards marked with `[archived]` label when shown via --include-archived
- Terminal width detection: use `process.stdout.columns` if available, fall back to 80
- Long titles truncated with `…` to maintain alignment

### Mutation output formats

**add** — full card detail:
```
✓ Added card

burrow › bugs › OAuth bug

────────────────────────────────────────
...(standard card detail)...
────────────────────────────────────────
```

**edit** — truncated diff + full card detail:
```
✓ Edited card
  title: Login redirect… → Login bug
  body: OAuth callback… → Fixed in PR…

burrow › bugs › Login bug

────────────────────────────────────────
...(standard card detail)...
────────────────────────────────────────
```
- Title and body diffs capped at ~40 chars with ellipsis

**delete** — compact one-liner:
```
✓ Deleted "API timeout" [e5f6g7h8] (and 2 children)
```

**move** — compact one-liner with arrow:
```
✓ Moved "API timeout" [e5f6g7h8]: bugs → root
```

**archive/unarchive** — compact one-liner with cascade count:
```
✓ Archived "bugs" [a1b2c3d4] (and 5 children)
✓ Unarchived "bugs" [a1b2c3d4] (and 5 children)
```

### Path command
- Breadcrumb line format: `burrow › bugs › Login redirect broken [a1b2c3d4]`

### Error format
- `✗ message` — symbol + message, no error codes in human-readable mode
- With `--json`: `{success: false, error: "message", code: "NOT_FOUND"}` (current behavior)
- Exit codes: 0 for success, 1 for any error (unchanged)

### Empty burrow
```
burrow

────────────────────────────────────────
burrow
────────────────────────────────────────
id:       (root)
created:  ...
archived: no
────────────────────────────────────────
children: (none)
────────────────────────────────────────
body:     (empty)
────────────────────────────────────────
```

### --json bypass
- Global flag, parsed before command switch
- If `--json` set: output raw JSON via core.output() (current behavior, no truncation)
- If not set: pipe through render.cjs
- JSON shape unchanged — same `{success, data}` contract as today
- Errors also JSON when `--json` is set

### CLI surface changes
- **Remove**: `list` command (confusing, everything is `get`)
- **Remove**: `children` command (confusing, use `get <id>`)
- **Keep**: `dump` as alias for `get --depth 0`
- **Add**: `--json` flag (global, all commands)
- **Add**: `--full` flag (for `get` — show complete body)
- Delete executes immediately — no `--force`, no confirmation. Safety is the agent's job.

### Render architecture
- New `lib/render.cjs` module — single dedicated module for all rendering logic
- Exports one function per type: `renderCard()`, `renderMutation()`, `renderPath()`, `renderError()`
- Functions return strings (not write to stdout) — testable, caller prints
- Separate `test/render.test.cjs` for unit tests with fixture data
- Plain text only — no ANSI color codes. Symbols (✓, ✗, ├─, •) provide visual structure.

### Claude's Discretion
- Exact spacing and padding within the card format
- How to handle edge cases not explicitly covered
- Render function internal structure (helpers, shared utilities)
- Age calculation thresholds (when does "hours" become "days"?)

</decisions>

<specifics>
## Specific Ideas

- "it's very important to me that this tool feels consistent. It should behave in predictable and expected ways and I believe if we keep the set of rules to a minimal and design clear and elegant interfaces we can achieve that"
- Root is a card. Everything is a card. Same format everywhere.
- The tool is just a tool — no confirmation logic, no safety checks. The agent/user is responsible for using it correctly.
- Children above body because body is more likely to be long — structure before content.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/core.cjs`: `output()` and `errorOut()` — current JSON output helpers. `output()` becomes the `--json` path; rendered path uses new render functions.
- `lib/mongoose.cjs`: `renderTree()` returns flat array with depth, descendantCount, hasBody, bodyPreview — render.cjs consumes this.
- `lib/mongoose.cjs`: `getPath()` returns ancestry array — render.cjs formats as breadcrumb string.

### Established Patterns
- CommonJS (.cjs), `util.parseArgs`, sync fs, zero dependencies
- `burrow-tools.cjs` router: switch/case on command, parseArgs per case
- JSON output contract: `{success: true, data: {...}}` — becomes the `--json` output

### Integration Points
- `burrow-tools.cjs` router gets a global `--json` check before the command switch
- Each command case calls render functions instead of `core.output()` when not `--json`
- Phase 4 (Agent Interface) will consume rendered output by default, `--json` when it needs to parse

</code_context>

<deferred>
## Deferred Ideas

- Color/ANSI support — could add later with `--color` flag and `NO_COLOR` env var detection
- Distinct exit codes per error type — keep simple (0/1) for now
- Pagination for very large outputs — tool renders everything, agent handles warnings

</deferred>

---

*Phase: 03-cli-pretty-print-rendering-with-json-flag*
*Context gathered: 2026-03-08*
