# Phase 1: Core Engine - Research

**Researched:** 2026-03-07
**Domain:** Recursive tree data layer + CLI tool (Node.js, single JSON file, zero dependencies)
**Confidence:** HIGH

## Summary

Phase 1 builds the entire data engine and CLI skeleton for Burrow: a recursive tree stored in a single `items.json` file, manipulated through flat CLI subcommands that return structured JSON. The domain is well-understood -- it is pure Node.js file I/O, JSON manipulation, and tree traversal with no external dependencies. The existing project research (STORAGE.md, STACK.md, ARCHITECTURE.md) already resolved the major design questions. CONTEXT.md locks down the CLI surface, output contract, move/ordering behavior, and init semantics.

The recursive tree model is the core complexity. Each item contains a `children` object with its own `ordering` mode and `items` array. Operations like "find by ID", "get ancestry path", "move subtree", and "recompact sibling positions" all require recursive tree traversal. The data model from PROJECT.md is the canonical schema. No YAML, no markdown files, no directories -- just one JSON file with atomic writes.

**Primary recommendation:** Build in two layers: (1) a pure data module (`lib/tree.cjs`) handling all tree operations on in-memory JS objects, and (2) a thin storage module (`lib/storage.cjs`) handling load/save/backup/atomic-write. The CLI router dispatches to the data module through the storage module. This separation makes tree logic testable without file I/O.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **CLI command surface**: Flat subcommands: `add`, `edit`, `delete`, `move`, `get`, `children`, `list`, `path`. ID is always the first positional argument. Flags for everything else (`--title`, `--notes`, `--parent`, `--position`, `--ordering`). `list` returns root items (no arg) or children of a parent (`list <parentId>`).
- **Output contract**: Every response: `{success: true, data: {...}}` or `{success: false, error: "message"}`. Mutations return the full item after mutation. Errors written as JSON to stdout (not stderr), exit code 1 still set for scripting.
- **Move & ordering behavior**: Position auto-calculated for alpha-sorted parents. Position only matters for `custom` ordering. Move to root is valid. Sibling positions recompacted on move (no gaps). Default insertion for custom-ordered: end of list (highest position + 1). `--position N` flag to override.
- **Init & empty state**: First command auto-creates `.planning/burrow/` directory and `items.json`. Initial `items.json`: `{version: 1, ordering: "custom", items: []}`. Root level defaults to `custom` ordering. Every new item's `children.ordering` defaults to `custom`. Ordering changed via `edit <id> --ordering alpha-asc`.

### Claude's Discretion
- Read operation depth behavior (how `get`, `children`, `list` handle nested children -- depth flags, default depth)
- Internal module structure (single file vs lib/ modules)
- Error message wording and error categories
- Backup file rotation (just `.bak` or numbered backups)
- ID generation method (must be 8-char hex per requirements)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | Items are nestable -- each item can contain child items to arbitrary depth | Recursive tree schema from PROJECT.md. `children.items` array pattern. Tree traversal algorithms (findById, getPath, countDescendants). |
| DATA-02 | Items stored in single `items.json` file as a recursive JSON tree | Storage module pattern: loadItems/saveItems. STORAGE.md validates single-JSON as optimal. |
| DATA-03 | User can add an item at any point in the tree (root or as child of any item) | `add` command: find parent by ID (or root), push to items array, assign position based on ordering mode. |
| DATA-04 | User can edit item title and notes | `edit` command: findById, update fields, save. Also handles `--ordering` for changing children's sort mode. |
| DATA-05 | User can delete an item (and its descendants) | `delete` command: findById, remove from parent's items array, recompact sibling positions. Subtree removed automatically (it is nested). |
| DATA-06 | User can move an item (and its subtree) to a different parent -- position determined by target's ordering mode | `move` command: remove from source parent (recompact), insert into target (position by ordering mode). Must prevent moving item into its own descendant (cycle check). |
| DATA-07 | Items get 8-char hex IDs and auto-set creation timestamps | `crypto.randomUUID().replace(/-/g, '').slice(0, 8)` for ID. `new Date().toISOString()` for timestamp. Collision check against existing IDs. |
| DATA-08 | Each item has a `position` field; each parent has `children.ordering` (custom, alpha-asc, alpha-desc) | Position assignment logic: custom = explicit position, alpha-* = ignore position field and sort by title. Recompaction on mutations. |
| DATA-09 | All writes are atomic (write-to-tmp + rename) to prevent corruption | `fs.writeFileSync(path + '.tmp', data)` then `fs.renameSync(path + '.tmp', path)`. POSIX rename is atomic on same filesystem. |
| DATA-10 | `items.json.bak` written before each mutation as safety net | `fs.copyFileSync(path, path + '.bak')` before each save operation. Single `.bak` file (overwritten each time). |
| CLI-01 | CLI helper (`burrow-tools.cjs`) returns structured JSON for all operations | Router pattern from gsd-tools.cjs. `util.parseArgs()` for argument parsing. `{success, data}` / `{success: false, error}` contract on stdout. |
| CLI-02 | CLI supports tree traversal operations (get item by ID, get children, get path to item) | `get`, `children`, `list`, `path` subcommands. Recursive tree search for findById. Path = ancestry chain from root to target. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-in `fs` | 22.x | File I/O (readFileSync, writeFileSync, renameSync, copyFileSync, mkdirSync, existsSync) | Zero deps constraint. Synchronous APIs correct for CLI that runs-and-exits. |
| Node.js built-in `path` | 22.x | Path construction (join, resolve, dirname) | Cross-platform path handling. Never string-concatenate paths. |
| Node.js built-in `crypto` | 22.x | ID generation via `crypto.randomUUID()` | Stable since Node.js 19. Generates RFC 4122 v4 UUIDs. |
| Node.js built-in `util` | 22.x | `util.parseArgs()` for CLI argument parsing | Stable since Node.js 20. Replaces minimist/yargs. |
| JSON.parse / JSON.stringify | Built-in | Data serialization | Native, fast, zero edge cases for this schema. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `process.stdout.write` | Built-in | Structured output | All CLI output -- avoids console.log trailing newline quirks |
| `process.exit` | Built-in | Exit codes | Exit 0 on success, exit 1 on error (even though errors go to stdout as JSON) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `crypto.randomUUID()` slice | Custom hex generation | UUID slice is simpler and sufficient. 4B combinations at 8 hex chars. |
| `util.parseArgs()` | Manual `process.argv` parsing | parseArgs handles flag types, boolean/string, positionals cleanly. |
| Sync fs | Async fs/promises | Async adds complexity for zero benefit in a run-and-exit CLI. |

**Installation:**
```bash
# No installation needed -- zero npm dependencies
# Node.js 22.x required (already present for Claude Code)
```

## Architecture Patterns

### Recommended Project Structure
```
.claude/burrow/
  burrow-tools.cjs              # CLI entry point + router (thin)
  lib/
    core.cjs                     # Output helpers: output(), errorOut(), ensureDataDir()
    storage.cjs                  # loadItems(), saveItems() with atomic write + backup
    tree.cjs                     # Pure tree operations: findById, add, edit, delete, move, getPath, getChildren

.planning/burrow/
  items.json                     # The entire recursive tree (auto-created on first use)
  items.json.bak                 # Previous state before last mutation (auto-created)
```

### Pattern 1: Thin Router + Module Dispatch
**What:** `burrow-tools.cjs` only parses args and dispatches to module functions. Zero business logic in the router.
**When to use:** Always -- this is the only CLI entry pattern.
**Example:**
```javascript
// burrow-tools.cjs
const { parseArgs } = require('node:util');
const { output, errorOut, ensureDataDir } = require('./lib/core.cjs');
const storage = require('./lib/storage.cjs');
const tree = require('./lib/tree.cjs');

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  if (!command) errorOut('Usage: burrow-tools.cjs <command> [args]');

  // Parse remaining args after command
  const subArgs = args.slice(1);

  const cwd = process.cwd();
  ensureDataDir(cwd);  // Auto-create .planning/burrow/ and items.json

  switch (command) {
    case 'add': {
      const { values, positionals } = parseArgs({
        args: subArgs,
        options: {
          title: { type: 'string' },
          parent: { type: 'string' },
          notes: { type: 'string', default: '' },
          position: { type: 'string' },
        },
        allowPositionals: true,
      });
      const data = storage.load(cwd);
      const result = tree.addItem(data, {
        title: values.title,
        parentId: values.parent || null,
        notes: values.notes,
        position: values.position != null ? parseInt(values.position, 10) : undefined,
      });
      storage.save(cwd, data);
      output({ success: true, data: result });
      break;
    }
    // ... other commands
  }
}
```

### Pattern 2: Pure Tree Operations on In-Memory Data
**What:** `tree.cjs` operates on the parsed JSON object. It never touches the filesystem. It receives the data object, mutates or queries it, and returns results. Storage is handled separately.
**When to use:** For ALL tree logic (find, add, edit, delete, move, path, children).
**Why:** Testable without file I/O. Clear separation of concerns. The tree module is a pure data manipulation library.

```javascript
// lib/tree.cjs -- all functions operate on the data object
function findById(data, id) {
  // Recursive search through items and all children.items
  function search(items) {
    for (const item of items) {
      if (item.id === id) return item;
      const found = search(item.children.items);
      if (found) return found;
    }
    return null;
  }
  return search(data.items);
}
```

### Pattern 3: Atomic Write with Backup
**What:** Every save operation: (1) copy current file to `.bak`, (2) write to `.tmp`, (3) rename `.tmp` to target. Never write directly to `items.json`.
**When to use:** Every mutation (add, edit, delete, move).

```javascript
// lib/storage.cjs
const fs = require('node:fs');
const path = require('node:path');

function load(cwd) {
  const filePath = path.join(cwd, '.planning', 'burrow', 'items.json');
  if (!fs.existsSync(filePath)) {
    return { version: 1, ordering: 'custom', items: [] };
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function save(cwd, data) {
  const filePath = path.join(cwd, '.planning', 'burrow', 'items.json');
  const bakPath = filePath + '.bak';
  const tmpPath = filePath + '.tmp';

  // Backup current state (if file exists)
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, bakPath);
  }

  // Atomic write: tmp + rename
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  fs.renameSync(tmpPath, filePath);
}
```

### Pattern 4: Position Management
**What:** Position assignment depends on the parent's (or root's) ordering mode. For `custom`: explicit position or append to end. For `alpha-*`: position field is ignored, items sorted by title at read time.
**When to use:** Every add and move operation.

```javascript
function assignPosition(parentContainer, item, requestedPosition) {
  const { ordering, items } = parentContainer;
  if (ordering === 'custom') {
    if (requestedPosition !== undefined) {
      item.position = requestedPosition;
      // Shift siblings at or after this position
    } else {
      // Append to end
      item.position = items.length > 0
        ? Math.max(...items.map(i => i.position)) + 1
        : 0;
    }
  }
  // For alpha-asc/alpha-desc: position is irrelevant, set to 0
  // Items are sorted by title when retrieved
}

function getOrderedChildren(parentContainer) {
  const { ordering, items } = parentContainer;
  switch (ordering) {
    case 'alpha-asc':
      return [...items].sort((a, b) => a.title.localeCompare(b.title));
    case 'alpha-desc':
      return [...items].sort((a, b) => b.title.localeCompare(a.title));
    case 'custom':
    default:
      return [...items].sort((a, b) => a.position - b.position);
  }
}
```

### Anti-Patterns to Avoid
- **Moving an item into its own descendant:** Must check that the target parent is not a descendant of the item being moved. This creates a cycle that detaches the subtree from the root.
- **Mutating arrays during iteration:** When deleting or moving items, build a new array or use splice with correct index tracking. Do not `filter` in place on the array you are iterating.
- **Forgetting to recompact positions:** After a delete or move-out, the remaining siblings must have positions recompacted to [0, 1, 2, ...] with no gaps.
- **Storing rendered order in the file:** The `position` field stores the custom sort key. Alpha ordering is computed at read time. Never rewrite positions when ordering mode is `alpha-*`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Argument parsing | Custom argv parser | `util.parseArgs()` | Handles flag types, boolean/string distinction, positionals, edge cases |
| UUID generation | Custom random hex | `crypto.randomUUID().replace(/-/g, '').slice(0, 8)` | Cryptographically random, proven, one line |
| Path construction | String concatenation (`dir + '/' + file`) | `path.join(dir, file)` | Cross-platform separator handling |
| Deep clone for safe mutation | Manual recursive clone | `JSON.parse(JSON.stringify(obj))` or structured mutation | Prevents accidental aliasing bugs |

**Key insight:** With zero npm dependencies, every utility must come from Node.js built-ins. Fortunately, Node.js 22 provides everything needed: `util.parseArgs()`, `crypto.randomUUID()`, `fs.copyFileSync`, `fs.mkdirSync({ recursive: true })`.

## Common Pitfalls

### Pitfall 1: Cycle Creation on Move
**What goes wrong:** Moving item A to be a child of item B, when B is already a descendant of A. This detaches A's entire subtree from the tree, creating an unreachable island.
**Why it happens:** The move operation finds the target parent by ID and inserts -- without checking whether the target is a descendant of the source.
**How to avoid:** Before moving, walk from the target parent up to root (using getPath). If the source item appears in the ancestry, reject the move with a clear error.
**Warning signs:** Items "disappear" from the tree after a move. `list` at root shows fewer items than expected.

### Pitfall 2: Position Gaps After Mutation
**What goes wrong:** After deleting item at position 1 from [0, 1, 2], positions become [0, 2]. Future insertions at "end" calculate position 3, leaving a permanent gap. Over time, positions drift to arbitrary numbers.
**Why it happens:** Delete removes the item but does not recompact sibling positions.
**How to avoid:** After every delete or move-out, recompact: sort remaining siblings by position, then reassign positions as [0, 1, 2, ...].
**Warning signs:** Position values in items.json are non-sequential or have large gaps.

### Pitfall 3: Root-Level vs Item-Level Container Confusion
**What goes wrong:** The root of items.json has `{version, ordering, items: [...]}`. Each item has `{..., children: {ordering, items: [...]}}`. Code that handles "add to parent" must work with both shapes -- the root container and an item's children container.
**Why it happens:** Two similar but different shapes for the same "container of items" concept.
**How to avoid:** Normalize access. Write a `getContainer(data, parentId)` function that returns `data` (the root object) when parentId is null, and `item.children` when parentId points to an item. Both have `.ordering` and `.items`.
**Warning signs:** Add-to-root works but add-to-parent fails, or vice versa. Move-to-root is a special case everywhere.

### Pitfall 4: Forgetting Auto-Init
**What goes wrong:** User runs `burrow-tools.cjs get abc123` as their first ever command. The `.planning/burrow/` directory does not exist. The tool crashes with ENOENT.
**Why it happens:** Developer tests in a directory that already has the data file.
**How to avoid:** Every command entry point calls `ensureDataDir(cwd)` which creates `.planning/burrow/` and an empty `items.json` if they do not exist. `load()` returns the default empty structure when the file is missing.
**Warning signs:** Commands fail on a fresh clone or new project.

### Pitfall 5: Alpha Ordering Position Writes
**What goes wrong:** An item is added to an `alpha-asc` parent. The code assigns `position: 3` based on insertion order. Later, the parent is switched to `custom` ordering. Now positions are [0, 3, 1, 2] instead of reflecting the alpha order.
**Why it happens:** Position was set based on insertion order rather than being meaningless for alpha-sorted parents.
**How to avoid:** When adding to an alpha-sorted parent, set position to 0 (or any consistent value). When switching from alpha to custom ordering, recompact positions to match the current alpha sort order.
**Warning signs:** Switching ordering mode produces unexpected item order.

### Pitfall 6: Error Output Contract Violation
**What goes wrong:** Some error paths write to stderr or output a non-JSON string. The agent receives unparseable output and hallucinates the result.
**Why it happens:** Using `console.error()` or `process.stderr.write()` for error reporting, or throwing an unhandled exception that prints a stack trace.
**How to avoid:** Wrap the entire main() in try/catch. In the catch, output `{success: false, error: message}` to stdout and exit with code 1. Never use console.error or stderr for user-facing errors.
**Warning signs:** Agent produces incorrect results after a failed operation. Stderr output appears in Claude Code terminal.

## Code Examples

### Item Schema (from PROJECT.md -- canonical)
```javascript
// Source: .planning/PROJECT.md data model
const itemSchema = {
  id: "a1b2c3d4",           // 8-char hex, auto-generated
  title: "Login redirect broken",
  position: 0,              // Sort key for custom ordering
  created: "2026-03-06T14:35:00Z",  // ISO 8601, auto-set
  archived: false,           // Always false in Phase 1 (archive is Phase 2)
  notes: "OAuth callback sends to /dashboard instead of original page",
  children: {
    ordering: "custom",      // "custom" | "alpha-asc" | "alpha-desc"
    items: []                // Recursive: each child has the same shape
  }
};
```

### Root Document Schema
```javascript
// Source: CONTEXT.md init & empty state decision
const rootSchema = {
  version: 1,
  ordering: "custom",       // Root-level ordering mode
  items: []                  // Top-level items (the "surface" of the burrow)
};
```

### Recursive Find by ID
```javascript
function findById(data, id) {
  function search(items) {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children && item.children.items.length > 0) {
        const found = search(item.children.items);
        if (found) return found;
      }
    }
    return null;
  }
  return search(data.items);
}
```

### Get Ancestry Path (root to item)
```javascript
function getPath(data, id) {
  function search(items, ancestors) {
    for (const item of items) {
      if (item.id === id) return [...ancestors, item];
      if (item.children && item.children.items.length > 0) {
        const found = search(item.children.items, [...ancestors, item]);
        if (found) return found;
      }
    }
    return null;
  }
  return search(data.items, []);
}
```

### Find Parent of Item
```javascript
// Returns { parent: item|null, container: {ordering, items} }
// parent is null for root-level items; container is the object holding the items array
function findParent(data, id) {
  function search(items, parent, container) {
    for (const item of items) {
      if (item.id === id) return { parent, container };
      if (item.children && item.children.items.length > 0) {
        const found = search(item.children.items, item, item.children);
        if (found) return found;
      }
    }
    return null;
  }
  return search(data.items, null, data);
}
```

### Recompact Positions
```javascript
function recompact(container) {
  // Sort by current position first, then reassign sequential positions
  container.items
    .sort((a, b) => a.position - b.position)
    .forEach((item, idx) => { item.position = idx; });
}
```

### Move with Cycle Check
```javascript
function moveItem(data, itemId, newParentId, requestedPosition) {
  const item = findById(data, itemId);
  if (!item) return { success: false, error: 'Item not found' };

  // Cycle check: ensure newParentId is not a descendant of itemId
  if (newParentId) {
    const path = getPath(data, newParentId);
    if (path && path.some(ancestor => ancestor.id === itemId)) {
      return { success: false, error: 'Cannot move item into its own descendant' };
    }
  }

  // Remove from current location
  const source = findParent(data, itemId);
  source.container.items = source.container.items.filter(i => i.id !== itemId);
  recompact(source.container);

  // Insert into new location
  const targetContainer = newParentId
    ? findById(data, newParentId).children
    : data;  // null parent = move to root

  assignPosition(targetContainer, item, requestedPosition);
  targetContainer.items.push(item);

  return { success: true, data: item };
}
```

### CLI Output Contract
```javascript
// lib/core.cjs
function output(result) {
  process.stdout.write(JSON.stringify(result));
  process.exit(0);
}

function errorOut(message) {
  process.stdout.write(JSON.stringify({ success: false, error: message }));
  process.exit(1);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Bucket + tags flat model | Recursive tree (items containing items) | 2026-03-07 (project pivot) | Entire data model changed. No buckets, no tags, no flat lists. One recursive type. |
| One markdown file per item with YAML frontmatter | Single `items.json` with recursive JSON tree | 2026-03-07 (storage research) | Eliminates YAML parsing, directory management, file enumeration. All operations are one file read. |
| `{ok: true, ...}` output shape | `{success: true, data: {...}}` output shape | 2026-03-07 (CONTEXT.md) | Matches the locked output contract from user decisions. |

**Deprecated/outdated from prior research:**
- ARCHITECTURE.md bucket-based module structure (buckets.cjs, etc.) -- replaced by tree model
- STACK.md YAML frontmatter parser recommendations -- eliminated by JSON storage
- PITFALLS.md YAML fragility warnings -- no longer applicable (no YAML)
- STORAGE.md approaches 1, 2, 4, 5 -- rejected in favor of single JSON

## Discretion Recommendations

Research-informed recommendations for areas marked as Claude's Discretion:

### Read Operation Depth Behavior
**Recommendation:** `get <id>` returns the full item including all nested children (full depth). `children <id>` returns immediate children only (depth 1). `list [parentId]` returns immediate children only (depth 1). No depth flags in Phase 1 -- depth-configurable rendering is Phase 2 (RNDR-01). Keep it simple: full item on `get`, shallow list on `children`/`list`.
**Rationale:** The agent can always call `get` for deep inspection or `children` for shallow listing. Adding depth flags now adds complexity before Phase 2's rendering needs clarify the API.

### Internal Module Structure
**Recommendation:** Three lib modules: `core.cjs` (output helpers, ensureDataDir), `storage.cjs` (load, save with atomic write + backup), `tree.cjs` (all tree operations -- find, add, edit, delete, move, path, children, list). Plus the router `burrow-tools.cjs`.
**Rationale:** `tree.cjs` as a single module is appropriate because all operations share the same recursive traversal helpers. Splitting into items.cjs/move.cjs/traverse.cjs would create cross-dependencies. GSD splits by domain (state, phase, roadmap) because those domains are independent. Tree operations are inherently coupled.

### Error Message Wording and Categories
**Recommendation:** Three error categories: `NOT_FOUND` (item ID does not exist), `INVALID_OPERATION` (cycle in move, missing required field), `STORAGE_ERROR` (file I/O failure). Include the category in the error response: `{success: false, error: "Item not found", code: "NOT_FOUND"}`.
**Rationale:** The agent can branch on error codes without parsing message text. Three categories are enough for Phase 1.

### Backup File Rotation
**Recommendation:** Single `.bak` file, overwritten each time. No numbered backups.
**Rationale:** Git history provides full version tracking. The `.bak` is a safety net for the common case: "I just did something wrong, undo it." Numbered backups add complexity (cleanup, disk usage) for minimal benefit.

### ID Generation Method
**Recommendation:** `crypto.randomUUID().replace(/-/g, '').slice(0, 8)`. Verify uniqueness against existing IDs in the tree before assigning (regenerate on collision).
**Rationale:** Cryptographically random, proven API, one line. 8 hex chars = 4.3 billion combinations. Collision check is O(n) where n is total items in tree -- negligible cost.

## Open Questions

1. **What happens when `edit --ordering` changes a parent from `custom` to `alpha-*`?**
   - What we know: The CONTEXT.md says ordering is changed via `edit <id> --ordering alpha-asc`. Positions become irrelevant for alpha ordering.
   - What's unclear: Should existing children's positions be preserved (in case user switches back to custom) or reset?
   - Recommendation: Preserve positions as-is. When switching back to custom, the old positions provide a reasonable starting order. Recompact only if positions have gaps.

2. **Should `delete` return the deleted item's data or just its ID?**
   - What we know: CONTEXT.md says "delete returns deleted item's ID."
   - Recommendation: Return `{success: true, data: {id: "...", title: "...", descendantCount: N}}` -- enough for the agent to confirm what was deleted, but not the full subtree.

3. **How should `list` handle an ID argument vs no argument?**
   - What we know: CONTEXT.md says "`list` returns root items (no arg) or children of a parent (`list <parentId>`)."
   - Recommendation: `list` with no args returns root-level items. `list <id>` returns children of that item. Both return ordered arrays respecting the container's ordering mode. This overlaps with `children <id>` -- differentiate by having `list` include ordering metadata while `children` is a simpler array.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:test` + `node:assert` (v22 stable) |
| Config file | none -- see Wave 0 |
| Quick run command | `node --test .claude/burrow/test/*.test.cjs` |
| Full suite command | `node --test .claude/burrow/test/*.test.cjs` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | Nested items at arbitrary depth | unit | `node --test .claude/burrow/test/tree.test.cjs` | Wave 0 |
| DATA-02 | Single items.json recursive structure | unit | `node --test .claude/burrow/test/storage.test.cjs` | Wave 0 |
| DATA-03 | Add at root or as child | unit | `node --test .claude/burrow/test/tree.test.cjs` | Wave 0 |
| DATA-04 | Edit title and notes | unit | `node --test .claude/burrow/test/tree.test.cjs` | Wave 0 |
| DATA-05 | Delete item and descendants | unit | `node --test .claude/burrow/test/tree.test.cjs` | Wave 0 |
| DATA-06 | Move subtree, position by ordering | unit | `node --test .claude/burrow/test/tree.test.cjs` | Wave 0 |
| DATA-07 | 8-char hex ID, creation timestamp | unit | `node --test .claude/burrow/test/tree.test.cjs` | Wave 0 |
| DATA-08 | Position field, children.ordering | unit | `node --test .claude/burrow/test/tree.test.cjs` | Wave 0 |
| DATA-09 | Atomic writes (tmp + rename) | integration | `node --test .claude/burrow/test/storage.test.cjs` | Wave 0 |
| DATA-10 | .bak file before mutation | integration | `node --test .claude/burrow/test/storage.test.cjs` | Wave 0 |
| CLI-01 | Structured JSON output | integration | `node --test .claude/burrow/test/cli.test.cjs` | Wave 0 |
| CLI-02 | get, children, path traversal | integration | `node --test .claude/burrow/test/cli.test.cjs` | Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test .claude/burrow/test/*.test.cjs`
- **Per wave merge:** `node --test .claude/burrow/test/*.test.cjs`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `.claude/burrow/test/tree.test.cjs` -- covers DATA-01 through DATA-08 (pure tree operations)
- [ ] `.claude/burrow/test/storage.test.cjs` -- covers DATA-02, DATA-09, DATA-10 (file I/O, atomic writes, backup)
- [ ] `.claude/burrow/test/cli.test.cjs` -- covers CLI-01, CLI-02 (end-to-end subcommand tests via child_process)
- [ ] Node.js `node:test` is built-in -- no framework install needed

## Sources

### Primary (HIGH confidence)
- `.planning/PROJECT.md` -- canonical data model schema, constraints, key decisions
- `.planning/phases/01-core-engine/01-CONTEXT.md` -- locked CLI surface, output contract, move/ordering behavior, init semantics
- `.planning/research/STORAGE.md` -- validated single-JSON as optimal storage approach
- `.planning/research/STACK.md` -- confirmed Node.js 22 built-in APIs for all needs
- `.planning/REQUIREMENTS.md` -- requirement definitions and phase mapping
- `.claude/get-shit-done/bin/gsd-tools.cjs` -- reference CLI router pattern (directly inspected)
- `.claude/get-shit-done/bin/lib/core.cjs` -- reference output/error helpers (directly inspected)
- Node.js 22 `util.parseArgs()` -- verified working on v22.14.0
- Node.js 22 `crypto.randomUUID()` -- verified working on v22.14.0 (produces valid hex)

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` -- general architecture patterns (partially outdated due to model pivot, but router pattern and module structure still valid)
- `.planning/research/PITFALLS.md` -- pitfall catalog (YAML-specific pitfalls no longer apply, but file I/O and output contract pitfalls remain relevant)

### Tertiary (LOW confidence)
- None -- all findings verified against project artifacts and Node.js runtime

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero dependencies, Node.js 22 built-ins verified on this machine
- Architecture: HIGH -- recursive tree operations are well-understood algorithms, module structure follows established GSD patterns
- Pitfalls: HIGH -- cycle detection, position management, and container shape confusion are standard tree operation pitfalls documented in the project's own research
- Validation: HIGH -- Node.js `node:test` is built-in and stable on v22

**Research date:** 2026-03-07
**Valid until:** Indefinite (Node.js built-in APIs are stable; recursive tree algorithms do not change)
