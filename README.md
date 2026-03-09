# Burrow

There's a hole in the ground next to your project. Chuck any thought into it — it's stored before you finish the sentence. Need it back? Already there.

Burrow is an infinitely nestable card store for [Claude Code](https://claude.ai/claude-code). Cards contain cards contain cards, as deep as you want. The agent navigates the whole thing so you never have to (unless you want to).

> "throw a note on the OAuth issue — redirect is broken again"
>
> "move everything from backlog into sprint"
>
> "what's left under bugs? show me the details"

You talk. The agent traverses, renders, and manipulates. One file, one source of truth, zero ceremony.

## How it works

One recursive data structure. That's it.

```
burrow › Mock

────────────────────────────────────────
Mock
────────────────────────────────────────
id:       2bdb294a
created:  2026-03-08 (1d ago)
archived: no
────────────────────────────────────────
children: 3 cards (14 total)
  ├─ [82c35e2c] Backend Services (9)                                    1d ago
  │   ├─ [8698f27b] Auth API (6) …                                      1d ago
  │   │   ├─ [7d274551] Token Refresh Flow (3) …                        1d ago
  │   │   └─ [a91b72bb] Rate Limiter (1)                                1d ago
  │   └─ [1a763ccd] Data Pipeline (1)                                   1d ago
  │       └─ [df36b887] ETL Jobs                                        1d ago
  ├─ [4f42eb4e] Frontend App (6)                                        1d ago
  │   ├─ [e044cc9f] Dashboard (4)                                       1d ago
  │   │   ├─ [f7ee4392] Widget Grid …                                   1d ago
  │   │   └─ [69f7e0d4] Charts (2)                                      1d ago
  │   └─ [5a9daea7] Settings Page …                                     1d ago
  └─ [cbe50a76] DevOps (2)                                              1d ago
      └─ [c5b5131a] CI/CD (1)                                           1d ago
          └─ [dd4fc5d8] GitHub Actions …
────────────────────────────────────────
body:
  Demo data for showcasing nested tree rendering at various depths.
────────────────────────────────────────
```

Every card has a title and a body. The body holds whatever you want — a description, repro steps, a decision rationale, agent instructions, bug details...

But every card can also contain child cards, and every child can contain more children. There are no buckets, tags, categories, or priorities — the structure IS the organization. A "bug tracker" is just a card called "bugs" with children. A "shopping list" is another top-level card. You decide what the tree means.

The agent picks the depth, the focus, and the rendering. You just ask.

## Setup

Requires [Claude Code](https://docs.anthropic.com/en/docs/claude-code) already installed on your project.

```bash
git clone https://github.com/mrmatos6837/burrow.git
node burrow/install.cjs ~/your-project
```

This copies the source and commands into your project, creates `.planning/burrow/cards.json`, and appends a Burrow section to your `CLAUDE.md` that tells the agent how to use burrow — reading it on session start, storing persistent instructions as cards, and routing all mutations through the CLI.

That's it. Open Claude Code and say `/burrow` to get started.

**What gets installed:**

```
.claude/burrow/                  # source code (lib/, CLI entry point)
.claude/commands/burrow.md       # /burrow slash command
.claude/commands/burrow/         # shortcut commands (/burrow:add, etc.)
.planning/burrow/cards.json      # your data (commit this)
CLAUDE.md                        # agent instructions (appended, not overwritten)
```

**Requirements:** Node.js v19+ — zero npm dependencies.

## Usage

Use `/burrow` with natural language:

```
/burrow add a login crash bug under auth — "happens after OAuth redirect"
/burrow move everything from backlog into sprint
/burrow archive all the v1 stuff, it shipped
/burrow show me what's left under bugs with full details
```

Or use the shortcut commands directly:

```
/burrow:add       /burrow:read      /burrow:dump
/burrow:edit      /burrow:move      /burrow:archive
/burrow:remove    /burrow:unarchive /burrow:help
```

All data lives in a single file: `.planning/burrow/cards.json`. The agent reads it into memory, resolves your references, and calls the CLI. You never touch JSON.

## Agent Memory

Say "remember to always use bun" or "don't forget — the API key comes from vault" and it becomes a card. The agent reads burrow on every session start, so persistent instructions survive context resets. No separate memory system, no markdown files drifting out of sync — just cards.

## CLI Reference

Under the hood, everything goes through `burrow-tools.cjs`. The agent calls it for you, but you can run it directly too:

```bash
node .claude/burrow/burrow-tools.cjs <command> [options]
```

### Reading

```bash
read                          # show top-level cards
read <id>                     # show a card and its direct children
read <id> --depth 3           # show 3 levels of nesting
read <id> --depth 0           # show the entire subtree (no limit)
read <id> --full              # show full card bodies (no truncation)
read --include-archived       # include archived cards in output
read --archived-only          # show only archived cards
dump                          # show everything: full tree, full bodies
```

`read` with no ID shows the root. With an ID, it focuses on that card and shows breadcrumb ancestry. The default depth is 1 (direct children only).

`dump` is shorthand for `read --depth 0 --full` — the "show me everything" command.

Bodies longer than 200 characters are truncated unless you pass `--full`.

### Creating

```bash
add --title "Bug tracker"                    # add to root
add --title "Login crash" --parent <id>      # add as child
add --title "First" --body "Details here"    # add with body
add --title "Urgent" --parent <id> --at 0    # insert at position
```

`--at` takes a 0-based index. `--at 0` puts the card first, omitting it appends to the end.

### Editing

```bash
edit <id> --title "New title"
edit <id> --body "Updated description"
edit <id> --title "New" --body "Both at once"
```

Only the fields you pass get changed. Everything else stays the same.

### Moving

```bash
move <id> --to <parent-id>         # move to a different parent
move <id> --to root                # move to root level
move <id> --at 0                   # reorder within current parent (move to first)
move <id> --to <parent-id> --at 2  # move to parent at specific position
```

`--to` sets the destination parent. `--at` sets the position (0-based). Use `--at` alone to reorder within the current parent without moving.

The CLI prevents cycles — you can't move a card into its own subtree.

### Archiving

```bash
archive <id>                  # archive card and all descendants
unarchive <id>                # restore card and all descendants
```

Archiving cascades — archiving a parent archives its entire subtree. Unarchiving restores the whole subtree. Archived cards are hidden from `read` by default.

### Deleting

```bash
remove <id>                   # permanently delete card and all descendants
```

This is permanent — the card and its entire subtree are gone. But `cards.json` is tracked in git, and every write creates a `.bak` file with the previous state, so recovery is always possible.

### Finding

```bash
find <query>                  # search card titles (case-insensitive)
path <id>                     # show ancestry path from root to card
```

`find` searches all active (non-archived) card titles and returns matches with their full path. `path` shows the breadcrumb trail: `burrow > parent > child [id]`.

### Card Schema

Every card has this shape:

```json
{
  "id": "8eaff688",
  "title": "Card title",
  "created": "2026-03-07T19:08:41.051Z",
  "archived": false,
  "body": "Free-form text, any length",
  "children": []
}
```

IDs are 8-character hex strings, generated automatically. Timestamps are ISO 8601. The body field is free-form — use it for descriptions, notes, agent instructions, whatever you want.

### Tree Output

The pretty-printed tree shows indicators after each card title:

```
  ├─ [8698f27b] Auth API (6) …                   1d ago
```

- `(N)` — active descendant count (hidden when 0)
- `…` — card has a body (read the card to see it)
- `[archived]` — card is archived (only visible with `--include-archived`)
- `1d ago` — relative age, right-aligned

## Why

AI agents working on your project need to track state — tasks, decisions, context. But reading scattered files is expensive, so they cache. Caches drift. Markdown summaries go stale. Multiple files representing the same data fall out of sync. I've [measured it](field-reports/agent-state-drift.md): a 29% failure rate keeping two representations of the same data in sync, with silent drift accumulating over 24 hours before anyone notices.

What if you made the source of truth so cheap to read that caching was pointless?

A flat TODO list wasn't enough. A full-blown project tracker was too much. I needed something in between — a place to throw structured thoughts without ceremony, that the agent could read and write as naturally as I could talk to it.

That's Burrow. One file, one read, one truth — it's just JSON. Zero dependencies, near-instant reads. No caches to invalidate. No sync steps to skip. No secondary updates to forget.

Consistent, reliable, fast and infinitely extensible.

## Uninstall

Delete the files and it's gone. No background processes, no global state, nothing to clean up.

```bash
rm -rf .claude/burrow .claude/commands/burrow.md .claude/commands/burrow .planning/burrow
```

Then remove the "Burrow — Agent Memory" section from your `CLAUDE.md`.

## Privacy

Burrow data is meant to be committed to git. Anything stored in cards is visible to anyone with repo access. Avoid storing secrets, credentials, or sensitive personal information.

## FAQ

**What's `cards.json.bak`?**

Every time burrow writes, it saves the previous version as `.bak` before touching the real file. The actual write goes to a `.tmp` file first, then gets atomically renamed to `cards.json` — so your data is either the old version or the new version, never half-written. The `.bak` is a bonus rollback if you ever need it. It's in `.gitignore` by default.

**Can I lose data?**

Burrow uses atomic writes (tmp file + rename), which is the safest way to write files on disk. Your data won't corrupt from a crash or killed process. The `.bak` file is there as an extra safety net.

**Can multiple agents use the same burrow?**

There's no file locking yet, so two agents writing at the same time could overwrite each other. If you make sure they don't write simultaneously, it works fine. Use at your own risk.

**How big can the tree get?**

No artificial limits — it's just JSON. The practical ceiling is when the file gets too large for the agent to read in one shot, which is thousands of cards. You'll run out of things to track before you hit it.

**Should I commit cards.json?**

Yes, that's the point. It's your project state, version-controlled like everything else.

**Can I edit cards.json by hand?**

You can, it's just JSON. But the CLI handles IDs, timestamps, and structure for you. If you edit manually, make sure the schema stays valid.

**Does it work with other AI agents?**

Right now it's built for Claude Code. The slash commands and workflow file are Claude-specific. The CLI itself (`burrow-tools.cjs`) is just a Node script — any agent that can run shell commands could use it, but the integration layer would need to be built.

## Contributing

Issues and PRs welcome.

## License

TBD
