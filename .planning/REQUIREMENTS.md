# Requirements: Todobox

**Defined:** 2026-03-07
**Core Value:** One recursive data structure navigated by an agent that can traverse, summarize, and render any slice at any depth.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Data Layer

- [ ] **DATA-01**: Items are nestable — each item can contain child items to arbitrary depth
- [ ] **DATA-02**: Items stored in single `items.json` file as a recursive JSON tree
- [ ] **DATA-03**: User can add an item at any point in the tree (root or as child of any item)
- [ ] **DATA-04**: User can edit item title and notes
- [ ] **DATA-05**: User can delete an item (and its descendants)
- [ ] **DATA-06**: User can move an item (and its descendants) to a different parent — position determined by target's ordering mode
- [ ] **DATA-07**: Items get 8-char hex IDs and auto-set creation timestamps
- [ ] **DATA-08**: Each item has a `position` field; each parent has `children.ordering` (custom, alpha-asc, alpha-desc)
- [ ] **DATA-09**: All writes are atomic (write-to-tmp + rename) to prevent corruption
- [ ] **DATA-10**: `items.json.bak` written before each mutation as safety net

### Rendering

- [ ] **RNDR-01**: Indented list view with configurable depth cutoff
- [ ] **RNDR-02**: Items beyond depth cutoff show total descendant count as `(N)`
- [ ] **RNDR-03**: Rendering focused on a subtree (show specific item and its children)
- [ ] **RNDR-04**: Output is clean, scannable, and readable in Claude Code's terminal

### Archive

- [ ] **ARCH-01**: User can archive an item (sets `archived: true`, hidden from active views)
- [ ] **ARCH-02**: User can search within archived items

### Search

- [ ] **SRCH-01**: User can search items by text across titles and notes at any depth
- [ ] **SRCH-02**: Search results show item path (ancestry) for context

### CLI

- [ ] **CLI-01**: CLI helper (`todobox-tools.cjs`) returns structured JSON for all operations
- [ ] **CLI-02**: CLI supports tree traversal operations (get item by ID, get children, get path to item)

### Commands

- [ ] **CMDS-01**: `/gsd:todobox` handles any natural language command (agent interprets intent)
- [ ] **CMDS-02**: `/gsd:tb-add` shortcut for quick item creation
- [ ] **CMDS-03**: `/gsd:tb-show` shortcut for viewing tree at specified depth/focus
- [ ] **CMDS-04**: `/gsd:tb-move` shortcut for moving items
- [ ] **CMDS-05**: `/gsd:tb-archive` shortcut for archiving items
- [ ] **CMDS-06**: Workflow file (`todobox.md`) defines agent behavior for all interactions

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### GSD Integration

- **INTG-01**: Agent-driven reconciliation (compare completed work vs open items, suggest matches)
- **INTG-02**: Reconciliation step in GSD execute-phase, debug, verify-work workflows
- **INTG-03**: Bulk operations during reconciliation

### Plugin Packaging

- **PLUG-01**: Standalone Claude Code plugin (not GSD-dependent)
- **PLUG-02**: Generic command adapter (not `/gsd:` prefixed)
- **PLUG-03**: Install script for any Claude Code project

### Quality of Life

- **QOL-01**: Item limits per subtree with agent-guided resolution
- **QOL-02**: Statistics (item counts by depth, age distribution)
- **QOL-03**: Export / reporting

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Priority scores / sorting | Tree structure IS the organization. Nesting = priority. |
| Due dates and reminders | No daemon. Use tree structure to signal urgency. |
| Recurring tasks | No scheduler. Use permanent items for rituals. |
| Custom fields / metadata | Notes field handles free-form context. Keep schema frozen. |
| Interactive TUI (full-screen) | Runs inside Claude Code — nested TUI breaks agent output model. |
| External dependencies | Zero npm deps. Node.js built-in APIs only. |
| Sync / multi-device | Git IS the sync. Commit and push. |
| Separate buckets/tags concepts | One recursive type replaces all. Nesting is the universal organizer. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Pending |
| DATA-02 | Phase 1 | Pending |
| DATA-03 | Phase 1 | Pending |
| DATA-04 | Phase 1 | Pending |
| DATA-05 | Phase 1 | Pending |
| DATA-06 | Phase 1 | Pending |
| DATA-07 | Phase 1 | Pending |
| DATA-08 | Phase 1 | Pending |
| DATA-09 | Phase 1 | Pending |
| DATA-10 | Phase 1 | Pending |
| RNDR-01 | Phase 2 | Pending |
| RNDR-02 | Phase 2 | Pending |
| RNDR-03 | Phase 2 | Pending |
| RNDR-04 | Phase 2 | Pending |
| ARCH-01 | Phase 2 | Pending |
| ARCH-02 | Phase 2 | Pending |
| SRCH-01 | Phase 2 | Pending |
| SRCH-02 | Phase 2 | Pending |
| CLI-01 | Phase 1 | Pending |
| CLI-02 | Phase 1 | Pending |
| CMDS-01 | Phase 3 | Pending |
| CMDS-02 | Phase 3 | Pending |
| CMDS-03 | Phase 3 | Pending |
| CMDS-04 | Phase 3 | Pending |
| CMDS-05 | Phase 3 | Pending |
| CMDS-06 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0

---
*Requirements defined: 2026-03-07*
*Last updated: 2026-03-07 -- Updated traceability for nested list model roadmap*
