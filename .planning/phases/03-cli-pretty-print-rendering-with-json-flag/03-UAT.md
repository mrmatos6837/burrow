---
status: complete
phase: 03-cli-pretty-print-rendering-with-json-flag
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md]
started: 2026-03-08T15:10:00Z
updated: 2026-03-08T15:47:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Default Pretty-Print Output
expected: Running a command like `burrow get` (without --json) shows human-readable formatted text instead of raw JSON. Output includes visual formatting like breadcrumbs, sections separated by lines, and structured layout.
result: pass

### 2. --json Flag Returns Raw JSON
expected: Running any command with `--json` (e.g., `burrow get --json`) returns raw structured JSON output instead of pretty-printed text. The JSON contract matches what all commands previously returned by default.
result: pass

### 3. Card Detail View
expected: Running `burrow get <card-id>` shows a card detail with: breadcrumb path at top, title, metadata (id, created/updated age), children listed as a tree with box-drawing lines and right-aligned age column, and body content.
result: pass

### 4. Add Card Mutation Output
expected: Running `burrow add --title "Test Card"` shows a formatted confirmation message indicating the card was created, with the new card's title and ID visible in a human-readable format (not JSON).
result: pass

### 5. Edit Card Mutation Output
expected: Running `burrow edit <id> --title "New Title"` shows a formatted confirmation with diff-style output showing what changed (old → new values).
result: pass

### 6. Move Card Mutation Output
expected: Running `burrow move <id> --to <parent-id>` shows a formatted confirmation with an arrow indicating source and destination parent titles.
result: issue
reported: "Move shows 'root → root' instead of correct destination parent title, and card didn't actually move to the target parent"
severity: major

### 7. Box-Drawing Tree with Age Column
expected: When viewing a card with children, the tree uses Unicode box-drawing characters (├── for middle items, └── for last item) with ages right-aligned in a column.
result: issue
reported: "Children count (N) only appears on some items, making the column inconsistent and misaligned"
severity: cosmetic

### 8. Root View Breadcrumb
expected: Running `burrow get` (root view) shows "burrow" as the breadcrumb, NOT "burrow > burrow".
result: pass

### 9. Removed Commands
expected: Running `burrow list` or `burrow children` returns an error or "unknown command" message. These commands have been removed.
result: pass

### 10. Error Formatting
expected: Triggering an error (e.g., `burrow get nonexistent-id`) shows a formatted error with a cross-mark symbol, not a raw JSON error or stack trace.
result: pass

### 11. Body Truncation
expected: Long body text truncates at 200 chars with "(truncated — use --full for complete body)" hint. --full flag shows complete body.
result: pass

### 12. Archive Filtering
expected: Default view hides archived cards. --include-archived shows them with [archived] tag. --archived-only shows only archived cards.
result: issue
reported: "--archived-only doesn't show the [archived] tag on cards, inconsistent with --include-archived"
severity: cosmetic

### 13. --depth Flag on Pretty-Print
expected: Running `burrow get <id> --depth 3` expands the tree to show nested children up to the specified depth level.
result: issue
reported: "--depth flag doesn't affect pretty-print output, always shows only immediate children"
severity: major

### 14. --json on All Commands
expected: Every command (get, add, edit, delete, move, path, archive, unarchive) returns structured JSON with --json flag, both on success and error.
result: pass

## Summary

total: 14
passed: 10
issues: 4
pending: 0
skipped: 0

## Gaps

- truth: "Move shows correct source and destination parent titles"
  status: failed
  reason: "User reported: Move shows 'root → root' instead of correct destination parent title, and card didn't actually move to the target parent"
  severity: major
  test: 6
  artifacts: []
  missing: []

- truth: "Children count column is consistent and aligned across all tree items"
  status: failed
  reason: "User reported: Children count (N) only appears on some items, making the column inconsistent and misaligned"
  severity: cosmetic
  test: 7
  artifacts: []
  missing: []

- truth: "Archived cards always show [archived] tag regardless of filter mode"
  status: failed
  reason: "User reported: --archived-only doesn't show the [archived] tag on cards, inconsistent with --include-archived"
  severity: cosmetic
  test: 12
  artifacts: []
  missing: []

- truth: "--depth flag expands nested children in pretty-print tree view"
  status: failed
  reason: "User reported: --depth flag doesn't affect pretty-print output, always shows only immediate children"
  severity: major
  test: 13
  artifacts: []
  missing: []
