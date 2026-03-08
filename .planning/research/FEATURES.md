# Feature Research

**Domain:** Bucket-based CLI task manager for AI-assisted developer workflows (Claude Code addon)
**Researched:** 2026-03-06
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Add/edit/delete items | Every task tool has CRUD. Without it, nothing works. | LOW | CLI helper handles deterministic ops; agent handles intent parsing |
| User-defined buckets | Core concept of the product. Buckets ARE the organizing metaphor. | LOW | Config-driven (config.json), display order matters |
| Move items between buckets | Triage and workflow progression require moving items. Taskwarrior has `modify project:X`, Planner has drag-drop, todo.txt has manual edit. | LOW | Single CLI command, update frontmatter field |
| List/show items | Must render items clearly. Taskwarrior `task list`, todo.txt `list`, taskell columns. | MEDIUM | Two views needed: pan (overview) and drill (detail). Rendering quality is key. |
| Archive completed items | Every serious task tool separates done from active. todo.txt archives to done.txt, Taskwarrior marks `completed`, kanban-tui has Archive column. | LOW | Move file from items/ to archive/, preserve all metadata |
| Tags / sub-grouping | Taskwarrior has +tags, todo.txt has +projects and @contexts, kanban-tui has categories. Users expect some way to slice within a bucket. | MEDIUM | Tags in YAML frontmatter, drill view groups by tag |
| Search / filter items | Taskwarrior's filtering is its killer feature. Users expect to find things. At minimum: search by text, filter by tag, filter by bucket. | MEDIUM | CLI returns filtered JSON; agent can also do natural language search |
| Persistent flat-file storage | todo.txt proved plain-text storage is a feature, not a limitation. Devs want to `git diff` their task data. | LOW | Markdown + YAML frontmatter per item, JSON config. Already decided. |
| Bulk operations | Taskwarrior supports bulk modify/done. Archiving 5 items one-by-one is painful. | LOW | CLI accepts multiple item IDs; agent batches on reconciliation |
| Item creation timestamps | Every task tool tracks when items were created. Essential for "how long has this been sitting here?" | LOW | `created` field in YAML frontmatter, set automatically |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Agent-driven reconciliation | No other CLI task tool auto-matches completed work against open items. The agent reads git diffs / work summaries, suggests which items to archive. This is the core value prop. | HIGH | Requires agent context about completed work + fuzzy matching reasoning. User always confirms. |
| Natural language commands | Taskwarrior requires precise syntax (`task add project:inbox +bug`). Burrow lets the user say "add a bug about the login form to my inbox" and the agent figures it out. | MEDIUM | Agent interprets intent, calls CLI helper with structured args. The `/gsd:burrow` command is the NLP entry point. |
| Pan + drill two-level rendering | Most CLI tools show one view (flat list or kanban columns). Two zoom levels -- pan (bucket names + counts) and drill (items grouped by tag) -- give fast triage without information overload. | MEDIUM | Pan is trivial. Drill needs clean tag-grouped rendering with indentation. |
| Bucket limits with agent guidance | clikan has WIP limits, but just blocks. Burrow limits trigger a conversation: "Inbox has 10/10 items. Move some to Backlog, raise the limit, or skip?" | LOW | Config stores limit per bucket. CLI checks on add. Agent handles the conversation. |
| GSD workflow integration hooks | No standalone task tool integrates into an AI coding framework's workflow. Reconciliation after phase execution, debug sessions, and verification is unique. | HIGH | Requires injection points in GSD workflows. Must not modify GSD core files. |
| Per-item notes in markdown body | Taskwarrior has annotations (append-only strings). todo.txt is single-line. Burrow items are full markdown files -- the body below frontmatter IS the notes. Rich context per item for free. | LOW | Already inherent in the markdown-file-per-item design. No extra work. |
| Agent-readable structured output | CLI tools output human text. Burrow CLI outputs JSON for the agent and formatted text for the user. The agent can reason about task state programmatically. | MEDIUM | Dual output modes in the CLI helper. JSON schema must be stable. |
| Untagged items handled gracefully | Many tag-based systems break down when items have no tags. Burrow drill view shows untagged items flat (no sub-headers) when no tags exist in a bucket -- no empty-state awkwardness. | LOW | Rendering logic: if bucket has tags, group by them; if not, flat list. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Priority scores / sorting algorithms | Taskwarrior has urgency scores (priority + age + due date). Feels organized. | Adds complexity without value for a solo dev + agent. The user defines structure through bucket ordering and tags -- that IS the priority system. Priority scores create false precision and config overhead. | Bucket order = macro priority. Tag grouping = micro priority. The user's brain does the rest. |
| Due dates and reminders | Every "real" task manager has them. Feels like a gap without them. | Burrow runs inside Claude Code sessions, not as a background daemon. No process to trigger reminders. Due dates on dev tasks are usually project-level (handled by roadmap), not item-level. Adds YAML fields nobody maintains. | If a task is time-sensitive, put it in a bucket named "Urgent" or "This Sprint". The bucket IS the urgency signal. |
| Recurring / repeating tasks | Taskwarrior supports recurrence. Seems useful for standups, reviews. | Recurring tasks need a scheduler. Burrow has no daemon. Recurring items in a flat-file system means something has to create them -- the agent? On every session start? Over-engineering for a dev task list. | If you do something regularly, it's a habit, not a task. Keep a "Rituals" bucket with permanent items if you want a checklist. |
| Sync / multi-device access | Taskwarrior has Taskserver for sync. Devs work on multiple machines. | Burrow data lives in `.planning/burrow/` which is inside the project repo. Git IS the sync mechanism. Building a separate sync layer duplicates what git already does and adds conflict resolution complexity. | Commit `.planning/burrow/` to git. Push/pull. Done. |
| Sub-tasks / task hierarchies | Taskwarrior supports dependencies. Notion/Linear have sub-tasks. Feels structured. | Sub-tasks turn a simple list into a tree. Trees need collapse/expand UI, dependency resolution, "what happens when parent is archived but children aren't?" Edge cases multiply. The agent can't easily reason about deep hierarchies. | Use the markdown body of an item for a checklist. `- [ ] sub thing`. The agent can read and update it. Flat items with rich bodies beats structured hierarchies. |
| Custom fields / metadata | Taskwarrior supports User Defined Attributes (UDAs). Power users want `estimate:`, `assignee:`, etc. | Every custom field is a schema decision that bleeds into rendering, filtering, and the CLI helper. Burrow is opinionated: bucket, title, tags, created, notes. That's it. Custom fields create indefinite complexity. | Use tags liberally. Put structured data in the markdown body. Tags are the extensibility mechanism -- they're free-form and the agent can reason about them. |
| Interactive TUI (full-screen terminal UI) | taskwarrior-tui and kanban-tui look great. Visual kanban boards feel productive. | Burrow runs inside Claude Code, which is itself a terminal application. A nested TUI creates input-handling conflicts, steals the terminal from the agent, and breaks the "agent reads output" model. The rendering target is Claude Code's output pane, not a standalone terminal. | Clean, formatted text output that the agent can also parse. Pan and drill views give structure without hijacking the terminal. |
| Real-time collaboration / comments | Modern tools have comments and @mentions. | Single dev + agent. There's nobody else to collaborate with. Comments are just item notes. | The markdown body of each item is the "comment thread" -- add context there. |
| Undo / transaction history | Taskwarrior has `task undo`. Feels safe. | Undo in a flat-file system means tracking diffs or maintaining a log. Git already provides this -- `git diff`, `git checkout -- file`. Building a separate undo system duplicates version control. | Rely on git for undo. The files are plain text. `git checkout .planning/burrow/items/some-item.md` restores any item. |

## Feature Dependencies

```
[Bucket CRUD (config.json)]
    +--requires--> [Item CRUD (items/)]
    |                  +--requires--> [Tags in frontmatter]
    |                  |                  +--enables--> [Drill view tag grouping]
    |                  |
    |                  +--requires--> [Archive system (archive/)]
    |                  |                  +--enables--> [Reconciliation]
    |                  |
    |                  +--requires--> [Search / filter]
    |
    +--enables--> [Pan view (bucket names + counts)]
    +--enables--> [Bucket limits]

[CLI helper (burrow-tools.cjs)]
    +--required-by--> [All CRUD operations]
    +--required-by--> [Rendering (pan + drill)]
    +--required-by--> [Structured JSON output]

[Natural language command (/gsd:burrow)]
    +--requires--> [CLI helper]
    +--requires--> [Shortcut commands (bw-add, bw-show, etc.)]

[GSD workflow integration]
    +--requires--> [Reconciliation]
    +--requires--> [CLI helper]

[Reconciliation]
    +--requires--> [Item CRUD]
    +--requires--> [Archive system]
    +--requires--> [Search / filter]
```

### Dependency Notes

- **Item CRUD requires Bucket CRUD:** Items reference a bucket. Buckets must exist in config before items can be assigned.
- **Drill view requires Tags:** Tag grouping only works if items have tags in frontmatter. But drill view must also handle the no-tags case gracefully (flat list).
- **Reconciliation requires Archive + Search:** The agent needs to search open items and archive matches. Both subsystems must work first.
- **Natural language requires CLI helper + shortcuts:** The agent interprets intent, then dispatches to the CLI helper via shortcut commands. The plumbing must exist before the NLP layer.
- **GSD integration requires Reconciliation:** The workflow hooks call the reconciliation step. Reconciliation is the bridge between GSD workflows and Burrow.

## MVP Definition

### Launch With (v1)

Minimum viable product -- what's needed to validate the concept.

- [ ] Bucket CRUD (create, list, reorder, delete buckets in config.json) -- the organizing structure
- [ ] Item CRUD (add, edit, delete items as markdown files with YAML frontmatter) -- the core data
- [ ] Tags in frontmatter (assign tags to items, no predefined tag list required) -- sub-grouping
- [ ] Pan view (bucket names + item counts, dotted alignment) -- at-a-glance status
- [ ] Drill view (items grouped by tag within a bucket, untagged items flat) -- triage view
- [ ] Archive system (move completed items to archive/, hidden from default views) -- declutter
- [ ] Search/filter (by text, tag, bucket) -- find things
- [ ] CLI helper (burrow-tools.cjs) with JSON output -- deterministic operations for agent
- [ ] Shortcut commands (bw-add, bw-show, bw-move, bw-archive) -- fast entry points
- [ ] Natural language command (/gsd:burrow) -- the "just tell me what you want" interface

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] Bucket limits with agent guidance -- add when users report inbox overflow
- [ ] Reconciliation against completed work -- add when GSD workflow integration points are clear
- [ ] GSD workflow integration hooks -- add after reconciliation is solid
- [ ] Bulk operations (archive/move/tag multiple items) -- add when single-item ops feel tedious
- [ ] Archive search (search within archived items) -- add when archive grows large enough to need it

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Config templates (predefined bucket setups like "Kanban", "GTD", "Bug Triage") -- useful but not essential
- [ ] Item statistics (age distribution, throughput, bucket velocity) -- nice for retrospectives
- [ ] Export / reporting (generate a summary of what was done this week) -- the agent can do this ad-hoc already
- [ ] Cross-bucket tag views (show all items with +bug across all buckets) -- useful at scale

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Bucket CRUD | HIGH | LOW | P1 |
| Item CRUD | HIGH | LOW | P1 |
| Tags in frontmatter | HIGH | LOW | P1 |
| Pan view | HIGH | MEDIUM | P1 |
| Drill view | HIGH | MEDIUM | P1 |
| Archive system | HIGH | LOW | P1 |
| CLI helper (JSON output) | HIGH | MEDIUM | P1 |
| Search / filter | HIGH | MEDIUM | P1 |
| Shortcut commands | MEDIUM | LOW | P1 |
| Natural language command | HIGH | LOW | P1 |
| Bucket limits | MEDIUM | LOW | P2 |
| Reconciliation | HIGH | HIGH | P2 |
| GSD workflow hooks | HIGH | HIGH | P2 |
| Bulk operations | MEDIUM | LOW | P2 |
| Archive search | LOW | LOW | P2 |
| Config templates | LOW | LOW | P3 |
| Item statistics | LOW | MEDIUM | P3 |
| Export / reporting | LOW | LOW | P3 |
| Cross-bucket tag views | MEDIUM | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Taskwarrior | todo.txt | taskell (CLI Kanban) | clikan | Burrow Approach |
|---------|-------------|----------|----------------------|--------|------------------|
| Organization model | Single flat list with projects + tags + filters | Single text file with +projects and @contexts | Kanban columns (lists) | 3 fixed columns (todo/doing/done) | User-defined buckets with tags for sub-grouping |
| Item complexity | Rich: priority, due date, recurrence, UDAs, annotations | Minimal: single line, priority letter, dates | Moderate: sub-tasks, due dates | Minimal: title only | Moderate: YAML frontmatter + full markdown body for notes |
| Archiving | Marks completed, keeps in DB, can purge | Moves done lines to done.txt | Done column | Done column | Moves file to archive/ directory, searchable |
| Filtering | Powerful algebraic filter expressions | Basic grep on text file | None (visual scan) | None | CLI filter by text, tag, bucket; agent does NLP queries |
| Views | Custom reports (configurable columns, sort, filter) | Single list | Visual kanban board | Visual 3-column board | Pan (overview counts) + Drill (tag-grouped items) |
| Agent integration | None (designed for humans) | None | None | None | First-class: JSON output, NLP commands, reconciliation |
| WIP limits | None | None | None | Configurable per-column | Per-bucket limits with agent-guided resolution |
| Storage format | Binary database | Single text file | Markdown file | SQLite | Markdown files + YAML frontmatter (one per item) + JSON config |
| Extensibility | UDAs, hooks, custom reports | Shell script addons | None | None | Tags (free-form), markdown body (freeform), GSD addon architecture |

## Sources

- [Taskwarrior official docs -- filters](https://taskwarrior.org/docs/filter/)
- [Taskwarrior -- tags and virtual tags](https://taskwarrior.org/docs/tags/)
- [Taskwarrior -- best practices](https://taskwarrior.org/docs/best-practices/)
- [Taskwarrior -- contexts](https://taskwarrior.org/docs/context/)
- [todo.txt format and CLI](http://todotxt.org/)
- [todo.txt-cli GitHub](https://github.com/todotxt/todo.txt-cli)
- [taskell -- CLI Kanban with Trello/GitHub support](https://github.com/smallhadroncollider/taskell)
- [clikan -- simple CLI kanban](https://github.com/kitplummer/clikan)
- [kanban-tui -- terminal kanban with customizable columns](https://github.com/Zaloog/kanban-tui)
- [taskwarrior-tui -- terminal UI for Taskwarrior](https://github.com/kdheepak/taskwarrior-tui)
- [Taskwarrior bulk undo discussion](https://github.com/GothenburgBitFactory/taskwarrior/discussions/3132)
- [Microsoft Planner bucket-based task management](https://support.microsoft.com/en-us/office/create-buckets-to-sort-your-tasks-238af119-3c2b-4cbb-a124-29da99488139)
- [Claude Code task management and subagents](https://code.claude.com/docs/en/sub-agents)

---
*Feature research for: Bucket-based CLI task manager (Claude Code addon)*
*Researched: 2026-03-06*
