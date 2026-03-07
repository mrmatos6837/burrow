# Burrow

There's a hole in the ground next to your project. Chuck any thought into it — it's stored before you finish the sentence. Need it back? Already there.

Burrow is an infinitely nestable item store for [Claude Code](https://claude.ai/claude-code). Items contain items contain items, as deep as you want. Your AI agent navigates the whole thing so you never have to.

> "show me all my bugs with details"
>
> "add a note under the OAuth issue"
>
> "move everything from backlog into sprint"

You talk. The agent traverses, renders, and manipulates. One file, one source of truth, zero ceremony.

## How it works

One recursive data structure. That's it.

```
depth=1:
  bugs ...................... (5)
  features .................. (3)
  research .................. (4)

depth=2:
  bugs
    * Login redirect broken
    * API timeout ........... (2)
    * Dark mode flicker
    * Sidebar overlap
    * Auth token race
```

Every item can contain child items. Every child can contain more children. There are no buckets, tags, categories, or priorities — the structure IS the organization. A "bug tracker" is just an item called "bugs" with children. A "shopping list" is another top-level item. You decide what the tree means.

The agent picks the depth, the focus, and the rendering. You just ask.

## Why

AI agents working on your project need a place to store and retrieve structured information — fast, reliably, without drift.

Flat files drift. Denormalized markdown caches go stale. Multiple files representing the same data fall out of sync. We've [measured it](field-reports/agent-state-drift.md): a 29% failure rate on keeping two representations of the same data in sync, with silent drift accumulating over 24 hours before anyone notices.

Burrow fixes this by being one file, one read, one truth. No caches. No sync steps to skip. No secondary updates to forget.

## Status

**Work in progress.** The core engine is built (recursive tree CRUD, atomic JSON storage, CLI tool). Views, search, archive, and the agent interface are next.

## Technical details

- **Runtime**: Node.js built-in APIs only — zero npm dependencies
- **Storage**: Single JSON file with atomic writes (tmp + rename) and automatic backups
- **Interface**: CLI returns structured JSON; the agent handles rendering and natural language
- **Scope**: Per-project, lives in `.planning/burrow/`

## License

TBD
