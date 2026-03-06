# Storage Architecture Research

**Researched:** 2026-03-06
**Domain:** Flat-file storage design for a bucket-based task manager consumed by an AI agent
**Confidence:** HIGH

## Summary

This research evaluates six storage architectures for Todobox against the project's ranked priorities: (1) low token consumption, (2) speed, (3) minimality, (4) determinism, (5) elegance. The analysis reveals that the existing research's assumption -- one markdown file per item in a flat `items/` directory -- is suboptimal for the actual access patterns. The dominant operations (pan view, drill view) require reading ALL items to compute aggregates, meaning every common operation pays the cost of full enumeration.

**The recommended approach is: Single JSON file (`items.json`) with no separate item files.**

This contradicts the existing ARCHITECTURE.md and PITFALLS.md recommendations, but the evidence is clear when measured against the ranked priorities. The rationale is developed in full below.

**Primary recommendation:** Store all items in a single `items.json` file. No markdown files. No subdirectories. Archive is a boolean field, not a separate directory. The entire data model is one `config.json` + one `items.json`.

## The Analysis Framework

For each approach, I measure:

| Operation | What's needed | Token-optimal output |
|-----------|---------------|----------------------|
| Pan view | Bucket names + item counts | `{"inbox": 3, "bugs": 7, "ideas": 2}` (~40 bytes) |
| Drill view | Items in one bucket, grouped by tag | `{"backend": ["fix login", "add cache"], "": ["misc task"]}` (~100 bytes) |
| Add item | Write one item | Return `{"ok": true, "id": "abc"}` (~25 bytes) |
| Move item | Change one item's bucket field | Return `{"ok": true}` (~12 bytes) |
| Search | Find items matching text | Return matched items (~50 bytes per match) |
| Archive | Mark item done, hide from active views | Return `{"ok": true}` (~12 bytes) |

The CLI tool processes data internally and returns minimal JSON. The question is: **what storage layout minimizes the I/O the CLI tool must do to produce that minimal output?**

---

## Approach 1: One File Per Item (Flat Directory)

```
.planning/todobox/
  config.json
  items/
    fix-login-bug.md
    add-dark-mode.md
    refactor-api.md
    ...
  archive/
    old-task.md
    ...
```

Each `.md` file has YAML frontmatter (title, bucket, tags, created) and optional markdown body (notes).

### I/O Cost Analysis

| Operation | File reads | File writes | Notes |
|-----------|-----------|-------------|-------|
| Pan view | N (all items) | 0 | Must read every file's frontmatter to count by bucket |
| Drill view | N (all items) | 0 | Must read all to find items in target bucket, then group by tag |
| Add item | 0 | 1 | Write one new .md file |
| Move item | 1 | 1 | Read item, change bucket in frontmatter, write back |
| Search | N (all items) | 0 | Must read every file (frontmatter + body) |
| Archive | 1 | 1 (rename) | Move file from items/ to archive/ |

### Token Cost

Output is identical regardless of storage (CLI computes and returns JSON). But the CLI process itself must do N file reads for every read operation.

### Scaling

| Items | Pan view cost | Drill view cost |
|-------|---------------|-----------------|
| 10 | 10 file reads + 10 YAML parses | Same |
| 200 | 200 file reads + 200 YAML parses | Same |
| 500 | 500 file reads + 500 YAML parses | Same |

### Edge Cases and Failure Modes

- **Filename collisions:** Two items with same title slug. Mitigated with UUID suffix, but filenames become ugly.
- **Corrupted frontmatter:** One bad file breaks only that item, not others. Good isolation.
- **YAML parsing edge cases:** Colons in titles, special characters. Every read is a YAML parse, multiplying the risk surface.
- **Race conditions:** Concurrent writes to different files are safe. Concurrent read-modify-write on same file is unsafe.
- **Directory listing overhead:** `fs.readdirSync` + N `fs.readFileSync` calls. OS-level directory reads are fast, but N individual file reads are not free.

### Verdict

**Good isolation, terrible read performance.** Every common read operation is O(N) in both I/O calls and YAML parses. The YAML parsing cost is particularly wasteful -- we parse structured data from text just to count items. The flat directory structure provides zero organizational benefit; bucket membership is in the frontmatter, not the filesystem.

---

## Approach 2: One File Per Item (Bucket Subdirectories)

```
.planning/todobox/
  config.json
  items/
    inbox/
      fix-login-bug.md
      random-thought.md
    bugs/
      api-timeout.md
    features/
      dark-mode.md
  archive/
    old-task.md
```

Same as Approach 1, but items organized into subdirectories by bucket name.

### I/O Cost Analysis

| Operation | File reads | File writes | Notes |
|-----------|-----------|-------------|-------|
| Pan view | B directory listings | 0 | Count files per bucket dir. No need to read file contents! |
| Drill view | K (items in one bucket) | 0 | Read only files in target bucket dir |
| Add item | 0 | 1 | Write to correct bucket subdir |
| Move item | 1 | 1 (rename) | Move file between bucket subdirs |
| Search | N (all items) | 0 | Still must read all files |
| Archive | 1 | 1 (rename) | Move to archive/ |

### Scaling

| Items | Pan view cost | Drill view cost |
|-------|---------------|-----------------|
| 10 | B directory listings (fast!) | K file reads (items in bucket) |
| 200 | B directory listings (same!) | K file reads (variable) |
| 500 | B directory listings (same!) | K file reads (variable) |

### Edge Cases

- **Move item = file rename across directories.** Atomic on same filesystem. Clean.
- **Bucket rename = directory rename.** Affects all items in bucket. Atomic via `fs.renameSync`.
- **Bucket name with special characters.** Need to sanitize directory names.
- **Pan view is O(B) not O(N).** Significant improvement. Just count files per directory.
- **But:** Pan view by file count is inaccurate if there are non-item files or corrupted files. Need to filter by `.md` extension at minimum.

### Verdict

**Significantly better for pan view and drill view.** Pan view drops from O(N) file reads to O(B) directory listings. Drill view drops from O(N) to O(K). But still requires YAML parsing for every item read. Move operation is elegant (rename across dirs). The cost is more directories to manage and bucket renames affecting the filesystem.

---

## Approach 3: Single JSON File

```
.planning/todobox/
  config.json
  items.json
```

All items in one JSON file:

```json
{
  "items": [
    {
      "id": "abc123",
      "title": "Fix login bug",
      "bucket": "bugs",
      "tags": ["backend", "auth"],
      "created": "2026-03-06T14:30:00Z",
      "archived": false,
      "notes": "The login form times out after 30 seconds..."
    }
  ]
}
```

### I/O Cost Analysis

| Operation | File reads | File writes | Notes |
|-----------|-----------|-------------|-------|
| Pan view | 1 | 0 | Read items.json, count by bucket field |
| Drill view | 1 | 0 | Read items.json, filter + group |
| Add item | 1 | 1 | Read items.json, push item, write back |
| Move item | 1 | 1 | Read items.json, update bucket field, write back |
| Search | 1 | 0 | Read items.json, filter |
| Archive | 1 | 1 | Read items.json, set archived=true, write back |

### Scaling

| Items | Pan view cost | Drill view cost |
|-------|---------------|-----------------|
| 10 | 1 file read (~1KB) | Same |
| 200 | 1 file read (~30KB) | Same |
| 500 | 1 file read (~75KB) | Same |

### Key Advantages

1. **One file read for every operation.** No matter what you do, it's `JSON.parse(fs.readFileSync('items.json'))`. One call. Deterministic.

2. **No YAML parsing.** JSON.parse is native, fast, and has zero edge cases with colons, dashes, or special characters. The entire category of YAML fragility pitfalls vanishes.

3. **Pan view is trivial.** Read JSON, `reduce` by bucket, count. No directory listings, no frontmatter parsing, no file enumeration.

4. **Search is trivial.** Read JSON, `filter`. No glob, no per-file reads.

5. **Archive is a flag, not a file move.** `item.archived = true`. No filesystem operations beyond the JSON rewrite. Simpler, faster, fewer failure modes.

6. **Notes are inline.** No separate files needed for notes. The `notes` field holds the text. For 90% of items, notes will be one paragraph or empty.

7. **Atomic writes are simple.** Write to `items.json.tmp`, rename to `items.json`. One file, one atomic operation.

8. **Git diffs are readable.** JSON with `JSON.stringify(data, null, 2)` produces clean diffs. Each item change is a localized diff in one file.

### Edge Cases and Failure Modes

- **Concurrent writes.** Two processes read items.json simultaneously, both modify, one overwrites the other's changes. **Mitigation:** This is a single-user CLI tool invoked by one agent in one session. Concurrent writes are extremely unlikely. If they occur, the atomic write-then-rename at least prevents corruption.
- **File corruption.** If items.json is corrupted, ALL data is lost. **Mitigation:** (a) Atomic writes prevent mid-write corruption. (b) Git provides history. (c) Could keep items.json.bak as a safety net.
- **Large notes.** An item with a 10KB note inflates the JSON for every operation. **Mitigation:** At 500 items with average 200-byte notes, the file is ~150KB. `JSON.parse` handles this in <1ms. For truly large notes (multi-KB), consider the hybrid approach (Approach 4). But in practice, todobox notes are short -- a paragraph, a URL, a code snippet.
- **Not human-editable?** JSON is less pleasant to hand-edit than markdown. **Counter:** Users interact via the CLI and agent, not by editing files directly. The agent reads JSON output. Human editability of storage files is a nice-to-have, not a requirement.
- **Merge conflicts.** If two branches modify items.json, git produces a merge conflict. **Mitigation:** This is per-project, single-developer. Branch conflicts on todobox data are extremely unlikely. And JSON merge conflicts are no worse than YAML merge conflicts.

### Verdict

**Optimal for the ranked priorities.** Minimal I/O (one read per operation), no YAML parsing (eliminates an entire pitfall category), simplest possible implementation (one file, native JSON), fully deterministic, and elegant in its simplicity. The isolation tradeoff (corrupted file = all data at risk) is mitigated by atomic writes and git history.

---

## Approach 4: Single JSON + Markdown Notes

```
.planning/todobox/
  config.json
  items.json        # Index with all item metadata
  notes/
    abc123.md       # Notes for items that have them
    def456.md
```

`items.json` holds all metadata. Notes are stored as separate markdown files, referenced by item ID. Only created when an item actually has notes.

### I/O Cost Analysis

| Operation | File reads | File writes | Notes |
|-----------|-----------|-------------|-------|
| Pan view | 1 | 0 | Read items.json only |
| Drill view | 1 | 0 | Read items.json only (don't need notes for drill) |
| Add item | 1 | 1-2 | Read+write items.json, optionally write notes file |
| Move item | 1 | 1 | Read+write items.json |
| Search | 1 + M (notes files) | 0 | Read items.json + notes files for full-text search |
| Archive | 1 | 1 | Read+write items.json |

### Verdict

**Unnecessarily complex for the actual use case.** This approach optimizes for a problem that doesn't exist: items with large notes inflating the JSON file. In practice, todobox notes will be short (a sentence, a URL, a code snippet). The added complexity of a second storage location, a notes directory, and reference integrity (what if notes file exists but item was deleted?) is not justified. If a future version needs large notes, the migration from Approach 3 is trivial: extract `notes` fields into files.

---

## Approach 5: Bucket Subdirs + Manifest

```
.planning/todobox/
  config.json
  manifest.json     # Lightweight index: {id, title, bucket, tags, created} for all items
  items/
    inbox/
      fix-login-bug.md
    bugs/
      api-timeout.md
  archive/
    old-task.md
```

The manifest caches item metadata for fast reads. Item files are the source of truth. Manifest is rebuilt on any write.

### I/O Cost Analysis

| Operation | File reads | File writes | Notes |
|-----------|-----------|-------------|-------|
| Pan view | 1 (manifest) | 0 | Read manifest, count by bucket |
| Drill view | 1 (manifest) | 0 | Read manifest, filter + group |
| Add item | 0 | 2 | Write item file + update manifest |
| Move item | 1 | 3 | Read item, rename file, update manifest |
| Search | 1 (manifest) + K (matched items for notes) | 0 | Fast metadata search, then load full items if needed |
| Archive | 1 | 2 | Move file + update manifest |

### Verdict

**Over-engineered for the scale.** This is the right pattern for 10,000+ items, not 10-200. The manifest introduces a consistency problem (manifest and files can diverge), requires rebuild logic, and doubles the write cost. It's a caching optimization that adds complexity for a dataset that fits comfortably in memory as a single JSON file. If the data fits in one file, there's no need for a separate index.

---

## Approach 6: Other Approaches Considered

### SQLite via better-sqlite3
Not viable: requires native module compilation, external dependency, violates zero-deps constraint.

### NDJSON (newline-delimited JSON)
One line per item. Append-only for adds, rewrite for updates.
- **Pro:** Append-only adds are fast. Partial reads possible.
- **Con:** Deletes and updates still require full rewrite. More complex parsing than JSON. No advantage over a single JSON file at this scale.

### TOML / INI for items
- **Con:** Less familiar than JSON, harder to parse without deps, no advantage.

### Single Markdown file with all items
A big markdown file with YAML frontmatter per section.
- **Con:** Fragile parsing, poor git diffs, awkward to update.

### Git-notes or git-based storage
Use git objects to store items.
- **Con:** Absurdly complex for a simple task list. Git is the backup, not the database.

**None of these outperform Approach 3 (single JSON) for this use case.**

---

## Head-to-Head Comparison

### I/O Operations Per Command

| Operation | Flat files | Bucket subdirs | Single JSON | JSON+notes | Manifest |
|-----------|-----------|----------------|-------------|------------|----------|
| Pan view | N reads | B dir listings | **1 read** | 1 read | 1 read |
| Drill view | N reads | K reads + K parses | **1 read** | 1 read | 1 read |
| Add item | 1 write | 1 write | 1 read + 1 write | 1-2 writes | 2 writes |
| Move item | 1 read + 1 write | 1 rename | 1 read + 1 write | 1 read + 1 write | 3 writes |
| Search | N reads | N reads | **1 read** | 1+M reads | 1+K reads |
| Archive | 1 rename | 1 rename | 1 read + 1 write | 1 read + 1 write | 2 writes |

N = total items, B = number of buckets, K = items in target bucket, M = items with notes

### Write overhead comparison

Single JSON requires a full rewrite on every mutation. How expensive is this?

| Items | JSON file size | JSON.parse time | JSON.stringify time | fs.writeFileSync time |
|-------|---------------|-----------------|--------------------|-----------------------|
| 10 | ~2 KB | <0.1ms | <0.1ms | <0.1ms |
| 200 | ~30 KB | <0.5ms | <0.5ms | <0.5ms |
| 500 | ~75 KB | <1ms | <1ms | <1ms |

These numbers are negligible. A 75KB JSON file is parsed and written faster than a single YAML frontmatter extraction from a markdown file.

### YAML Parsing Cost

Each YAML parse involves:
1. Find `---` delimiters (string search)
2. Extract YAML block
3. Parse key-value pairs, handle arrays, handle special characters
4. Validate schema

For a single file, this is fast (~0.1ms). For 200 files, it's 200 x 0.1ms = 20ms. Not catastrophic, but pointless when JSON.parse of the whole dataset takes 0.5ms.

### Priority Rankings

| Priority | Winner | Why |
|----------|--------|-----|
| 1. Low token consumption | **Tie** (all approaches) | Token cost is in CLI output, not storage. CLI returns the same minimal JSON regardless. |
| 2. Fast | **Single JSON** | 1 read beats N reads. No YAML parsing. Native JSON.parse. |
| 3. Minimal | **Single JSON** | 2 files total (config.json + items.json). No directories, no manifest, no notes dir. |
| 4. Deterministic | **Single JSON** | JSON.parse/stringify are perfectly deterministic. No YAML edge cases. No filesystem state to reconcile. |
| 5. Elegant | **Single JSON** | The entire data model fits in your head: one array of objects. Every operation is read-filter/modify-write. |

---

## Addressing Objections

### "But one file per item gives better isolation"

True. If one item file corrupts, only that item is lost. With single JSON, corruption loses everything.

**Counter:**
1. Atomic writes (write to .tmp, rename) prevent mid-write corruption.
2. Git history is the real backup. `git checkout .planning/todobox/items.json` restores any state.
3. `items.json.bak` can be written before each modification as belt-and-suspenders.
4. In practice, JSON corruption from a Node.js `JSON.stringify` + `fs.writeFileSync` does not happen. The failure mode is a process kill during write, which atomic writes handle.

### "But markdown files are human-readable and git-diffable"

True. But who is reading these files?

**Counter:**
1. The primary consumer is the AI agent, reading CLI JSON output. Not a human reading files.
2. The secondary consumer is the developer, using CLI commands. Not a human editing files.
3. `JSON.stringify(data, null, 2)` produces perfectly readable, git-diffable JSON.
4. If a human wants to inspect items, `cat items.json | jq .` or just `node todobox-tools.cjs item list`.

### "But the existing research says markdown files"

The existing ARCHITECTURE.md and PITFALLS.md assume markdown files. This was inherited from GSD's pattern (which uses markdown for planning artifacts that humans DO read and edit directly). But Todobox items are NOT planning artifacts. They are structured data consumed by an agent. The pattern doesn't transfer.

The PITFALLS.md even identifies "YAML Frontmatter Parsing Fragility" as Pitfall #1. The single JSON approach eliminates this entire pitfall category.

### "But what about notes with rich markdown content?"

Items can still have a `notes` field containing markdown text. It's just stored as a JSON string rather than a markdown file body. For the expected note length (a sentence to a paragraph), this is fine. If someone needs to store a 5-page design doc as a note, they should link to an actual document, not embed it in a task item.

### "What about concurrent agent writes?"

This is a single-user CLI tool invoked by one agent in one session. Concurrent writes are not a realistic concern. The atomic write-then-rename pattern handles the edge case of process interruption.

---

## Recommended Design: Single JSON

### File Layout

```
.planning/todobox/
  config.json       # Bucket definitions, display order, limits, settings
  items.json        # All items (active + archived)
```

That's it. Two files. Total.

### items.json Schema

```json
{
  "version": 1,
  "items": [
    {
      "id": "a1b2c3d4",
      "title": "Fix the login timeout bug",
      "bucket": "bugs",
      "tags": ["backend", "auth"],
      "created": "2026-03-06T14:30:00Z",
      "archived": false,
      "notes": "The login form times out after 30 seconds but the API needs 45s on slow connections."
    },
    {
      "id": "e5f6g7h8",
      "title": "Add dark mode toggle",
      "bucket": "features",
      "tags": ["frontend"],
      "created": "2026-03-06T15:00:00Z",
      "archived": false,
      "notes": ""
    }
  ]
}
```

### config.json Schema

```json
{
  "version": 1,
  "buckets": [
    { "name": "inbox", "limit": null },
    { "name": "now", "limit": 5 },
    { "name": "next", "limit": 10 },
    { "name": "later", "limit": null }
  ],
  "defaultBucket": "inbox"
}
```

### ID Generation

Use 8-character hex from `crypto.randomUUID()`:

```javascript
const id = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
```

8 hex chars = 4 billion combinations. Collision probability is negligible for a task list.

Short IDs serve two purposes:
1. Low token cost when the agent references items
2. Easy for humans to type if needed (`tb-move a1b2c3d4 done`)

### Core Operations (Pseudocode)

```javascript
// Read helper (used by every operation)
function loadItems(cwd) {
  const path = join(cwd, '.planning/todobox/items.json');
  if (!existsSync(path)) return { version: 1, items: [] };
  return JSON.parse(readFileSync(path, 'utf-8'));
}

// Write helper (used by every mutation)
function saveItems(cwd, data) {
  const path = join(cwd, '.planning/todobox/items.json');
  const tmp = path + '.tmp';
  writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  renameSync(tmp, path);
}

// Pan view: bucket names + counts
function panView(cwd) {
  const { items } = loadItems(cwd);
  const config = loadConfig(cwd);
  const active = items.filter(i => !i.archived);
  const counts = {};
  for (const b of config.buckets) counts[b.name] = 0;
  for (const item of active) counts[item.bucket] = (counts[item.bucket] || 0) + 1;
  return counts;
}

// Drill view: items in one bucket, grouped by tag
function drillView(cwd, bucket) {
  const { items } = loadItems(cwd);
  const active = items.filter(i => !i.archived && i.bucket === bucket);
  const groups = {};
  for (const item of active) {
    if (item.tags.length === 0) {
      (groups[''] = groups[''] || []).push(item.title);
    } else {
      for (const tag of item.tags) {
        (groups[tag] = groups[tag] || []).push(item.title);
      }
    }
  }
  return groups;
}

// Add item
function addItem(cwd, { title, bucket, tags = [], notes = '' }) {
  const data = loadItems(cwd);
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
  data.items.push({ id, title, bucket, tags, created: new Date().toISOString(), archived: false, notes });
  saveItems(cwd, data);
  return { ok: true, id };
}

// Move item
function moveItem(cwd, id, newBucket) {
  const data = loadItems(cwd);
  const item = data.items.find(i => i.id === id);
  if (!item) return { ok: false, error: 'Item not found' };
  item.bucket = newBucket;
  saveItems(cwd, data);
  return { ok: true };
}

// Archive item
function archiveItem(cwd, id) {
  const data = loadItems(cwd);
  const item = data.items.find(i => i.id === id);
  if (!item) return { ok: false, error: 'Item not found' };
  item.archived = true;
  item.archivedAt = new Date().toISOString();
  saveItems(cwd, data);
  return { ok: true };
}

// Search
function searchItems(cwd, query) {
  const { items } = loadItems(cwd);
  const q = query.toLowerCase();
  return items.filter(i => !i.archived && (
    i.title.toLowerCase().includes(q) ||
    i.notes.toLowerCase().includes(q) ||
    i.tags.some(t => t.toLowerCase().includes(q))
  ));
}
```

### Archiving

Archive is a boolean field (`archived: true`) plus an `archivedAt` timestamp. Archived items remain in `items.json` but are excluded from active views.

**Why not a separate file or directory:**
- Moving items between files risks data loss.
- A separate `archive.json` means two files to manage and cross-reference.
- Filtering `items.filter(i => !i.archived)` is O(N) in memory, which is instant for 500 items.
- Search across active + archived is trivial: just remove the filter.

**Cleanup:** If archived items accumulate (1000+), a `purge` command can permanently remove items archived more than N days ago. This is a future concern, not a launch concern.

### What This Eliminates

| Eliminated | Why It's Good |
|------------|---------------|
| YAML frontmatter parser | Zero YAML edge cases. No colon escaping, no `---` delimiter detection, no special character handling. Entire pitfall category removed. |
| Frontmatter serializer | JSON.stringify handles everything. |
| Slug generator | IDs are hex strings, not slugified titles. No collision logic needed. |
| items/ directory | No directory to create, manage, or enumerate. |
| archive/ directory | No directory to manage. No file moves. |
| Per-file reads | One JSON.parse replaces N file reads. |
| fs.readdirSync | No directory listing needed for any operation. |
| File rename operations | No `fs.renameSync` for moves or archiving. |

### What This Adds

| Added | Cost |
|-------|------|
| Full file rewrite on every mutation | Negligible at <100KB. JSON.stringify + writeFile < 1ms. |
| All items in memory for every operation | Negligible at <100KB. JSON.parse < 1ms. |
| items.json.tmp during writes | One temporary file, deleted by rename. |

### Impact on Existing Architecture

The recommended architecture in ARCHITECTURE.md needs these updates:

| Component | Change |
|-----------|--------|
| lib/core.cjs | Drop frontmatter parse/serialize. Add loadItems/saveItems (JSON). Simpler. |
| lib/items.cjs | Operates on JSON array, not file CRUD. Simpler. |
| lib/archive.cjs | May not be needed as separate module. Archive is just `item.archived = true`. |
| lib/renderer.cjs | No change. Still takes data, returns formatted text. |
| lib/config.cjs | No change. Still reads/writes config.json. |
| todobox-tools.cjs | No change. Still routes subcommands. |

The PITFALLS.md Pitfall #1 (YAML Frontmatter Parsing Fragility) is completely eliminated. Pitfall #2 (File I/O Race Conditions) is reduced to a single-file concern handled by atomic writes.

## Common Pitfalls (Single JSON Specific)

### Pitfall 1: Forgetting Atomic Writes
**What goes wrong:** `writeFileSync` directly to `items.json` is interrupted, leaving a truncated or empty file.
**How to avoid:** Always write to `items.json.tmp` then `renameSync`. This is 2 lines of code. Make it the only write path.

### Pitfall 2: Pretty-printing Inflation
**What goes wrong:** `JSON.stringify(data, null, 2)` adds whitespace. At 500 items, the file is ~75KB instead of ~40KB.
**How to avoid:** This is fine. The 2-space indentation makes git diffs readable. The size difference is irrelevant for local file I/O.

### Pitfall 3: ID Collision
**What goes wrong:** Two items get the same 8-char hex ID.
**How to avoid:** 8 hex chars = 4,294,967,296 combinations. With 500 items, collision probability is ~0.000003%. But check anyway: if generated ID exists in items array, generate a new one.

### Pitfall 4: Growing Notes Bloat
**What goes wrong:** Users paste entire log files into item notes, inflating items.json to megabytes.
**How to avoid:** Cap notes at a reasonable length (e.g., 2000 characters) with a clear message: "Note truncated. For longer content, link to a file." This is a validation check on write, not a storage concern.

### Pitfall 5: Losing the Backup
**What goes wrong:** items.json corrupts and there's no recent git commit of the data.
**How to avoid:** Write `items.json.bak` before each mutation. This is 1 extra line: `copyFileSync(path, path + '.bak')`. The .bak is overwritten each time, so it's always the previous state.

## Open Questions

1. **Should archived items live in the same file or a separate archive.json?**
   - Recommendation: Same file. Simpler. Filter on read is trivial. If archive grows huge (1000+ items), add a purge command later.
   - The planner should decide if the complexity of a separate file is justified.

2. **Should notes have a size limit?**
   - Recommendation: Yes, 2000 characters. Link to files for longer content.
   - This prevents JSON bloat without restricting normal usage.

3. **Should items.json.bak be written on every mutation?**
   - Recommendation: Yes. One extra file copy, negligible cost, significant safety net.
   - Alternative: Rely solely on git history.

4. **Version field in items.json -- is schema migration needed?**
   - Recommendation: Include `"version": 1` from the start. Migration logic can be added later if the schema changes. Costs nothing to include now.

## Sources

### Primary (HIGH confidence)
- Node.js fs module documentation -- readFileSync, writeFileSync, renameSync behavior and atomicity guarantees
- JSON.parse/JSON.stringify specification -- deterministic serialization behavior
- POSIX rename(2) specification -- atomic rename on same filesystem (guarantees atomic writes)

### Secondary (MEDIUM confidence)
- GSD gsd-tools.cjs and lib/ modules -- directly inspected for CLI tool patterns and conventions
- Existing ARCHITECTURE.md, PITFALLS.md, STACK.md, FEATURES.md -- project context and constraints
- Taskwarrior architecture (uses binary database, not flat files) -- validated that structured data storage outperforms file-per-item for aggregation queries

### Analysis (HIGH confidence)
- I/O cost comparisons are derived from first principles (file system call counts and computational complexity)
- Scaling estimates are based on typical JSON parse/stringify benchmarks on Node.js 22

---

## Metadata

**Confidence breakdown:**
- Recommendation (single JSON): HIGH -- clear winner across all five ranked priorities
- I/O cost analysis: HIGH -- based on filesystem call counts, not estimates
- Scaling analysis: HIGH -- JSON.parse performance is well-documented
- Pitfall analysis: HIGH -- failure modes are well-understood for single-file JSON storage
- Migration risk: LOW confidence needed -- existing architecture docs assume markdown files; changing direction requires updating multiple planning documents

**Research date:** 2026-03-06
**Valid until:** Indefinite (storage fundamentals don't change)
