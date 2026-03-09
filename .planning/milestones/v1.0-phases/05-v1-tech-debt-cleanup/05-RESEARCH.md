# Phase 5: v1 Tech Debt Cleanup - Research

**Researched:** 2026-03-09
**Domain:** Documentation reconciliation, bug fix, test maintenance
**Confidence:** HIGH

## Summary

Phase 5 is a cleanup phase with no new features. All work items are precisely defined by the v1.0-MILESTONE-AUDIT.md report. There are six concrete fixes: one code bug (init.cjs data format), two stale tests (renderMutation type string), five stale requirement descriptions, one out-of-scope table contradiction, stale ROADMAP.md progress markers, and one empty stale directory.

Every change is small, isolated, and verifiable. The code changes total approximately 5 lines of modification. The documentation changes are text replacements in REQUIREMENTS.md and ROADMAP.md. No architectural decisions needed.

**Primary recommendation:** Execute as a single plan with 6 discrete tasks, each independently verifiable.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-02 | Cards stored in single cards.json as recursive JSON tree | init.cjs must write `{version:2,cards:[]}` not `[]` |
| DATA-09 | All writes are atomic (write-to-tmp + rename) | init.cjs fix ensures load() receives valid v2 object |
| PP-03 | renderMutation() formats add/edit/delete/move/archive/unarchive | Two tests use 'delete' but render.cjs only handles 'remove' |
| PP-06 | --json flag requirement text is stale | --json was removed in 4e0db55; update requirement text |
| CLI-01 | CLI helper returns structured JSON — text is stale | CLI now returns pretty-print by default; update text |
| RNDR-01 | `get` command text is stale | CLI command is `read` not `get`; update text |
| CLI-03 | `get` replaces list/dump/children — text is stale | CLI command is `read`; update text |
| CMDS-03 | /burrow:show reference is stale | Command is /burrow:read; also line 72 note says /burrow:delete but command is /burrow:remove |
</phase_requirements>

## Standard Stack

Not applicable — this phase modifies existing files only. No new libraries or dependencies.

### Tools Used
| Tool | Purpose |
|------|---------|
| `node --test .claude/burrow/test/` | Verify all 134 tests pass after fixes |
| `node .claude/burrow/bin/init.cjs` | Verify init flow writes correct format |

## Architecture Patterns

No new architecture. All changes are to existing files.

### Files to Modify

| File | Change | Lines |
|------|--------|-------|
| `.claude/burrow/bin/init.cjs` | Line 85: `'[]\n'` -> `'{"version":2,"cards":[]}\n'` | 1 line |
| `.claude/burrow/test/render.test.cjs` | Lines 304, 312: `'delete'` -> `'remove'` and update assertion text | 2 tests |
| `.planning/REQUIREMENTS.md` | Lines 30, 51, 59, 61, 62, 72, 109 | ~7 lines |
| `.planning/ROADMAP.md` | Lines 16, 18: uncheck -> check Phase 2 and Phase 4 | 2 lines |

### Directories to Remove
| Path | Reason |
|------|--------|
| `.planning/phases/04-cli-pretty-print-rendering-with-json-flag/` | Empty stale directory, contains only `.gitkeep` |

## Don't Hand-Roll

Not applicable — no custom solutions needed. All changes are direct text edits.

## Common Pitfalls

### Pitfall 1: Incomplete requirement text updates
**What goes wrong:** Updating only the requirement title but missing the CMDS-03 note on line 72 that also references stale names.
**How to avoid:** Cross-reference every occurrence. The audit identifies 5 stale requirements but line 72's note about `/burrow:delete` is a separate line from CMDS-03 itself.

### Pitfall 2: Test assertion text mismatch after rename
**What goes wrong:** Changing `'delete'` to `'remove'` in the renderMutation call but forgetting the assertion strings that check for `'Deleted'` in the output.
**How to avoid:** The render.cjs `case 'remove'` outputs `"Removed"` not `"Deleted"`. Update both the type argument AND the assertion strings:
- `renderMutation('delete', ...)` -> `renderMutation('remove', ...)`
- `assert.ok(result.includes('Deleted'))` -> `assert.ok(result.includes('Removed'))`

### Pitfall 3: find command scope confusion
**What goes wrong:** Removing the `find` command or adding it as a requirement when it should stay as-is.
**How to avoid:** The Out of Scope table says "Search command" not "find command". The `find` command does title/body matching in the existing tree -- it is a lightweight lookup, not a query engine. Reconciliation means updating the Out of Scope table description to clarify that `find` (simple title match) exists while general search/query is out of scope.

### Pitfall 4: Forgetting JSON formatting in init.cjs
**What goes wrong:** Writing `{version:2,cards:[]}` as a JS object literal instead of valid JSON.
**How to avoid:** The string must be valid JSON: `'{"version":2,"cards":[]}\n'`. The `load()` function calls `JSON.parse()`.

## Code Examples

### Fix 1: init.cjs data format (line 85)

**Current (broken):**
```javascript
fs.writeFileSync(dataFile, '[]\n');
```

**Fixed:**
```javascript
fs.writeFileSync(dataFile, JSON.stringify({ version: 2, cards: [] }) + '\n');
```

### Fix 2: render.test.cjs stale tests (lines 304-316)

**Current (broken):**
```javascript
it('renders delete as one-liner', () => {
    const result = renderMutation('delete', { id: 'e5f6g7h8', title: 'API timeout', descendantCount: 2 }, {});
    assert.ok(result.includes('\u2713 Deleted'));
    // ...
});

it('omits child count when zero for delete', () => {
    const result = renderMutation('delete', { id: 'e5f6g7h8', title: 'API timeout', descendantCount: 0 }, {});
    assert.ok(result.includes('\u2713 Deleted'));
    // ...
});
```

**Fixed:**
```javascript
it('renders remove as one-liner', () => {
    const result = renderMutation('remove', { id: 'e5f6g7h8', title: 'API timeout', descendantCount: 2 }, {});
    assert.ok(result.includes('\u2713 Removed'));
    // ...
});

it('omits child count when zero for remove', () => {
    const result = renderMutation('remove', { id: 'e5f6g7h8', title: 'API timeout', descendantCount: 0 }, {});
    assert.ok(result.includes('\u2713 Removed'));
    // ...
});
```

### Fix 3: REQUIREMENTS.md text updates

| Line | Current Text | Updated Text |
|------|-------------|-------------|
| 30 | `RNDR-01: get is the universal view command -- get [id] [--depth N]` | `RNDR-01: read is the universal view command -- read [id] [--depth N]` |
| 51 | `PP-06: --json flag on any command bypasses render and returns raw structured JSON` | `PP-06: Pretty-print is the only output mode -- no --json flag (removed in v1.0)` |
| 59 | `CLI-01: CLI helper (burrow-tools.cjs) returns structured JSON for all operations` | `CLI-01: CLI helper (burrow-tools.cjs) returns pretty-printed text for all operations` |
| 61 | `CLI-03: get replaces list/dump/children as universal view` | `CLI-03: read replaces list/dump/children as universal view -- aliases for backward compat (list = read no args, dump = read --depth 0, children = read <id>)` |
| 62 | `CMDS-03: /burrow:show shortcut for viewing tree` | `CMDS-03: /burrow:read shortcut for viewing tree at specified depth/focus` |
| 72 | Note referencing `/burrow:delete` | Update to reference `/burrow:remove` |
| 109 | `Search command` in Out of Scope | Clarify: `Search / query engine` with note that `find` (simple title match) exists as a lightweight lookup |

### Fix 4: ROADMAP.md Phase 2 and Phase 4 checkboxes

**Current:**
```markdown
- [ ] **Phase 2: Schema, Views, and Archive** ...
- [ ] **Phase 4: Agent Interface** ...
```

**Fixed:**
```markdown
- [x] **Phase 2: Schema, Views, and Archive** ...
- [x] **Phase 4: Agent Interface** ...
```

Also update the plan checkboxes within Phase 2 and Phase 4 details sections:
- Phase 2 plans 02-01 and 02-02: `[ ]` -> `[x]`
- Phase 4 plans 04-01 and 04-02: `[ ]` -> `[x]`

### Fix 5: Remove stale directory

```bash
rm -rf .planning/phases/04-cli-pretty-print-rendering-with-json-flag/
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (node:test) |
| Config file | None (uses node --test directly) |
| Quick run command | `node --test .claude/burrow/test/render.test.cjs` |
| Full suite command | `node --test .claude/burrow/test/` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-02 | init.cjs writes valid v2 JSON | manual-smoke | `node -e "require('./.claude/burrow/bin/init.cjs')"` with temp dir | No dedicated test |
| DATA-09 | Atomic writes unaffected by init fix | unit | `node --test .claude/burrow/test/warren.test.cjs` | Existing |
| PP-03 | renderMutation('remove') works | unit | `node --test .claude/burrow/test/render.test.cjs` | Existing (stale) |
| PP-06 | Documentation text only | manual-only | Visual inspection | N/A |
| CLI-01 | Documentation text only | manual-only | Visual inspection | N/A |
| RNDR-01 | Documentation text only | manual-only | Visual inspection | N/A |
| CLI-03 | Documentation text only | manual-only | Visual inspection | N/A |
| CMDS-03 | Documentation text only | manual-only | Visual inspection | N/A |

### Sampling Rate
- **Per task commit:** `node --test .claude/burrow/test/render.test.cjs` (quick: render tests only)
- **Per wave merge:** `node --test .claude/burrow/test/` (full suite: all 134 tests)
- **Phase gate:** Full suite green (134/134 pass, 0 failures)

### Wave 0 Gaps
None -- existing test infrastructure covers all testable phase requirements. The two failing tests ARE the fix target (not missing tests).

## Open Questions

1. **find command reconciliation approach**
   - What we know: `find` exists in CLI (line 452 of burrow-tools.cjs), Out of Scope table says "Search command"
   - What's unclear: Whether to add `find` as a requirement, update Out of Scope wording, or both
   - Recommendation: Update Out of Scope row to say "Search / query engine" and add a note clarifying `find` is a lightweight title-match lookup, not a search engine. Do NOT add a new requirement -- find is incidental tooling, not a user-facing feature worth formalizing.

## Sources

### Primary (HIGH confidence)
- `.planning/v1.0-MILESTONE-AUDIT.md` -- definitive list of all gaps
- `.claude/burrow/bin/init.cjs` -- confirmed line 85 writes `[]`
- `.claude/burrow/test/render.test.cjs` -- confirmed lines 304/312 use `'delete'`
- `.claude/burrow/lib/render.cjs` -- confirmed `case 'remove'` on line 293
- `.claude/burrow/lib/warren.cjs` -- confirmed `load()` returns `{version:2,cards:[]}` on missing file
- `.planning/REQUIREMENTS.md` -- confirmed stale text on identified lines
- `.planning/ROADMAP.md` -- confirmed unchecked boxes for Phase 2 and 4

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all existing code
- Architecture: HIGH -- no architectural changes, pure text/line edits
- Pitfalls: HIGH -- all issues precisely identified with line numbers

**Research date:** 2026-03-09
**Valid until:** No expiration -- this is internal project cleanup with fixed scope
