---
status: complete
phase: 02-views-and-features
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md]
started: 2026-03-08T11:00:00Z
updated: 2026-03-08T11:05:00Z
---

## Current Test

[testing complete]

## Tests

### 1. V1 to V2 Schema Migration
expected: Load a v1-format data file (with `notes`, nested `children: {ordering, cards}`, `position` fields). After warren.cjs load(), data is transparently migrated — `notes` becomes `body`, `children` becomes plain array, no `position`/`ordering`. Running `list` on v1 data works without errors.
result: pass

### 2. Add Card with --body Flag
expected: Run `add --title "Test Card" --body "content"`. Card is created with body field. Running `get <id>` shows the card with `hasBody: true` and `bodyPreview` content.
result: pass

### 3. Get Command with Depth Control
expected: `get <id>` (default depth 1) shows card + direct children. `get <id> --depth 0` shows full tree at all levels. `get <id> --depth 2` shows two levels deep. Output is flat array with `depth`, `descendantCount`, `hasBody` fields.
result: pass

### 4. CLI Aliases (list, dump, children)
expected: `list` shows root cards. `dump` shows full tree. `children <id>` shows focused card's children. All three route through shared handleGet and produce consistent output.
result: pass

### 5. Archive a Card with Cascade
expected: `archive <id>` on a card with children archives the card AND all descendants. Card disappears from normal `list`. Visible with `--include-archived` showing `archived: true` on all.
result: pass

### 6. Unarchive a Card with Cascade
expected: `unarchive <id>` on archived card with children unarchives all descendants. They reappear in normal `list` output with `archived: false`.
result: pass

### 7. Archive Filtering Modes
expected: Default (active only) hides archived. `--include-archived` shows all with archived flag. `--archived-only` shows only archived cards. `countActiveDescendants` skips archived subtrees entirely.
result: pass

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
