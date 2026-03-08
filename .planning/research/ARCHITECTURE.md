# Architecture Research

**Domain:** Claude Code addon / CLI tool with flat file storage
**Researched:** 2026-03-06
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Entry Layer (Commands)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ /gsd:burrow│  │ /gsd:bw-add │  │ /gsd:bw-show│  ...        │
│  │ (natural    │  │ (shortcut)  │  │ (shortcut)  │             │
│  │  language)  │  │             │  │             │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          ↓                                      │
├─────────────────────────────────────────────────────────────────┤
│                   Workflow Layer (Agent Logic)                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │              burrow.md workflow                      │       │
│  │  Intent parsing, reconciliation logic, user prompts  │       │
│  └───────────────────────┬──────────────────────────────┘       │
│                          ↓                                      │
├─────────────────────────────────────────────────────────────────┤
│                    CLI Tool Layer (Deterministic)                │
│  ┌──────────────────────────────────────────────────────┐       │
│  │            burrow-tools.cjs (router)                 │       │
│  ├──────────────────────────────────────────────────────┤       │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │       │
│  │  │  items   │ │  buckets │ │ renderer │ │ config  │ │       │
│  │  │  .cjs    │ │  .cjs    │ │  .cjs    │ │  .cjs   │ │       │
│  │  └─────────┘ └──────────┘ └──────────┘ └─────────┘ │       │
│  │  ┌─────────┐ ┌──────────┐                           │       │
│  │  │ archive │ │  core    │                           │       │
│  │  │  .cjs   │ │  .cjs    │                           │       │
│  │  └─────────┘ └──────────┘                           │       │
│  └───────────────────────┬──────────────────────────────┘       │
│                          ↓                                      │
├─────────────────────────────────────────────────────────────────┤
│                      Storage Layer (Flat Files)                  │
│  ┌──────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │config.json│  │ items/*.md       │  │ archive/*.md     │      │
│  │          │  │ (YAML frontmatter│  │ (same format)    │      │
│  │          │  │  + markdown body) │  │                  │      │
│  └──────────┘  └──────────────────┘  └──────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Command files** (.md) | Entry points for `/gsd:*` slash commands; pass `$ARGUMENTS` to workflow | Thin markdown files with `@` references to workflow |
| **Workflow** (burrow.md) | Agent-side logic: intent parsing, reconciliation, user interaction | Markdown with structured instructions the agent follows |
| **CLI Router** (burrow-tools.cjs) | Dispatch CLI subcommands to the correct module; parse args, handle `--cwd`, `--raw` | Single entry file with `switch` on command/subcommand |
| **Items module** (lib/items.cjs) | CRUD for item files: create, read, update, delete, list, filter by bucket/tag | Read/write markdown files with YAML frontmatter |
| **Buckets module** (lib/buckets.cjs) | Bucket management: list, create, rename, reorder, enforce limits | Reads/writes `config.json` bucket definitions |
| **Archive module** (lib/archive.cjs) | Move items to archive, search archived items, unarchive | Move files between `items/` and `archive/`, add archive metadata |
| **Renderer module** (lib/renderer.cjs) | Generate pan view and drill view formatted output | Pure functions: data in, formatted text out |
| **Config module** (lib/config.cjs) | Read/write `config.json`, schema validation, defaults | JSON read/write with sensible defaults on missing keys |
| **Core module** (lib/core.cjs) | Shared utilities: output formatting, error handling, file helpers, frontmatter parsing | Reusable across all modules |

## Recommended Project Structure

```
.claude/burrow/
├── burrow-tools.cjs          # CLI entry point + router
├── lib/
│   ├── core.cjs               # Shared: output(), error(), safeReadFile(), frontmatter parse/serialize
│   ├── items.cjs              # Item CRUD: add, get, list, update, remove, filter
│   ├── buckets.cjs            # Bucket management: list, create, rename, reorder, limits
│   ├── archive.cjs            # Archive operations: archive, unarchive, search
│   ├── renderer.cjs           # View generation: pan view, drill view
│   └── config.cjs             # Config read/write, defaults, validation
├── workflows/
│   └── burrow.md             # Main workflow (agent follows this)
└── templates/                 # Output format templates (optional, may live in renderer)

.claude/commands/gsd/
├── burrow.md                 # /gsd:burrow — natural language entry
├── bw-add.md                  # /gsd:bw-add — shortcut
├── bw-show.md                 # /gsd:bw-show — shortcut
├── bw-move.md                 # /gsd:bw-move — shortcut
├── bw-archive.md              # /gsd:bw-archive — shortcut
└── bw-buckets.md              # /gsd:bw-buckets — bucket management

.planning/burrow/
├── config.json                # Bucket definitions, display order, limits
├── items/                     # Active item markdown files
│   ├── fix-login-bug.md
│   ├── add-dark-mode.md
│   └── ...
└── archive/                   # Archived items (same format)
    └── ...
```

### Structure Rationale

- **`.claude/burrow/`:** Addon code lives here, separate from GSD core (`.claude/get-shit-done/`). Survives `/gsd:update` because GSD never touches this directory.
- **`lib/` subdirectory:** Matches GSD's own `bin/lib/` convention. Each module owns one domain. The router stays thin.
- **`.claude/commands/gsd/`:** Command files register as `/gsd:*` slash commands. They are thin wrappers that reference the workflow. Placed alongside GSD's own commands since Claude Code discovers commands from `.claude/commands/`.
- **`.planning/burrow/`:** Data lives with other project planning files. Per-project by nature (each repo has its own `.planning/`).
- **Single workflow file:** Unlike GSD which has many workflows for many features, Burrow has one workflow that handles all operations. The agent parses user intent and calls the right CLI subcommands.

## Architectural Patterns

### Pattern 1: Agent + Deterministic CLI (Core Pattern)

**What:** The agent (Claude) handles fuzzy, judgment-based work (intent parsing, reconciliation matching, user interaction). The CLI tool handles deterministic work (file I/O, data transformation, rendering). They communicate through structured JSON.

**When to use:** Always. This is the fundamental pattern for Burrow.

**Trade-offs:**
- Pro: Agent brings intelligence without brittle NLP code. CLI brings reliability without AI unpredictability.
- Pro: CLI output is testable; agent behavior is prompt-tunable.
- Con: Two "languages" to maintain (JS + markdown workflow instructions).

**Example:**
```
User: "/gsd:bw-add fix the login timeout bug #backend"

Agent reads workflow → parses intent → runs:
  node burrow-tools.cjs item add --title "Fix the login timeout bug" --bucket inbox --tags backend

CLI creates file, returns JSON:
  {"ok": true, "item": {"id": "fix-the-login-timeout-bug", "bucket": "inbox", "tags": ["backend"]}}

Agent formats response for user:
  "Added 'Fix the login timeout bug' to inbox with tag #backend."
```

### Pattern 2: Thin Command, Fat Workflow

**What:** Command markdown files are 10-20 line dispatchers. All logic lives in the workflow file. Shortcuts just set a mode flag before invoking the same workflow.

**When to use:** For all command entry points.

**Trade-offs:**
- Pro: Single source of truth for behavior. Changing the workflow updates all commands.
- Con: The workflow file can get long. Mitigate with clear section headers.

**Example:**
```markdown
<!-- bw-add.md (shortcut command) -->
---
name: gsd:bw-add
description: Add an item to a Burrow bucket
argument-hint: <title> [--bucket <name>] [--tags <tag1,tag2>]
allowed-tools: [Read, Write, Bash, AskUserQuestion]
---

<execution_context>
@./.claude/burrow/workflows/burrow.md
</execution_context>

<context>
Operation: add
Arguments: $ARGUMENTS
</context>
```

### Pattern 3: Frontmatter-as-Database

**What:** Each item is a markdown file where YAML frontmatter stores structured fields (bucket, tags, created date, status) and the markdown body holds free-form notes. The filesystem is the database; filenames are slugified titles.

**When to use:** For all item storage.

**Trade-offs:**
- Pro: Human-readable, git-diffable, no dependencies, trivially inspectable.
- Pro: GSD already has a battle-tested frontmatter parser in `lib/frontmatter.cjs` to reference.
- Con: No indexes. Listing all items in a bucket requires reading every file's frontmatter. Fine at <500 items, problematic at thousands.
- Con: Filename collisions on duplicate titles (mitigate with timestamp suffix).

**Example:**
```markdown
---
title: Fix the login timeout bug
bucket: backlog
tags: [backend, auth]
created: 2026-03-06T14:30:00Z
---

The login form times out after 30 seconds but the API call takes up to 45 seconds on slow connections. Increase the client-side timeout to 60s and add a loading indicator.
```

### Pattern 4: JSON Config with Sensible Defaults

**What:** `config.json` stores bucket definitions, display order, and limits. The config module provides defaults when the file is missing or incomplete, so first use requires zero setup.

**When to use:** For bucket configuration.

**Trade-offs:**
- Pro: Zero-config first run. User can `bw-add "fix bug"` and it goes to a default "inbox" bucket.
- Pro: JSON is easy to read/write from Node.js.
- Con: No schema validation at the filesystem level (must validate in code).

**Example:**
```json
{
  "buckets": [
    { "name": "inbox", "limit": null },
    { "name": "now", "limit": 5 },
    { "name": "next", "limit": 10 },
    { "name": "later", "limit": null },
    { "name": "someday", "limit": null }
  ],
  "defaultBucket": "inbox",
  "archiveTimestamp": true
}
```

## Data Flow

### Add Item Flow

```
User types: /gsd:bw-add "Fix login bug" --bucket backlog --tags backend
    ↓
Command (bw-add.md) → sets operation=add, passes $ARGUMENTS
    ↓
Workflow (burrow.md) → agent parses args
    ↓
Agent runs: node burrow-tools.cjs item add --title "Fix login bug" --bucket backlog --tags backend
    ↓
CLI Router → items.cmdAdd(cwd, args)
    ↓
items.cjs:
  1. Read config.json → validate bucket exists
  2. Generate slug: "fix-login-bug"
  3. Check for collision in items/
  4. Write items/fix-login-bug.md (frontmatter + empty body)
  5. Return JSON: {ok, item: {id, title, bucket, tags, created, path}}
    ↓
Agent receives JSON → formats user-facing message
```

### Show/Render Flow

```
User types: /gsd:bw-show (or /gsd:bw-show backlog)
    ↓
Workflow → agent determines: pan view (no args) or drill view (bucket specified)
    ↓
Pan view:  node burrow-tools.cjs view pan
Drill view: node burrow-tools.cjs view drill --bucket backlog
    ↓
CLI:
  Pan: Read all items, group by bucket, count per bucket → formatted text
  Drill: Read items in bucket, group by tag → formatted text
    ↓
Agent presents formatted output directly to user
```

### Reconciliation Flow (GSD Integration)

```
GSD workflow completes a phase
    ↓
Reconciliation step triggers (injected into GSD workflows)
    ↓
Agent runs: node burrow-tools.cjs item list --format json
    ↓
Agent reads phase SUMMARY.md for completed work
    ↓
Agent compares open items against completed work (this is agent judgment, not CLI)
    ↓
Agent presents matches:
  "These items may be done: [1] Fix login bug, [2] Add dark mode toggle"
  "Archive, move, or skip each?"
    ↓
User decides → agent runs archive/move commands accordingly
```

### Key Data Flows

1. **Write path (add/update/move/archive):** Agent parses intent -> CLI validates + writes files -> CLI returns JSON result -> Agent confirms to user.
2. **Read path (show/list):** Agent determines view type -> CLI reads files + renders -> CLI returns formatted text (pan/drill) or JSON (list) -> Agent presents to user.
3. **Reconciliation path:** GSD workflow -> Agent reads items + completed work -> Agent matches (judgment) -> User decides -> Agent executes changes via CLI.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-50 items | No issues. Read-all-files approach is instant. |
| 50-200 items | Still fine. File reads are fast on local disk. Consider adding a `--bucket` filter to avoid reading items from irrelevant buckets. |
| 200-500 items | Add an optional index file (`.planning/burrow/.index.json`) as a cache. Rebuild on any write. |
| 500+ items | Unlikely for a solo dev todo list. If reached, the user should archive aggressively. |

### Scaling Priorities

1. **First bottleneck:** Reading all frontmatter to render pan view. Mitigate with bucket-based subdirectories or an index cache. This is unlikely to be hit in practice.
2. **Second bottleneck:** Filename collisions. Mitigate by appending short timestamp or counter to slug.

## Anti-Patterns

### Anti-Pattern 1: Putting Logic in the CLI That Belongs in the Agent

**What people do:** Building fuzzy matching, natural language parsing, or "smart" features into the Node.js CLI tool.
**Why it's wrong:** The agent IS the smart layer. Duplicating intelligence in JS creates brittle code that's worse at the job than the agent. It also increases code complexity for no gain.
**Do this instead:** CLI does deterministic CRUD and rendering. Agent does all interpretation, matching, and decision-making. The boundary is: "Could a unit test verify this?" -> CLI. "Does this require judgment?" -> Agent.

### Anti-Pattern 2: Monolithic CLI File

**What people do:** Putting all CRUD, rendering, config, and archive logic in a single `burrow-tools.cjs` file.
**Why it's wrong:** GSD's own `gsd-tools.cjs` started monolithic and grew to 600+ lines of router code alone. It was refactored into `lib/` modules for maintainability.
**Do this instead:** Start modular from day one. The router file (`burrow-tools.cjs`) should only parse args and dispatch to module functions. Each module owns its domain.

### Anti-Pattern 3: Items as JSON Instead of Markdown

**What people do:** Storing items as JSON objects (or a single JSON array file) instead of individual markdown files.
**Why it's wrong:** Loses human readability, git diffs become noisy, and the whole file must be rewritten for every change (risking data loss on concurrent writes). Also breaks the GSD ecosystem convention.
**Do this instead:** One markdown file per item with YAML frontmatter. It's the established pattern for GSD todos and planning artifacts.

### Anti-Pattern 4: Workflow Duplication Across Shortcuts

**What people do:** Copying workflow logic into each shortcut command file (bw-add.md, bw-show.md, etc.) so each is self-contained.
**Why it's wrong:** Updates must be made in N places. Behavior diverges over time. Bugs get fixed in one command but not others.
**Do this instead:** All shortcuts reference the same workflow file. The shortcut sets a mode/operation context that the workflow branches on.

### Anti-Pattern 5: Rendering in the Agent

**What people do:** Having the CLI return raw JSON and letting the agent format the pan/drill view output.
**Why it's wrong:** Agent formatting is inconsistent across invocations. Alignment, spacing, and layout drift. Also wastes agent tokens on mechanical formatting work.
**Do this instead:** CLI generates formatted text output for display views. Agent passes it through to the user verbatim. JSON output is for when the agent needs to process data programmatically.

## Integration Points

### GSD Framework Integration

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Command files <-> GSD commands | Co-located in `.claude/commands/gsd/` | Claude Code discovers all commands from this directory; Burrow commands sit alongside GSD commands with `bw-` prefix |
| Workflow <-> GSD workflows | Reconciliation step injected into GSD workflow instructions | Not code integration -- the Burrow workflow instructions tell the agent when to run reconciliation |
| CLI tool <-> GSD tools | Independent; no code sharing | Could share `core.cjs` patterns but should not import from GSD's `bin/lib/` (would create dependency on GSD internals) |
| Data <-> GSD planning | Both under `.planning/` | Burrow uses `.planning/burrow/`; GSD uses `.planning/` root and phase dirs. No overlap. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Router <-> Modules | Direct function calls | Router imports modules, calls exported functions with parsed args |
| Modules <-> Core | Direct function calls | All modules import core for `output()`, `error()`, file helpers |
| Modules <-> Filesystem | `fs` read/write via core helpers | Always go through `safeReadFile()` and explicit `fs.writeFileSync()` |
| Items <-> Config | Items module reads config to validate bucket names | One-directional dependency: items depends on config, not vice versa |

## Build Order (Dependencies)

The components have clear dependency ordering that dictates implementation phases:

```
Phase 1: Foundation (no dependencies)
  └── core.cjs (output, error, frontmatter parse/serialize, file helpers)
  └── config.cjs (read/write config.json, defaults, bucket schema)

Phase 2: Data Operations (depends on Phase 1)
  └── items.cjs (CRUD for item files — needs core + config)
  └── buckets.cjs (bucket management — needs core + config)

Phase 3: Views and Archive (depends on Phase 2)
  └── renderer.cjs (pan + drill views — needs items + config for data)
  └── archive.cjs (archive/unarchive — needs items + config)

Phase 4: CLI Router (depends on all modules)
  └── burrow-tools.cjs (imports + dispatches to all modules)

Phase 5: Workflow and Commands (depends on CLI being functional)
  └── workflows/burrow.md (agent instructions referencing CLI commands)
  └── commands/ (thin wrappers referencing workflow)

Phase 6: GSD Integration (depends on everything working)
  └── Reconciliation step in GSD workflow instructions
```

**Key dependency insight:** Core and config are the foundation. Everything else builds on them. The renderer depends on items (it needs to read them) but items does not depend on the renderer. Archive is essentially "items with a different directory," so it shares the same primitives.

## Sources

- GSD `gsd-tools.cjs` architecture (examined directly): CLI router + lib/ module pattern, `--cwd` and `--raw` conventions, JSON output via `core.output()`
- GSD `lib/core.cjs`: Output helpers (`output()`, `error()`), file utilities (`safeReadFile()`), large-payload tmpfile pattern
- GSD `lib/frontmatter.cjs`: YAML frontmatter parsing engine (reference implementation for items)
- GSD command pattern (`add-todo.md`): Thin command -> workflow reference pattern
- PROJECT.md: Explicit architecture decisions on directory layout, data format, and agent/CLI split

---
*Architecture research for: Claude Code addon / bucket-based task manager*
*Researched: 2026-03-06*
