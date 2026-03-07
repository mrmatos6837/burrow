# Roadmap: Burrow

## Overview

Burrow delivers a recursive nested list tool navigated by an AI agent. The build follows strict dependency order: first the core data engine and CLI skeleton (recursive tree CRUD, single JSON storage, atomic writes, tree traversal), then views and features (depth-configurable rendering, search, archive), and finally the agent interface (workflow file and GSD commands for natural language and shortcut interaction). Storage is a single JSON file (items.json) with a recursive tree structure -- no buckets, no tags, no flat lists.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Core Engine** - Recursive tree data layer with CLI tool skeleton and single JSON storage
- [ ] **Phase 2: Views and Features** - Depth-configurable rendering, search across the tree, and archive system
- [ ] **Phase 3: Agent Interface** - Workflow file and GSD commands for natural language and shortcut interaction

## Phase Details

### Phase 1: Core Engine
**Goal**: Users can create, read, update, delete, and move items in a recursive tree stored as a single JSON file, via a CLI tool that returns structured JSON
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, DATA-08, DATA-09, DATA-10, CLI-01, CLI-02
**Success Criteria** (what must be TRUE):
  1. User can add an item at the root or as a child of any existing item, and the item appears in items.json with correct parent-child nesting, an 8-char hex ID, creation timestamp, and position
  2. User can edit an item's title and notes, delete an item and all its descendants, and move an item (with its subtree) to a different parent -- position determined by target's ordering mode
  3. Every mutation writes atomically (tmp + rename) and creates items.json.bak before modifying data
  4. CLI tool can traverse the tree: get any item by ID, list its children, and return the full ancestry path from root to that item
  5. Each parent's children respect their ordering mode (custom by position, alpha-asc, alpha-desc)
**Plans**: 2 plans

Plans:
- [ ] 01-01-PLAN.md -- Data layer: core helpers, atomic storage, and recursive tree operations with tests
- [ ] 01-02-PLAN.md -- CLI router: wire all 8 subcommands into burrow-tools.cjs with integration tests

### Phase 2: Views and Features
**Goal**: Users can see their tree rendered as an indented list at any depth, search across all items, and archive completed items
**Depends on**: Phase 1
**Requirements**: RNDR-01, RNDR-02, RNDR-03, RNDR-04, ARCH-01, ARCH-02, SRCH-01, SRCH-02
**Success Criteria** (what must be TRUE):
  1. User can view the tree as an indented list with a configurable depth cutoff, where items beyond the cutoff show collapsed descendant counts as (N)
  2. User can focus on any subtree and see that item and its children rendered as a clean, scannable indented list in Claude Code's terminal
  3. User can archive an item to hide it from active views, and search within archived items to find old work
  4. User can search by text across titles and notes at any depth, with results showing the full ancestry path for context
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

### Phase 3: Agent Interface
**Goal**: Users interact with Burrow through natural language and shortcut commands -- the agent interprets intent, picks depth and focus, and renders the right view
**Depends on**: Phase 2
**Requirements**: CMDS-01, CMDS-02, CMDS-03, CMDS-04, CMDS-05, CMDS-06
**Success Criteria** (what must be TRUE):
  1. User can type /gsd:burrow with any natural language request and the agent correctly interprets the intent, calls the right CLI operations, and renders a useful response
  2. User can use shortcut commands (/gsd:bw-add, /gsd:bw-show, /gsd:bw-move, /gsd:bw-archive) for common operations without typing full natural language
  3. Workflow file defines clear agent behavior for all interactions -- intent parsing, tree navigation, depth selection, and output formatting
**Plans**: TBD

Plans:
- [ ] 03-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Core Engine | 0/2 | Not started | - |
| 2. Views and Features | 0/2 | Not started | - |
| 3. Agent Interface | 0/1 | Not started | - |
