# Phase 2: Schema, Views, and Archive - Research

**Researched:** 2026-03-08
**Domain:** Tree data schema migration, recursive rendering, archive system (Node.js, zero deps)
**Confidence:** HIGH

## Summary

Phase 2 transforms the existing Phase 1 tree engine in three areas: (1) schema simplification by dropping `position`, `ordering`, and renaming `notes` to `body`; (2) a universal `get` command that produces a flat render array with depth control and breadcrumbs; (3) cascade archive/unarchive operations. All changes are internal to the existing codebase (`.claude/burrow/`) using only Node.js built-in APIs (zero external dependencies).

A critical discovery during research: the on-disk data file (`cards.json`) still uses the pre-refactor `items` key at both the root level and within children containers (`children.items`), while the code was refactored to expect `cards`. Phase 2 must reconcile this -- either by migrating the data format or by adding a compatibility layer in `warren.cjs` load/save. Since Phase 2 is already changing the schema (dropping `position`, `ordering`, renaming `notes` to `body`), it makes sense to do a one-time data migration as part of the schema work.

**Primary recommendation:** Execute schema migration first (drop fields, rename, fix items->cards key mismatch), then build rendering and archive on the clean schema. All three areas share the same code files so they should be sequenced carefully to avoid merge conflicts with themselves.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Drop `position` field** from cards -- array index IS the display order
- **Drop `ordering` field** from containers -- agent sorts on demand via move operations
- **Rename `notes` to `body`** -- generic free-form content field
- Card schema becomes: `{id, title, created, archived, body, children[]}`
- `children` container simplifies from `{ordering, cards: []}` to plain `[]` array
- **`get`** is the universal view command -- `get [id] [--depth N]`
- Flat render array output per card: `{id, title, depth, descendantCount, hasBody, bodyPreview, created, archived}`
- Archived cards excluded by default from render views
- `--include-archived` and `--archived-only` flags
- Depth model: no flag = card + direct children; `--depth N` = N levels; `--depth 0` = full tree
- Items at depth cutoff show `(N)` active descendant count
- Focused subtree includes ancestry breadcrumbs
- **Cascade archive** -- archiving a parent archives all descendants
- **Cascade unarchive** -- symmetrical, restores whole subtree
- Active-only descendant counts (archived excluded)
- Archived cards viewed in original tree position when requested
- Aliases: `list` = `get`, `dump` = `get --depth 0`, `children` = `get <id>`, `path` = breadcrumbs
- Stateless CLI -- no persistent working directory
- No search CLI command
- No artificial size limits -- warn but don't block

### Claude's Discretion
- Breadcrumb presentation format
- Render array field naming and exact shape
- Warning thresholds for large trees
- How aliases map internally (thin wrappers vs switch cases)
- Error messages and edge case handling

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCHEMA-01 | Drop `position` field -- array index IS display order | Remove `position` from card creation, remove `recompact()`, simplify `moveCard()` splice logic |
| SCHEMA-02 | Drop `ordering` field from containers -- agent sorts via move | Remove `ordering` from containers, simplify `children` from `{ordering, cards:[]}` to plain `[]`, remove `getOrderedChildren()` sorting logic |
| SCHEMA-03 | Rename `notes` to `body` -- generic free-form content | Field rename in card creation, edit, and CLI flag parsing; update test fixtures |
| SCHEMA-04 | Simplified card schema: `{id, title, created, archived, body, children[]}` | Combination of SCHEMA-01/02/03; also fix items->cards key mismatch in data file |
| RNDR-01 | `get` is universal view command -- `get [id] [--depth N]` | New `renderTree()` function in mongoose.cjs; enhanced `get` case in CLI router |
| RNDR-02 | Flat render array output with depth, descendantCount, hasBody, bodyPreview | New rendering function that walks tree to depth limit, producing flat array |
| RNDR-03 | Depth model -- no flag = card+children; `--depth N`; `--depth 0` = full tree | Depth parameter logic in renderTree; 0 = Infinity sentinel |
| RNDR-04 | Breadcrumbs on focused subtree -- ancestry path for non-root cards | Use existing `getPath()` to build breadcrumb array; include in get response |
| RNDR-05 | Archived excluded by default; `--include-archived` / `--archived-only` flags | Filter predicate in render walk; CLI flag parsing |
| ARCH-01 | `archive <id>` and `unarchive <id>` -- both cascade to descendants | New `archiveCard()` / `unarchiveCard()` in mongoose.cjs; recursive walk setting `archived` flag |
| ARCH-02 | Active-only descendant counts -- archived not counted | Modify `countDescendants()` or create `countActiveDescendants()` with archive filter |
| ARCH-03 | Archived cards keep original tree position when viewed | No structural change needed -- cards stay in their `children` array, just filtered by default |
| CLI-03 | `get` replaces list/dump/children -- aliases for backward compat | Route `list`, `dump`, `children` to `get` handler with appropriate default args |
| CLI-04 | Stateless CLI -- no persistent working directory | Already true (Phase 1 design); confirm no state leaks in new commands |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-ins | 18+ | Runtime, `node:test`, `node:assert`, `node:util` (parseArgs) | Zero-dependency project constraint |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:test` | built-in | Test runner with describe/it/beforeEach | All unit and integration tests |
| `node:assert/strict` | built-in | Assertions | All test assertions |
| `node:util` parseArgs | built-in | CLI argument parsing | CLI router flag handling |

### Alternatives Considered
None -- project mandate is zero npm dependencies.

## Architecture Patterns

### Current Project Structure (unchanged)
```
.claude/burrow/
├── burrow-tools.cjs     # CLI router (entry point)
├── lib/
│   ├── core.cjs          # output(), errorOut(), generateId(), collectAllIds()
│   ├── warren.cjs         # load(), save() -- atomic file I/O
│   └── mongoose.cjs       # Tree operations (findById, addCard, etc.)
└── test/
    ├── cli.test.cjs       # Integration tests (spawns CLI process)
    ├── mongoose.test.cjs  # Unit tests for tree engine
    └── warren.test.cjs    # Unit tests for storage
```

### Pattern 1: Schema Migration in warren.cjs
**What:** Add a migration step to `load()` that normalizes old data format to new schema on read, and `save()` always writes new format.
**When to use:** When loading existing `cards.json` files that have old schema (position, ordering, notes, items key).
**Rationale:** This is a small, self-contained project with a single data file. A load-time migration is the simplest correct approach -- no separate migration script needed.

```javascript
// In warren.cjs load():
function migrateV1toV2(data) {
  // Fix root-level: items -> cards
  if (data.items && !data.cards) {
    data.cards = data.items;
    delete data.items;
  }
  // Remove root ordering
  delete data.ordering;
  // Recursively fix each card
  function migrateCard(card) {
    // notes -> body
    if ('notes' in card && !('body' in card)) {
      card.body = card.notes;
      delete card.notes;
    }
    // Drop position
    delete card.position;
    // Flatten children container: {ordering, cards:[]} -> []
    if (card.children && typeof card.children === 'object' && !Array.isArray(card.children)) {
      const childCards = card.children.cards || card.children.items || [];
      card.children = childCards;
    }
    // Recurse
    if (Array.isArray(card.children)) {
      card.children.forEach(migrateCard);
    }
  }
  if (Array.isArray(data.cards)) {
    data.cards.forEach(migrateCard);
  }
  data.version = 2;
  return data;
}
```

### Pattern 2: Flat Render Array via Recursive Walk
**What:** A `renderTree()` function that walks the tree to a depth limit, producing a flat array of render entries.
**When to use:** For all `get` command variations.

```javascript
function renderTree(data, rootId, { depth = 1, archiveFilter = 'active' } = {}) {
  const maxDepth = depth === 0 ? Infinity : depth;
  const result = { cards: [], breadcrumbs: null };

  // If rootId specified, set breadcrumbs
  if (rootId) {
    const path = getPath(data, rootId);
    if (!path) return null;
    // Breadcrumbs = ancestors only (not the target itself)
    result.breadcrumbs = path.slice(0, -1).map(c => ({ id: c.id, title: c.title }));
  }

  const startCards = rootId ? findById(data, rootId) : null;
  // ... walk tree, apply archive filter, build flat array with depth field
}
```

### Pattern 3: Archive Cascade via Recursive Walk
**What:** Setting `archived` flag recursively on all descendants.
**When to use:** For `archive` and `unarchive` commands.

```javascript
function archiveCard(data, id) {
  const card = findById(data, id);
  if (!card) return null;
  function setArchived(c, value) {
    c.archived = value;
    if (Array.isArray(c.children)) {
      c.children.forEach(child => setArchived(child, value));
    }
  }
  setArchived(card, true);
  return card;
}
```

### Pattern 4: CLI Alias Routing
**What:** Map alias commands to the universal `get` handler with preset arguments.
**When to use:** For `list`, `dump`, `children`, `path` commands.

```javascript
// In burrow-tools.cjs switch:
case 'list':    // Fall through to get with no id
case 'dump':    // Fall through to get with --depth 0
case 'children': // Fall through to get with id
case 'get': {
  // Normalize args based on which alias was used
  // list -> get (no args)
  // dump -> get --depth 0
  // children <id> -> get <id>
  // All route to same renderTree() call
}
```

### Anti-Patterns to Avoid
- **Separate code paths for aliases:** list, dump, children, get must NOT have independent implementations. One `renderTree()` function, multiple entry points.
- **In-place data mutation during render:** The render walk should be read-only. Never modify the tree while building a view.
- **Forgetting archive state on newly created cards:** New cards must default `archived: false`.
- **Migration on every save:** Migration should happen on load only. Save always writes the current (v2) format.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CLI arg parsing | Custom arg parser | `node:util` parseArgs | Already used in Phase 1, handles flags correctly |
| Test framework | Custom test harness | `node:test` | Already used in Phase 1, built into Node.js |
| Data migration | Separate migration script | Load-time migration in warren.cjs | Single data file, single consumer -- KISS |

**Key insight:** This is a zero-dependency project. Everything must use Node.js built-ins. The existing patterns from Phase 1 (parseArgs, node:test, atomic write) are all correct and should be reused.

## Common Pitfalls

### Pitfall 1: Data File Key Mismatch (items vs cards)
**What goes wrong:** The refactor commit (`a0a9ca0`) renamed items->cards in code but the actual `cards.json` on disk still uses `items` as the key. Code calls `data.cards` which is `undefined` when loading the real file.
**Why it happens:** The rename refactor changed code references but did not transform the stored data.
**How to avoid:** Migration in `load()` must handle `items` -> `cards` at root level AND within `children` containers (which currently have `children.items` not `children.cards`).
**Warning signs:** All tests pass (they use in-memory fixtures with `cards` key) but real data fails silently.

### Pitfall 2: Children Container Shape Change
**What goes wrong:** Phase 1 children are `{ordering: 'custom', cards: []}` objects. Phase 2 simplifies to plain `[]` arrays. Every function that accesses `card.children.cards` must change to `card.children` (since children IS the array now).
**Why it happens:** Deep structural change that touches every tree traversal function.
**How to avoid:** Change the container shape first, then update all accessors. Run tests after each change. The test fixtures also need updating.
**Warning signs:** `TypeError: Cannot read properties of undefined (reading 'cards')` at runtime.

### Pitfall 3: Depth 0 Means Infinity, Not Zero
**What goes wrong:** `--depth 0` means "no cutoff / full tree" per the user's design. A naive implementation might treat 0 as "show nothing" or "show only the root".
**Why it happens:** Counter-intuitive sentinel value.
**How to avoid:** Document clearly: `depth === 0` -> `maxDepth = Infinity`. Default (no flag) -> `maxDepth = 1` (card + direct children).

### Pitfall 4: Archive Filter in Descendant Counts
**What goes wrong:** `countDescendants()` currently counts ALL children. Phase 2 requires active-only counts for display, but the existing function is also used internally (e.g., in delete). Creating a single function that sometimes filters and sometimes doesn't leads to bugs.
**Why it happens:** Mixing display concerns with data concerns.
**How to avoid:** Create `countActiveDescendants(card)` as a separate function for render output. Keep the existing `countDescendants()` for data operations (like delete reporting).

### Pitfall 5: Render Array vs Raw Card Output
**What goes wrong:** `get <id>` currently returns the raw card object. Phase 2 changes it to return a flat render array. This changes the API contract for everything downstream.
**Why it happens:** `get` is being repurposed from "fetch raw data" to "render a view."
**How to avoid:** The `get` response should wrap results clearly: `{ success: true, data: { breadcrumbs: [...], cards: [...] } }`. Mutation commands (add, edit, delete, move, archive, unarchive) continue returning raw card data.

### Pitfall 6: parseArgs --depth 0 String Coercion
**What goes wrong:** `parseArgs` returns flag values as strings. `--depth 0` gives `values.depth === "0"` which is truthy. `parseInt("0")` gives `0` which is falsy. Guard clauses like `if (!depth)` will incorrectly treat `--depth 0` as "no depth specified."
**Why it happens:** JavaScript falsy values.
**How to avoid:** Use explicit `depth !== undefined` checks, not truthiness. Parse to integer, then check `=== 0` explicitly to set Infinity.

## Code Examples

### Schema Migration (load-time)
```javascript
// Source: derived from current warren.cjs and mongoose.cjs analysis
function migrate(data) {
  if (data.version >= 2) return data;

  // Root level: items -> cards, drop ordering
  if (data.items) { data.cards = data.items; delete data.items; }
  delete data.ordering;

  function migrateCard(card) {
    // Field renames
    if ('notes' in card) { card.body = card.notes; delete card.notes; }
    delete card.position;

    // Flatten children container
    if (card.children && !Array.isArray(card.children)) {
      const arr = card.children.cards || card.children.items || [];
      card.children = arr;
    }
    if (!card.children) card.children = [];

    card.children.forEach(migrateCard);
  }

  (data.cards || []).forEach(migrateCard);
  data.version = 2;
  return data;
}
```

### Render Tree Function
```javascript
// Source: derived from requirements RNDR-01 through RNDR-05
function renderTree(data, rootId, { depth = 1, archiveFilter = 'active' } = {}) {
  const maxDepth = depth === 0 ? Infinity : depth;
  const response = { breadcrumbs: null, cards: [] };

  // Breadcrumbs for focused view
  if (rootId) {
    const path = getPath(data, rootId);
    if (!path) return null;
    response.breadcrumbs = path.slice(0, -1).map(c => ({ id: c.id, title: c.title }));
  }

  const startCards = rootId ? (findById(data, rootId)?.children || []) : data.cards;
  const startDepth = rootId ? 1 : 0;

  // If rootId, include the root card itself at depth 0
  if (rootId) {
    const root = findById(data, rootId);
    response.cards.push(makeRenderEntry(root, 0, maxDepth));
  }

  function shouldInclude(card) {
    if (archiveFilter === 'active') return !card.archived;
    if (archiveFilter === 'archived-only') return card.archived;
    return true; // include-archived
  }

  function walk(cards, currentDepth) {
    for (const card of cards) {
      if (!shouldInclude(card)) continue;

      const atCutoff = currentDepth >= maxDepth;
      response.cards.push({
        id: card.id,
        title: card.title,
        depth: currentDepth,
        descendantCount: countActiveDescendants(card),
        hasBody: !!(card.body && card.body.trim()),
        bodyPreview: card.body ? card.body.slice(0, 80) : '',
        created: card.created,
        archived: card.archived,
      });

      if (!atCutoff && Array.isArray(card.children)) {
        walk(card.children, currentDepth + 1);
      }
    }
  }

  walk(startCards, rootId ? 1 : 0);
  return response;
}
```

### Archive Cascade
```javascript
// Source: derived from requirements ARCH-01, ARCH-02
function archiveCard(data, id) {
  const card = findById(data, id);
  if (!card) return null;

  function setArchived(c, value) {
    c.archived = value;
    if (Array.isArray(c.children)) {
      c.children.forEach(child => setArchived(child, value));
    }
  }

  setArchived(card, true);
  const count = countDescendants(card);
  return { id: card.id, title: card.title, descendantCount: count };
}

function unarchiveCard(data, id) {
  const card = findById(data, id);
  if (!card) return null;

  function setArchived(c, value) {
    c.archived = value;
    if (Array.isArray(c.children)) {
      c.children.forEach(child => setArchived(child, value));
    }
  }

  setArchived(card, false);
  const count = countDescendants(card);
  return { id: card.id, title: card.title, descendantCount: count };
}
```

### Active Descendant Count
```javascript
function countActiveDescendants(card) {
  let count = 0;
  if (Array.isArray(card.children)) {
    for (const child of card.children) {
      if (!child.archived) {
        count += 1 + countActiveDescendants(child);
      }
    }
  }
  return count;
}
```

## State of the Art

| Old Approach (Phase 1) | New Approach (Phase 2) | Impact |
|------------------------|------------------------|--------|
| `{ordering, cards/items: []}` container objects | Plain `[]` arrays for children | Every tree traversal function changes from `card.children.cards` to `card.children` |
| `position` field + `recompact()` | Array index = order, splice for reorder | Remove ~20 lines of position logic; `moveCard()` uses splice+insert |
| `ordering` field + `getOrderedChildren()` sorting | Agent does sorting via move operations | Remove sorting logic entirely; `listCards()` just returns array as-is |
| `notes` field | `body` field | Simple rename; CLI flag changes from `--notes` to `--body` |
| `get <id>` returns raw card object | `get [id] [--depth N]` returns flat render array | Completely new response shape for read operations |
| No archive commands | `archive`/`unarchive` with cascade | Two new CLI commands + two new mongoose functions |
| Separate list/get/children/path commands | `get` as universal + aliases | Consolidate 4 commands into 1 code path |

**Deprecated/outdated after Phase 2:**
- `recompact()`: removed entirely
- `getOrderedChildren()`: removed entirely
- `position` field: removed from schema
- `ordering` field: removed from schema
- `notes` field: renamed to `body`
- Root-level `ordering` key in data file: removed
- `children.items` / `children.cards` nested object: replaced with plain array

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node:test` (built-in, Node.js 18+) |
| Config file | None needed -- uses built-in test runner |
| Quick run command | `node --test .claude/burrow/test/mongoose.test.cjs` |
| Full suite command | `node --test .claude/burrow/test/*.test.cjs` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCHEMA-01 | Cards have no `position` field after add/move | unit | `node --test .claude/burrow/test/mongoose.test.cjs` | Existing (needs update) |
| SCHEMA-02 | Containers have no `ordering`; children is plain array | unit | `node --test .claude/burrow/test/mongoose.test.cjs` | Existing (needs update) |
| SCHEMA-03 | Field is `body` not `notes`; `--body` CLI flag works | unit+integration | `node --test .claude/burrow/test/mongoose.test.cjs && node --test .claude/burrow/test/cli.test.cjs` | Existing (needs update) |
| SCHEMA-04 | Card matches target schema `{id, title, created, archived, body, children[]}` | unit | `node --test .claude/burrow/test/mongoose.test.cjs` | Existing (needs update) |
| RNDR-01 | `get` returns flat render array for all variations | unit+integration | `node --test .claude/burrow/test/mongoose.test.cjs && node --test .claude/burrow/test/cli.test.cjs` | Needs new tests |
| RNDR-02 | Render entries have correct fields: id, title, depth, descendantCount, hasBody, bodyPreview | unit | `node --test .claude/burrow/test/mongoose.test.cjs` | Needs new tests |
| RNDR-03 | Depth model: default=1, --depth N, --depth 0=full | unit | `node --test .claude/burrow/test/mongoose.test.cjs` | Needs new tests |
| RNDR-04 | Breadcrumbs present for non-root focused views | unit | `node --test .claude/burrow/test/mongoose.test.cjs` | Needs new tests |
| RNDR-05 | Archive filter: default excludes archived; flags work | unit | `node --test .claude/burrow/test/mongoose.test.cjs` | Needs new tests |
| ARCH-01 | archive/unarchive cascade to all descendants | unit+integration | `node --test .claude/burrow/test/mongoose.test.cjs && node --test .claude/burrow/test/cli.test.cjs` | Needs new tests |
| ARCH-02 | Active-only descendant counts | unit | `node --test .claude/burrow/test/mongoose.test.cjs` | Needs new tests |
| ARCH-03 | Archived cards in original position when viewed with flag | unit | `node --test .claude/burrow/test/mongoose.test.cjs` | Needs new tests |
| CLI-03 | Aliases route to get: list, dump, children | integration | `node --test .claude/burrow/test/cli.test.cjs` | Needs new tests |
| CLI-04 | Stateless CLI (no wd persistence) | integration | `node --test .claude/burrow/test/cli.test.cjs` | Already true |

### Sampling Rate
- **Per task commit:** `node --test .claude/burrow/test/mongoose.test.cjs`
- **Per wave merge:** `node --test .claude/burrow/test/*.test.cjs`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Update `mongoose.test.cjs` fixtures: remove `position`, `ordering`, rename `notes` to `body`, change `children` from `{ordering, cards:[]}` to `[]`
- [ ] Update `cli.test.cjs` tests: change `--notes` to `--body`, remove `--ordering` tests, update expected output shapes
- [ ] Add `renderTree()` test cases in `mongoose.test.cjs`
- [ ] Add `archiveCard()` / `unarchiveCard()` test cases in `mongoose.test.cjs`
- [ ] Add alias routing tests in `cli.test.cjs` (list, dump, children -> get)
- [ ] Add migration test in `warren.test.cjs` (v1 data -> v2 migration on load)

## Open Questions

1. **Should migration happen silently or log a warning?**
   - What we know: Migration on `load()` is the right place. The data file is always rewritten on next save.
   - What's unclear: Should the CLI output a notice like "Migrated cards.json from v1 to v2"?
   - Recommendation: Silent migration. The CLI is consumed by an agent that parses JSON -- a migration notice would just add noise. The `version` field bump in the saved file is sufficient.

2. **Render output for `get` with no args (root view)**
   - What we know: `get` with no args should show root cards + direct children. This is like "show the whole root level."
   - What's unclear: Should the root itself have breadcrumbs? (No -- it's the root. Breadcrumbs should be `null` or omitted.)
   - Recommendation: `breadcrumbs: null` for root views. Only populate when `rootId` is specified.

3. **Body preview truncation**
   - What we know: `bodyPreview` is first ~80 chars.
   - What's unclear: Should it add "..." when truncated? Should it strip newlines?
   - Recommendation: Strip newlines (replace with spaces), truncate at 80 chars, append "..." if truncated. This gives the agent a clean single-line preview.

## Sources

### Primary (HIGH confidence)
- Direct code analysis of `.claude/burrow/lib/mongoose.cjs` (307 lines)
- Direct code analysis of `.claude/burrow/burrow-tools.cjs` (259 lines)
- Direct code analysis of `.claude/burrow/lib/warren.cjs` (65 lines)
- Direct code analysis of `.claude/burrow/lib/core.cjs` (68 lines)
- Direct code analysis of `.claude/burrow/test/mongoose.test.cjs` (419 lines)
- Live data file analysis: `.planning/burrow/cards.json` (confirmed `items` key mismatch)
- Runtime verification: `warren.load()` returns `{version, ordering, items}` not `{version, cards}`

### Secondary (MEDIUM confidence)
- CONTEXT.md user decisions (2026-03-07)
- REQUIREMENTS.md requirement definitions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - zero-dependency constraint, Node.js built-ins only, same as Phase 1
- Architecture: HIGH - direct code analysis of all files, patterns derived from existing working code
- Pitfalls: HIGH - key mismatch verified at runtime, all other pitfalls identified from code reading
- Schema migration: HIGH - verified that on-disk data uses `items` key while code expects `cards`

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable -- internal project, no external dependency changes)
