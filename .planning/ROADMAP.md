# Roadmap: Burrow

## Overview

Burrow delivers a recursive nested card tool navigated by an AI agent. The build follows strict dependency order: first the core data engine and CLI skeleton (recursive tree CRUD, single JSON storage, atomic writes, tree traversal), then schema simplification, views, and archive (drop position/ordering, rename notes→body, flat render array with depth control, cascade archive), then CLI pretty-print rendering (human-readable output by default, --json flag for raw structured JSON), and finally the agent interface (workflow file and GSD commands for natural language and shortcut interaction). Storage is a single JSON file (cards.json) with a recursive tree structure -- no buckets, no tags, no flat lists.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Core Engine** - Recursive tree data layer with CLI tool skeleton and single JSON storage
- [ ] **Phase 2: Schema, Views, and Archive** - Simplify schema, depth-configurable flat render array, cascade archive system
- [x] **Phase 3: CLI Pretty-Print Rendering** - Human-readable output by default, --json flag for raw structured JSON
- [ ] **Phase 4: Agent Interface** - Workflow file and slash commands for natural language and shortcut interaction

## Phase Details

### Phase 1: Core Engine
**Goal**: Users can create, read, update, delete, and move cards in a recursive tree stored as a single JSON file, via a CLI tool that returns structured JSON
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, DATA-08, DATA-09, DATA-10, CLI-01, CLI-02
**Status**: COMPLETE
**Success Criteria** (what must be TRUE):
  1. User can add a card at the root or as a child of any existing card, and the card appears in cards.json with correct parent-child nesting, an 8-char hex ID, creation timestamp, and position
  2. User can edit a card's title and notes, delete a card and all its descendants, and move a card (with its subtree) to a different parent
  3. Every mutation writes atomically (tmp + rename) and creates cards.json.bak before modifying data
  4. CLI tool can traverse the tree: get any card by ID, list its children, and return the full ancestry path from root to that card
  5. Each parent's children respect their ordering mode (custom by position, alpha-asc, alpha-desc)
**Plans**: 2 plans (complete)

Plans:
- [x] 01-01-PLAN.md -- Data layer: core helpers, atomic storage, and recursive tree operations with tests
- [x] 01-02-PLAN.md -- CLI router: wire all 8 subcommands into burrow-tools.cjs with integration tests

### Phase 2: Schema, Views, and Archive
**Goal**: Simplify the card schema (drop position/ordering, rename notes→body), implement depth-configurable flat render array via universal `get` command, and add cascade archive/unarchive
**Depends on**: Phase 1
**Requirements**: SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04, RNDR-01, RNDR-02, RNDR-03, RNDR-04, RNDR-05, ARCH-01, ARCH-02, ARCH-03, CLI-03, CLI-04
**Success Criteria** (what must be TRUE):
  1. Card schema is `{id, title, created, archived, body, children[]}` — no position, no ordering, no notes field
  2. `get [id] [--depth N]` returns a flat render array with depth, descendantCount, hasBody, bodyPreview for each card; default depth = card + direct children; `--depth 0` = full tree
  3. Focused subtree views include breadcrumb ancestry path
  4. `archive <id>` cascades to all descendants; `unarchive <id>` restores the whole subtree; descendant counts only count active cards
  5. Archived cards excluded from views by default; `--include-archived` and `--archived-only` flags available
  6. `list`, `dump`, `children` work as aliases to `get` variants — same code path
**Plans**: 2 plans

Plans:
- [ ] 02-01-PLAN.md -- Schema migration: drop position/ordering, rename notes->body, flatten children, v1->v2 data migration
- [ ] 02-02-PLAN.md -- Render tree, archive system, and CLI wiring: universal get with depth control, archive/unarchive, aliases

### Phase 3: CLI Pretty-Print Rendering
**Goal**: Every CLI command outputs human-readable formatted text by default. --json flag bypasses rendering and returns raw structured JSON. Each command internally produces structured data, then passes it through a render function.
**Depends on**: Phase 2
**Requirements**: PP-01, PP-02, PP-03, PP-04, PP-05, PP-06, PP-07, PP-08, PP-09, PP-10
**Success Criteria** (what must be TRUE):
  1. Every CLI command outputs human-readable text by default (indented tree with counts, confirmation messages, breadcrumb paths)
  2. --json flag on any command bypasses the render function and returns raw structured JSON (current behavior becomes opt-in)
  3. JSON output mirrors the semantic content of the readable output
  4. Render function is a single code path shared by all commands
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md -- Render module: build lib/render.cjs with all render functions (card detail, mutations, path, errors) and unit tests
- [x] 03-02-PLAN.md -- CLI wiring: refactor burrow-tools.cjs for --json flag, render integration, remove list/children, update integration tests
- [x] 03-03-PLAN.md -- Gap closure: fix move --to flag, --depth recursive rendering, archive tag, count alignment

### Phase 4: Agent Interface
**Goal**: Users interact with Burrow through natural language and shortcut commands via `/burrow:*` namespace -- the agent interprets intent, calls CLI operations, and passes through the tool's rendered output
**Depends on**: Phase 3
**Requirements**: CMDS-01, CMDS-02, CMDS-03, CMDS-04, CMDS-05, CMDS-06
**Success Criteria** (what must be TRUE):
  1. User can type /burrow with any natural language request and the agent correctly interprets the intent, calls the right CLI operations, and presents the result
  2. User can use shortcut commands (/burrow:add, /burrow:show, /burrow:move, /burrow:archive, etc.) for common operations without typing full natural language
  3. Workflow file defines agent behavior: strict rules for data integrity, creative freedom for everything else, with worked examples
**Plans**: 2 plans

Plans:
- [ ] 04-01-PLAN.md -- Workflow file and /burrow NL command: agent behavior definition with invariants, command reference, worked examples
- [ ] 04-02-PLAN.md -- Shortcut commands, help, and REQUIREMENTS.md update: thin wrapper slash commands for all CLI operations

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Core Engine | 2/2 | Complete | 2026-03-07 |
| 2. Schema, Views, and Archive | 0/2 | Not started | - |
| 3. CLI Pretty-Print Rendering | 3/3 | Complete | 2026-03-08 |
| 4. Agent Interface | 0/2 | Not started | - |
