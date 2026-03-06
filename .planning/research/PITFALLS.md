# Pitfalls Research

**Domain:** CLI bucket-based task manager / Claude Code addon (flat-file, YAML frontmatter, agent-facing)
**Researched:** 2026-03-06
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: YAML Frontmatter Parsing Fragility

**What goes wrong:**
YAML frontmatter parsing silently breaks when item content contains `---` delimiters, colons in titles, multi-line values, tab characters, or special YAML characters (`#`, `@`, `*`, `[`, `{`). A user creates an item titled `Bug: fix the login` and the colon causes a YAML parse error. Or they paste a code snippet with `---` into the notes body and the parser splits the file incorrectly.

**Why it happens:**
YAML looks simple but has deep syntax edge cases. The `---` delimiter detection is a naive string split in most implementations. Developers test with clean data and miss adversarial content. The gray-matter library handles most cases but still relies on js-yaml underneath, which has had prototype pollution vulnerabilities (CVE-2025-64718) and can choke on unexpected input.

**How to avoid:**
- Use gray-matter with `safeLoad` / safe schema options (no custom YAML types).
- Wrap every frontmatter parse in try/catch with a clear error message that identifies which file failed and why.
- Validate frontmatter fields against an expected schema after parsing (expected keys, types).
- Escape or quote all string values when writing frontmatter programmatically -- never interpolate raw user input into YAML.
- Write a dedicated `parseFrontmatter(filePath)` function with comprehensive error handling used everywhere.
- Test with adversarial titles: colons, quotes, `---`, Unicode, empty strings, very long strings.

**Warning signs:**
- Items silently disappear from views (parse fails, item skipped).
- Intermittent "invalid YAML" errors that users can't reproduce.
- Items with certain characters in titles never render correctly.

**Phase to address:**
Phase 1 (Core data layer). The frontmatter parser is the foundation. If it's fragile, everything built on top is unreliable. Build it with a comprehensive test suite before moving to features.

---

### Pitfall 2: File I/O Race Conditions and Data Loss

**What goes wrong:**
The agent and the developer both invoke Todobox operations concurrently. Two rapid `tb-add` commands create files with the same timestamp-based ID, overwriting one. A `tb-move` reads a file, modifies frontmatter, and writes it back -- but another process modified it in between. On crash or Ctrl+C during write, the file is truncated to zero bytes. This is not hypothetical: Claude Code itself had a documented race condition bug with `.claude.json` corruption from concurrent sessions (GitHub issue #29036).

**Why it happens:**
Node.js `fs.writeFileSync` is not atomic. Writing directly to the target file means a crash mid-write produces a corrupted file. Timestamp-based IDs can collide within the same millisecond. Developers assume single-user means single-process, but Claude Code spawns subagents and background tasks.

**How to avoid:**
- Use atomic writes: write to a `.tmp` file in the same directory, then `fs.renameSync()` to the target path. Rename is atomic on POSIX filesystems.
- Generate item IDs using a counter from config.json (increment + save) or use `crypto.randomUUID()` instead of timestamps.
- Never read-modify-write without re-reading immediately before write.
- Keep write operations as narrow as possible -- modify one file at a time, not batch operations.

**Warning signs:**
- Items occasionally have wrong or duplicated content.
- Zero-byte `.md` files appearing in the items directory.
- Config.json reverting to a previous state after operations.

**Phase to address:**
Phase 1 (Core data layer). Atomic file operations and safe ID generation must be baked in from the start. Retrofitting atomicity is painful.

---

### Pitfall 3: Agent Output Ambiguity -- Mixing Human and Machine Formats

**What goes wrong:**
The CLI tool returns formatted text that the agent must parse to extract data, or returns JSON that gets displayed to the user as raw JSON. The agent hallucinates item IDs because the output format was unclear. The user sees `{"success":true,"items":[...]}` instead of a readable table. Worse: the agent interprets a formatted text table and gets column alignment wrong, moving the wrong item.

**Why it happens:**
CLI tools are traditionally designed for human consumption (pretty tables, colors) or machine consumption (JSON, TSV). Todobox needs both: the agent reads structured data to reason about items, and the user sees formatted output in the terminal. Developers build one format and try to use it for both, which serves neither well.

**How to avoid:**
- Enforce a strict separation: `todobox-tools.cjs` ALWAYS returns JSON to stdout. The workflow markdown templates handle formatting for display.
- The agent parses JSON. The workflow formats JSON into the pan/drill views for the user.
- Never have the agent parse formatted text output. Never show raw JSON to the user.
- Define a clear contract: every CLI command returns `{ success: boolean, data: ..., error?: string }`.
- Document the JSON schema for each command's output in the workflow file so the agent knows what to expect.

**Warning signs:**
- Workflow prompts contain instructions like "parse the output and extract the item ID from the second column."
- Users see JSON blobs in chat.
- Agent operations fail intermittently because output format changed between commands.

**Phase to address:**
Phase 1 (Core CLI tool). Establish the JSON output contract before building any features. Every command added later must follow the same contract.

---

### Pitfall 4: Feature Creep Turning Simple Buckets Into a Project Manager

**What goes wrong:**
The bucket + tag model is elegant in its simplicity. Then someone wants priority levels. Then due dates. Then dependencies between items. Then recurring items. Then sub-tasks. Each addition is "just one more field" but collectively they transform Todobox from a lightweight capture tool into a poor man's Jira. Taskwarrior's own maintainers reflected: "There is a fine line between 'richly-featured' and 'bloated'. There may not be a line at all."

**Why it happens:**
Every individual feature request is reasonable. The problem is the aggregate. Each new frontmatter field increases parsing complexity, display complexity, and cognitive load. The out-of-scope list in PROJECT.md already excludes priority scores and complex sorting, but the pressure will come from "just tags with special meaning" or "just one more optional field."

**How to avoid:**
- The item schema is: bucket, title, created, tags, notes. That is the ceiling, not the floor.
- New item-level metadata goes into notes as freeform text, not as new frontmatter fields.
- If the agent needs to reason about priority or due dates, it reads the notes field and uses its own judgment -- no structured fields needed.
- Test the "would I explain this in 30 seconds?" rule for any proposed addition.
- Refer back to PROJECT.md out-of-scope decisions before accepting any feature.

**Warning signs:**
- Frontmatter has more than 5-6 fields.
- The config.json schema keeps growing with new per-bucket settings.
- Display rendering has conditional logic for "show this column if this field exists."

**Phase to address:**
Every phase. This is a continuous discipline, not a one-time decision. But the schema freeze should happen in Phase 1 and be explicitly documented.

---

### Pitfall 5: Reconciliation That Annoys Instead of Helps

**What goes wrong:**
The agent suggests reconciling after every phase execution. It presents 15 potential matches, most of them wrong. The user has to say "no" 14 times. After a few sessions, the user ignores reconciliation entirely or disables it. The feature designed to be Todobox's killer integration becomes an annoyance that trains users to dismiss it.

**Why it happens:**
Naive string matching between completed work descriptions and item titles produces too many false positives. The reconciliation triggers too often (after every small change, not just significant completions). The interaction model requires explicit confirmation for each match instead of batching.

**How to avoid:**
- Present reconciliation as a summary, not an interrogation. "These 3 items look done: [list]. Archive them? (y/all/pick/skip)"
- Set a minimum threshold for triggering reconciliation -- only after meaningful work phases, not after every file edit.
- Let the agent use its judgment to filter low-confidence matches before presenting to the user.
- Keep the interaction to a single decision point, not a per-item loop.
- Make reconciliation skippable with zero friction ("skip" is always an option, no guilt).

**Warning signs:**
- Users start typing "skip" reflexively at every reconciliation prompt.
- Reconciliation takes longer than the actual work it's reconciling.
- False positive rate exceeds 50% of suggestions.

**Phase to address:**
Phase 3 or later (GSD Integration). Build the core CRUD and rendering first. Reconciliation is an integration feature that should only be built after the basic workflow is proven.

---

### Pitfall 6: Rendering That Breaks With Real Data

**What goes wrong:**
The pan and drill views look perfect with 3 buckets of 5 items each during development. Then a real project has a bucket with 40 items, titles that are 80+ characters long, tags with special characters, and items with no tags mixed with items with multiple tags. The aligned dotted display breaks. Indentation pushes content off-screen. The terminal wraps lines and destroys the visual structure.

**Why it happens:**
Terminal rendering is tested with controlled data. Real data has variable-length strings, Unicode characters (which may be wider than one column), and quantities that exceed what fits in a standard 80-column terminal. The pan view's "dotted alignment" pattern assumes short bucket names and small counts.

**How to avoid:**
- Truncate long titles with ellipsis at a configurable max width (default: 60 chars).
- Cap visible items per bucket in drill view with a "and N more..." indicator.
- Test rendering with: empty buckets, single-item buckets, 50+ item buckets, 100-char titles, Unicode/emoji in titles, zero tags, 10+ tags.
- Use a simple rendering approach -- avoid box-drawing characters or complex alignment that breaks with variable data.
- The CLI tool returns data; the workflow formats it. This means rendering logic lives in the workflow template, where it can be adjusted without changing the tool.

**Warning signs:**
- "It looks fine" testing only uses fixture data with short names.
- No test for what happens when a bucket has zero items or 100 items.
- Display alignment uses string padding that doesn't account for wide characters.

**Phase to address:**
Phase 2 (Rendering/Views). But the data model from Phase 1 should include field-length conventions that rendering can depend on.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoding bucket names in config | Fast to ship | Can't rename or reorder buckets without editing config manually | Never -- use IDs from the start |
| String concatenation for file paths | Simpler code | Breaks on Windows, spaces in paths | Never -- use `path.join()` always |
| Reading all items into memory for every operation | Simple implementation | Slows down at 500+ items | MVP only -- add lazy loading in Phase 2 |
| Storing archive in same directory as active items with a flag | One directory to manage | Every query must filter archived items | Never -- separate directories from the start |
| Inline rendering in the CLI tool | Faster initial development | Can't change display without changing the tool | Never -- tool returns JSON, workflow formats |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| GSD workflow injection | Modifying files inside `.claude/get-shit-done/` | Todobox workflows live in `.claude/todobox/`, commands in `.claude/commands/gsd/` -- never touch GSD core |
| Claude Code slash commands | Putting complex logic in the `.md` command file | Command files should be thin dispatchers that call the workflow or CLI tool. Logic lives in `todobox-tools.cjs` or `workflows/todobox.md` |
| File system watchers | Using `fs.watch` to detect item changes for live updates | Don't. The tool reads files on demand. No watchers, no daemons, no background processes |
| Config.json concurrent access | Multiple commands reading/writing config simultaneously | Treat config.json as append-mostly. Use atomic writes. Keep writes rare (only on bucket create/delete/reorder) |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Globbing all `.md` files on every command | Noticeable delay before output | Cache file list within a single command invocation (not across commands) | 200+ items in a single bucket |
| Parsing all frontmatter to render pan view | Pan view should be instant but takes 500ms+ | Pan view only needs bucket + count. Use `config.json` for bucket names and count files per directory instead of parsing | 500+ total items |
| Synchronous file I/O blocking Node.js | CLI feels sluggish | Use `Sync` variants for simple operations (this is a CLI, not a server) -- but batch reads with `Promise.all` for large listings | 100+ items needing concurrent reads |
| Re-reading config.json on every sub-operation | Adds ~1ms per read, compounds in loops | Read config once at command start, pass as parameter | Commands that touch 50+ items |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Using `yaml.load()` (unsafe) instead of `yaml.safeLoad()` or safe schema | Prototype pollution via crafted YAML (CVE-2025-64718). An item's frontmatter could inject `__proto__` properties | Always use safe YAML loading. Use `gray-matter` with default safe settings. Validate parsed output shape |
| Executing user-provided strings as shell commands | If item titles or notes contain shell metacharacters and are passed to `exec()` | Never shell out with user data. Use `child_process.execFile` or avoid shell entirely -- Todobox should not need to spawn processes |
| Storing sensitive data in item notes | Items are plain markdown files readable by anyone with file access | Document that Todobox items are not encrypted. Do not store passwords, tokens, or secrets as items |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Requiring bucket specification for every command | "Add item to which bucket?" every time, even when there's only one obvious choice | Default bucket concept or "last used bucket" memory. Let `/gsd:tb-add fix login bug` infer the bucket from context |
| Showing all buckets in drill view when user asked about one | Information overload, user has to scroll past irrelevant buckets | Drill view takes an optional bucket filter. Default to showing the requested bucket only |
| Archiving without confirmation for destructive-feeling operations | User anxiety about losing items | Archive is non-destructive (items move to archive dir, fully searchable). Communicate this clearly. But still confirm bulk archive operations |
| Verbose success messages | "Item 'fix login bug' has been successfully added to bucket 'bugs' with tags ['frontend'] at 2026-03-06T..." clutters the conversation | Terse confirmations: "Added to bugs: fix login bug [frontend]". One line. The agent can elaborate if asked |
| Natural language command parsing that fails silently | User says "move the login thing to done" and the agent can't find a match but doesn't say so | Always confirm what was matched: "Moving 'fix login bug' from bugs to done. Correct?" If no match: "No items matching 'login thing' found in active buckets" |

## "Looks Done But Isn't" Checklist

- [ ] **Frontmatter parser:** Handles colons in titles, `---` in notes body, empty fields, missing fields, extra fields -- verify with adversarial test fixtures
- [ ] **Item creation:** Generates unique IDs even under rapid successive calls -- verify by creating 100 items in a loop
- [ ] **Bucket limits:** Enforced on add AND on move-into-bucket -- verify both paths
- [ ] **Archive search:** Archived items are actually searchable, not just stored -- verify search returns archived results with clear labeling
- [ ] **Pan view counts:** Count reflects actual parseable items, not just file count (corrupted files should not inflate count) -- verify by placing a non-parseable `.md` file in items/
- [ ] **Config.json:** Survives invalid edits (user hand-edits JSON badly) -- verify with malformed JSON producing a clear error, not a crash
- [ ] **Tag display:** Items with zero tags display differently from items whose tags field is an empty array -- verify both render correctly
- [ ] **Empty states:** Every view has a meaningful empty state (no buckets, no items in bucket, no archived items) -- verify all three

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Corrupted frontmatter in item file | LOW | Parse error identifies the file. User manually fixes YAML or deletes the file. Other items unaffected because each item is a separate file |
| Config.json corruption | MEDIUM | Keep a `config.json.bak` written before each modification. Recovery: copy backup over corrupted file. Worst case: user recreates bucket definitions (item files still have bucket field) |
| Accidentally archived wrong items | LOW | Archive is non-destructive. `tb-show archive` to find items, move them back. This is why archive must be searchable |
| ID collision (two items same filename) | MEDIUM | One item is lost. Prevention is critical (use UUID). Detection: log a warning if target file already exists during write. Recovery: check git history or archive for the lost item |
| Feature creep beyond schema | HIGH | Requires migration of all item files if frontmatter schema changes. Prevention is far cheaper. Recovery: write a migration script that reads old format and writes new format |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| YAML frontmatter fragility | Phase 1 (Data Layer) | Adversarial test suite passes: colons, dashes, quotes, Unicode, empty values, missing fields |
| File I/O race conditions | Phase 1 (Data Layer) | Atomic write function exists. Rapid-fire creation test produces no collisions |
| Agent output ambiguity | Phase 1 (CLI Tool) | Every command returns valid JSON with `{ success, data, error? }` schema. No formatted text in stdout |
| Feature creep | All Phases | Item frontmatter schema has not grown beyond: bucket, title, created, tags. Review at each phase boundary |
| Reconciliation annoyance | Phase 3+ (Integration) | User testing confirms reconciliation is helpful, not annoying. Skip is frictionless. False positive rate < 30% |
| Rendering with real data | Phase 2 (Views) | Render tests include: 0 items, 1 item, 50+ items, 80-char titles, Unicode, no tags, many tags |
| GSD core modification | Phase 1 (Setup) | No files inside `.claude/get-shit-done/` are created or modified. Verify with directory diff |

## Sources

- [Taskwarrior: What Have We Learned](https://taskwarrior.org/docs/advice/) -- lessons on feature creep and scope discipline from a mature CLI task manager
- [Node.js CLI Apps Best Practices](https://github.com/lirantal/nodejs-cli-apps-best-practices) -- error handling, output formatting, cross-platform issues
- [Claude Code race condition issue #29036](https://github.com/anthropics/claude-code/issues/29036) -- real-world file corruption from concurrent sessions in Claude Code itself
- [CVE-2025-64718: js-yaml prototype pollution](https://www.resolvedsecurity.com/vulnerability-catalog/CVE-2025-64718) -- YAML parsing security vulnerability
- [Todo.txt vs Taskwarrior comparisons](https://lwn.net/Articles/824333/) -- design tradeoffs in flat-file vs structured task managers
- [Towards Atomic File Modifications](https://dev.to/martinhaeusler/towards-atomic-file-modifications-2a9n) -- write-then-rename pattern for safe file updates

---
*Pitfalls research for: Todobox -- CLI bucket-based task manager / Claude Code addon*
*Researched: 2026-03-06*
