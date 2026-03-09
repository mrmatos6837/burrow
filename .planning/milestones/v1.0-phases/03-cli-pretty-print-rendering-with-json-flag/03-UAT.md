---
status: complete
phase: 03-cli-pretty-print-rendering-with-json-flag
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md]
started: 2026-03-08T16:30:00Z
updated: 2026-03-08T16:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Default Pretty-Print Output
expected: Running `burrow get` (without --json) shows human-readable formatted text instead of raw JSON. Output includes visual formatting like breadcrumbs, sections, and structured layout.
result: pass

### 2. --json Flag Returns Raw JSON
expected: Running any command with `--json` (e.g., `burrow get --json`) returns raw structured JSON output instead of pretty-printed text.
result: pass

### 3. Card Detail View
expected: Running `burrow get <card-id>` shows a card detail with: breadcrumb path at top, title, metadata (id, created/updated age), children listed as a tree with box-drawing lines and right-aligned age column, and body content.
result: pass

### 4. Add Card Mutation Output
expected: Running `burrow add --title "Test Card"` shows a formatted confirmation message with the new card's title and ID visible in human-readable format.
result: pass

### 5. Edit Card Mutation Output
expected: Running `burrow edit <id> --title "New Title"` shows a formatted confirmation with diff-style output showing what changed (old → new values).
result: pass

### 6. Move Card Mutation Output
expected: Running `burrow move <id> --to <parent-id>` shows a formatted confirmation with an arrow indicating source and destination parent titles. Card actually moves to the target parent.
result: pass

### 7. Box-Drawing Tree with Consistent Count Column
expected: When viewing a card with children, the tree uses Unicode box-drawing characters (├── for middle items, └── for last item) with descendant counts shown for ALL items including (0) for leaves, and ages right-aligned.
result: pass

### 8. Root View Breadcrumb
expected: Running `burrow get` (root view) shows "burrow" as the breadcrumb, NOT "burrow > burrow".
result: pass

### 9. Removed Commands
expected: Running `burrow list` or `burrow children` returns an error or "unknown command" message.
result: pass

### 10. Error Formatting
expected: Triggering an error (e.g., `burrow get nonexistent-id`) shows a formatted error with a cross-mark symbol, not raw JSON or stack trace.
result: pass

### 11. Body Truncation
expected: Long body text truncates at 200 chars with "(truncated — use --full for complete body)" hint. --full flag shows complete body.
result: pass

### 12. Archive Filtering with Tags
expected: Default view hides archived cards. --include-archived shows them with [archived] tag. --archived-only shows only archived cards AND also displays [archived] tag.
result: pass

### 13. --depth Flag Recursive Rendering
expected: Running `burrow get <id> --depth 3` expands the tree to show nested children recursively with proper box-drawing indentation at each depth level.
result: pass

### 14. --json on All Commands
expected: Every command (get, add, edit, delete, move, path, archive, unarchive) returns structured JSON with --json flag, both on success and error.
result: pass

## Summary

total: 14
passed: 14
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
