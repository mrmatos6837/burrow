# Requirements: Todobox

**Defined:** 2026-03-06
**Core Value:** The agent and the developer share a structured, scannable view of everything in flight — and the agent can reason about it.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foundation

- [ ] **FNDN-01**: CLI helper (`todobox-tools.cjs`) returns structured JSON for all operations
- [ ] **FNDN-02**: User can create, list, reorder, and delete buckets via `config.json`
- [ ] **FNDN-03**: User can add items with title, bucket, tags, and notes — stored in `items.json`
- [ ] **FNDN-04**: User can edit item title, tags, and notes
- [ ] **FNDN-05**: User can delete items
- [ ] **FNDN-06**: Items get 8-char hex IDs and auto-set creation timestamps
- [ ] **FNDN-07**: All writes are atomic (write-to-tmp + rename) to prevent corruption
- [ ] **FNDN-08**: `items.json.bak` written before each mutation as safety net

### Organization

- [ ] **ORGN-01**: User can assign tags to items
- [ ] **ORGN-02**: Tags emerge from usage or can be defined upfront
- [ ] **ORGN-03**: User can move items between buckets
- [ ] **ORGN-04**: User can search items by text across titles, notes, and tags
- [ ] **ORGN-05**: User can filter items by tag or bucket

### Rendering

- [ ] **RNDR-01**: Pan view displays bucket names with item counts in minimal dotted alignment
- [ ] **RNDR-02**: Drill view displays items grouped by tag with indentation
- [ ] **RNDR-03**: Drill view shows untagged items flat when no tags exist in a bucket
- [ ] **RNDR-04**: Rendering is clean, scannable, and readable in Claude Code's terminal

### Archive

- [ ] **ARCH-01**: User can archive items (sets `archived: true`, hidden from active views)
- [ ] **ARCH-02**: User can search within archived items

### Commands

- [ ] **CMDS-01**: `/gsd:todobox` handles any natural language command (agent interprets intent)
- [ ] **CMDS-02**: `/gsd:tb-add` shortcut for quick item creation
- [ ] **CMDS-03**: `/gsd:tb-show` shortcut for viewing buckets/items
- [ ] **CMDS-04**: `/gsd:tb-move` shortcut for moving items between buckets
- [ ] **CMDS-05**: `/gsd:tb-archive` shortcut for archiving items
- [ ] **CMDS-06**: Workflow file (`todobox.md`) defines agent behavior for all interactions

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Limits

- **LMTS-01**: Per-bucket item limits configurable in config.json
- **LMTS-02**: Agent-guided resolution when bucket limit is hit (move, raise, skip)

### GSD Integration

- **INTG-01**: Agent-driven reconciliation (compare completed work vs open items, suggest matches)
- **INTG-02**: Reconciliation step injected into GSD execute-phase, debug, verify-work workflows
- **INTG-03**: Bulk operations (archive/move multiple items during reconciliation)

### Quality of Life

- **QOL-01**: Config templates (predefined bucket setups like "Kanban", "GTD", "Bug Triage")
- **QOL-02**: Item statistics (age distribution, throughput, bucket velocity)
- **QOL-03**: Cross-bucket tag views (show all items with a tag across all buckets)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Priority scores / sorting algorithms | Bucket order = macro priority. Tags = micro priority. No false precision. |
| Due dates and reminders | No daemon process to trigger reminders. Buckets signal urgency. |
| Recurring / repeating tasks | No scheduler. Keep a "Rituals" bucket with permanent items instead. |
| Sub-task hierarchies | Use markdown checklist in item notes instead. Flat items with rich notes beats trees. |
| Interactive TUI (full-screen) | Runs inside Claude Code — nested TUI breaks agent output model. |
| Custom fields / metadata | Tags are the extensibility mechanism. Structured data goes in notes. |
| Sync / multi-device | Git IS the sync mechanism. Commit `.planning/todobox/` and push. |
| YAML frontmatter storage | Single JSON is faster, simpler, eliminates YAML parsing pitfalls entirely. |
| External dependencies | Zero npm deps. Node.js built-in APIs only. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FNDN-01 | — | Pending |
| FNDN-02 | — | Pending |
| FNDN-03 | — | Pending |
| FNDN-04 | — | Pending |
| FNDN-05 | — | Pending |
| FNDN-06 | — | Pending |
| FNDN-07 | — | Pending |
| FNDN-08 | — | Pending |
| ORGN-01 | — | Pending |
| ORGN-02 | — | Pending |
| ORGN-03 | — | Pending |
| ORGN-04 | — | Pending |
| ORGN-05 | — | Pending |
| RNDR-01 | — | Pending |
| RNDR-02 | — | Pending |
| RNDR-03 | — | Pending |
| RNDR-04 | — | Pending |
| ARCH-01 | — | Pending |
| ARCH-02 | — | Pending |
| CMDS-01 | — | Pending |
| CMDS-02 | — | Pending |
| CMDS-03 | — | Pending |
| CMDS-04 | — | Pending |
| CMDS-05 | — | Pending |
| CMDS-06 | — | Pending |

**Coverage:**
- v1 requirements: 25 total
- Mapped to phases: 0
- Unmapped: 25

---
*Requirements defined: 2026-03-06*
*Last updated: 2026-03-06 after initial definition*
