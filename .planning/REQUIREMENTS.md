# Requirements: Burrow

**Defined:** 2026-03-07
**Core Value:** One recursive data structure navigated by an agent that can traverse, summarize, and render any slice at any depth.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Data Layer

- [x] **DATA-01**: Cards are nestable — each card can contain child cards to arbitrary depth
- [x] **DATA-02**: Cards stored in single `cards.json` file as a recursive JSON tree
- [x] **DATA-03**: User can add a card at any point in the tree (root or as child of any card)
- [x] **DATA-04**: User can edit card title and notes
- [x] **DATA-05**: User can delete a card (and its descendants)
- [x] **DATA-06**: User can move a card (and its descendants) to a different parent
- [x] **DATA-07**: Cards get 8-char hex IDs and auto-set creation timestamps
- [x] **DATA-08**: Each card has a `position` field; each parent has `children.ordering` (custom, alpha-asc, alpha-desc)
- [x] **DATA-09**: All writes are atomic (write-to-tmp + rename) to prevent corruption
- [x] **DATA-10**: `cards.json.bak` written before each mutation as safety net

### Schema Migration (Phase 2)

- [x] **SCHEMA-01**: Drop `position` field — array index IS the display order
- [x] **SCHEMA-02**: Drop `ordering` field from containers — agent sorts on demand via move operations
- [x] **SCHEMA-03**: Rename `notes` to `body` — generic free-form content field
- [x] **SCHEMA-04**: Simplified card schema: `{id, title, created, archived, body, children[]}`

### Rendering

- [x] **RNDR-01**: `get` is the universal view command — `get [id] [--depth N]` covers all read operations
- [x] **RNDR-02**: Flat render array output — each entry: `{id, title, depth, descendantCount, hasBody, bodyPreview, created, archived}`
- [x] **RNDR-03**: Depth model — no flag = card + direct children; `--depth N` = N levels; `--depth 0` = full tree; cards at cutoff show `(N)` active descendant count
- [x] **RNDR-04**: Breadcrumbs on focused subtree — ancestry path shown when viewing a non-root card
- [x] **RNDR-05**: Archived cards excluded from views by default; `--include-archived` or `--archived-only` flags to see them

### Archive

- [x] **ARCH-01**: `archive <id>` and `unarchive <id>` commands — both cascade to all descendants
- [x] **ARCH-02**: Active-only descendant counts — archived children not counted in `(N)`
- [x] **ARCH-03**: Archived cards keep original tree position when viewed with `--include-archived`

### CLI

- [x] **CLI-01**: CLI helper (`burrow-tools.cjs`) returns structured JSON for all operations
- [x] **CLI-02**: CLI supports tree traversal operations (get card by ID, get children, get path to card)
- [x] **CLI-03**: `get` replaces list/dump/children as universal view — aliases for backward compat (list = get no args, dump = get --depth 0, children = get <id>)
- [x] **CLI-04**: Stateless CLI — no persistent working directory; agent holds context conversationally

### Commands

- [ ] **CMDS-01**: `/gsd:burrow` handles any natural language command (agent interprets intent)
- [ ] **CMDS-02**: `/gsd:bw-add` shortcut for quick card creation
- [ ] **CMDS-03**: `/gsd:bw-show` shortcut for viewing tree at specified depth/focus
- [ ] **CMDS-04**: `/gsd:bw-move` shortcut for moving cards
- [ ] **CMDS-05**: `/gsd:bw-archive` shortcut for archiving cards
- [ ] **CMDS-06**: Workflow file (`burrow.md`) defines agent behavior for all interactions

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### GSD Integration

- **INTG-01**: Agent-driven reconciliation (compare completed work vs open cards, suggest matches)
- **INTG-02**: Reconciliation step in GSD execute-phase, debug, verify-work workflows
- **INTG-03**: Bulk operations during reconciliation

### Plugin Packaging

- **PLUG-01**: Standalone Claude Code plugin (not GSD-dependent)
- **PLUG-02**: Generic command adapter (not `/gsd:` prefixed)
- **PLUG-03**: Install script for any Claude Code project

### Concurrency & Multi-Agent

- **CONC-01**: File locking (lock file or semaphore) to prevent concurrent write conflicts
- **CONC-02**: Stale lock detection and cleanup (handle crashed processes)
- **CONC-03**: Multi-agent safety — multiple Claude Code sessions can operate on the same burrow without data loss
- **CONC-04**: Multi-file support for scaling large trees across separate files

### Quality of Life

- **QOL-01**: Card limits per subtree with agent-guided resolution
- **QOL-02**: Statistics (card counts by depth, age distribution)
- **QOL-03**: Export / reporting

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Search command | Agent ingests full tree via `get --depth 0` and searches in memory. Burrow is a structured dataset + view renderer, not a query engine. |
| Priority scores / sorting | Tree structure IS the organization. Nesting = priority. |
| Due dates and reminders | No daemon. Use tree structure to signal urgency. |
| Recurring tasks | No scheduler. Use permanent cards for rituals. |
| Custom fields / metadata | Body field handles free-form context. Keep schema frozen. |
| Interactive TUI (full-screen) | Runs inside Claude Code — nested TUI breaks agent output model. |
| External dependencies | Zero npm deps. Node.js built-in APIs only. |
| Sync / multi-device | Git IS the sync. Commit and push. |
| Separate buckets/tags concepts | One recursive type replaces all. Nesting is the universal organizer. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Complete |
| DATA-03 | Phase 1 | Complete |
| DATA-04 | Phase 1 | Complete |
| DATA-05 | Phase 1 | Complete |
| DATA-06 | Phase 1 | Complete |
| DATA-07 | Phase 1 | Complete |
| DATA-08 | Phase 1 | Complete (superseded by SCHEMA-01/02 in Phase 2) |
| DATA-09 | Phase 1 | Complete |
| DATA-10 | Phase 1 | Complete |
| SCHEMA-01 | Phase 2 | Complete |
| SCHEMA-02 | Phase 2 | Complete |
| SCHEMA-03 | Phase 2 | Complete |
| SCHEMA-04 | Phase 2 | Complete |
| RNDR-01 | Phase 2 | Complete |
| RNDR-02 | Phase 2 | Complete |
| RNDR-03 | Phase 2 | Complete |
| RNDR-04 | Phase 2 | Complete |
| RNDR-05 | Phase 2 | Complete |
| ARCH-01 | Phase 2 | Complete |
| ARCH-02 | Phase 2 | Complete |
| ARCH-03 | Phase 2 | Complete |
| CLI-01 | Phase 1 | Complete |
| CLI-02 | Phase 1 | Complete |
| CLI-03 | Phase 2 | Complete |
| CLI-04 | Phase 2 | Complete |
| CMDS-01 | Phase 4 | Pending |
| CMDS-02 | Phase 4 | Pending |
| CMDS-03 | Phase 4 | Pending |
| CMDS-04 | Phase 4 | Pending |
| CMDS-05 | Phase 4 | Pending |
| CMDS-06 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0

---
*Requirements defined: 2026-03-07*
*Last updated: 2026-03-08 — phases 3/4 swapped: CLI rendering before agent interface*
