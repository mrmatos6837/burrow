---
phase: 02-views-and-features
verified: 2026-03-08T10:30:00Z
status: passed
score: 13/13 must-haves verified
---

# Phase 2: Views and Features Verification Report

**Phase Goal:** Simplify the card schema to v2 (flat arrays, body field, migration) and build the universal get command with render tree, archive operations, and CLI aliases.
**Verified:** 2026-03-08T10:30:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

**Plan 01 (Schema Simplification):**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Cards have no position field after creation or move | VERIFIED | addCard creates {id, title, created, archived, body, children:[]} at mongoose.cjs:122-130; moveCard has no position assignment (mongoose.cjs:183-213); test "moved card has no position field" passes |
| 2 | Children containers are plain arrays, not {ordering, cards} objects | VERIFIED | All traversal uses card.children directly (mongoose.cjs:17,42,83,100,248,318); addCard creates children:[] (line 129); no ordering wrapper anywhere in lib/ |
| 3 | Field is body not notes in card schema and CLI flags | VERIFIED | mongoose.cjs editCard uses body (line 148); CLI uses --body flag (burrow-tools.cjs:45,75); no --notes flag anywhere |
| 4 | New card schema is {id, title, created, archived, body, children[]} | VERIFIED | addCard at mongoose.cjs:123-130 creates exactly this shape |
| 5 | Loading old v1 data auto-migrates to v2 format | VERIFIED | warren.cjs load() calls migrate() at line 101; migrate() handles items->cards, notes->body, position deletion, children flattening (lines 64-87); 6 warren tests pass including v1->v2 conversion |

**Plan 02 (Views and Archive):**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 6 | get [id] [--depth N] returns flat render array with depth, descendantCount, hasBody, bodyPreview | VERIFIED | renderTree at mongoose.cjs:279-338 produces {breadcrumbs, cards} flat array; makeEntry at lines 301-312 includes all required fields; CLI wires through handleGet (burrow-tools.cjs:16-22) |
| 7 | get with no args shows root; get <id> shows focused; --depth 0 shows full tree | VERIFIED | renderTree: rootId=null walks data.cards (line 334); rootId set includes card at depth 0 (lines 325-332); depth 0 = Infinity (line 281); CLI default depth=1 (line 180) |
| 8 | Focused subtree get includes ancestry breadcrumbs | VERIFIED | renderTree builds breadcrumbs from getPath().slice(0,-1) at lines 293-296; null for root views (line 292) |
| 9 | Archived cards excluded by default; --include-archived and --archived-only flags work | VERIFIED | shouldInclude filter at mongoose.cjs:285-289; CLI parses both flags (burrow-tools.cjs:167-168); three filter modes tested and passing |
| 10 | archive <id> cascades to all descendants; unarchive restores subtree | VERIFIED | archiveCard calls setArchivedRecursive(card, true) at mongoose.cjs:363-364; unarchiveCard calls setArchivedRecursive(card, false) at line 377; recursive walker at lines 345-352 |
| 11 | Descendant counts only count active (non-archived) cards | VERIFIED | countActiveDescendants at mongoose.cjs:246-256 skips archived children and their subtrees; renderTree uses countActiveDescendants in makeEntry (line 306) |
| 12 | list, dump, children work as aliases to get variants | VERIFIED | burrow-tools.cjs: list calls handleGet with depth:1 (line 189); dump calls handleGet with depth:0 (line 210); children calls handleGet with focused id and depth:1 (line 227) |
| 13 | CLI is stateless -- no persistent working directory | VERIFIED | cwd from process.cwd() at burrow-tools.cjs:27; no state file, no config persistence, no working directory storage |

**Score:** 13/13 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.claude/burrow/lib/warren.cjs` | Load-time v1->v2 migration | VERIFIED | migrate() exported, called in load(), handles all v1 fields |
| `.claude/burrow/lib/mongoose.cjs` | Simplified tree ops + renderTree, archiveCard, unarchiveCard, countActiveDescendants | VERIFIED | All 14 functions exported; no position/ordering/recompact remnants |
| `.claude/burrow/lib/core.cjs` | collectAllIds for plain array children | VERIFIED | Traverses card.children (plain array) at line 47 |
| `.claude/burrow/burrow-tools.cjs` | CLI with --body, get command, archive/unarchive, alias routing | VERIFIED | handleGet shared function; archive/unarchive cases; list/dump/children aliases |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| burrow-tools.cjs | mongoose.cjs | tree.renderTree() for get | WIRED | Line 17: `tree.renderTree(data, id \|\| null, {depth, archiveFilter})` |
| burrow-tools.cjs | mongoose.cjs | tree.archiveCard()/unarchiveCard() | WIRED | Lines 244, 268: called in archive/unarchive cases with save |
| list/dump/children aliases | get handler | handleGet shared function | WIRED | Lines 187-228: all three aliases call handleGet with appropriate params |
| warren.cjs | cards.json | migrate() on load | WIRED | Line 101: `return migrate(data)` in load() |
| mongoose.cjs | card.children | direct array access | WIRED | All traversal uses card.children (plain array), never card.children.cards |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SCHEMA-01 | 02-01 | Drop position field | SATISFIED | No position in addCard/moveCard; delete card.position in migrate |
| SCHEMA-02 | 02-01 | Drop ordering field | SATISFIED | No ordering anywhere; delete data.ordering in migrate |
| SCHEMA-03 | 02-01 | Rename notes to body | SATISFIED | body field in schema, --body CLI flag, notes->body in migrate |
| SCHEMA-04 | 02-01 | Simplified card schema | SATISFIED | Exact shape {id, title, created, archived, body, children[]} |
| RNDR-01 | 02-02 | get is universal view command | SATISFIED | get [id] [--depth N] with handleGet shared function |
| RNDR-02 | 02-02 | Flat render array output | SATISFIED | renderTree returns {breadcrumbs, cards} with correct entry shape |
| RNDR-03 | 02-02 | Depth model | SATISFIED | default=1, --depth N, --depth 0=Infinity; cards at cutoff not walked |
| RNDR-04 | 02-02 | Breadcrumbs on focused subtree | SATISFIED | getPath().slice(0,-1) for focused views, null for root |
| RNDR-05 | 02-02 | Archive filter flags | SATISFIED | active (default), --include-archived, --archived-only |
| ARCH-01 | 02-02 | archive/unarchive cascade | SATISFIED | setArchivedRecursive on card and all descendants |
| ARCH-02 | 02-02 | Active-only descendant counts | SATISFIED | countActiveDescendants skips archived subtrees |
| ARCH-03 | 02-02 | Archived cards keep position with --include-archived | SATISFIED | Archive only sets flag; tree position unchanged; include-archived filter shows all |
| CLI-03 | 02-02 | get replaces list/dump/children as universal view | SATISFIED | list/dump/children are aliases routing through handleGet |
| CLI-04 | 02-02 | Stateless CLI | SATISFIED | cwd from process.cwd(); no persistent state |

No orphaned requirements found. All 14 requirement IDs from plan frontmatter accounted for.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | - | - | - | No anti-patterns detected |

The `return null` patterns in mongoose.cjs are legitimate error handling for not-found cases. The position/ordering/notes references in warren.cjs are exclusively in migration code that converts FROM v1 format.

### Human Verification Required

None required. All functionality is testable programmatically and 103/103 tests pass across all suites (unit + integration).

### Gaps Summary

No gaps found. All 13 observable truths verified. All 14 requirements satisfied. All artifacts exist, are substantive, and are properly wired. Full test suite (103 tests) passes. No anti-patterns, no stubs, no placeholders.

---

_Verified: 2026-03-08T10:30:00Z_
_Verifier: Claude (gsd-verifier)_
