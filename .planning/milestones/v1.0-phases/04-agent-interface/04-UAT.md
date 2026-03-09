---
status: complete
phase: 04-agent-interface
source: [04-01-SUMMARY.md, 04-02-SUMMARY.md]
started: 2026-03-08T22:00:00Z
updated: 2026-03-09T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. /burrow NL Command
expected: Running `/burrow add a card called "Test Card" under root` (or similar natural language) processes the request and executes the correct CLI operation. The agent parses intent, identifies the operation, and runs it.
result: pass

### 2. /burrow:add — Add a Card
expected: Running `/burrow:add "My Card"` creates a new card at root level. Output shows the created card with its ID.
result: pass

### 3. /burrow:show — View Cards
expected: Running `/burrow:show` (no args) displays root-level cards. Running `/burrow:show <id>` displays that card and its children with pretty-printed output.
result: pass

### 4. /burrow:edit — Edit a Card
expected: Running `/burrow:edit <id> --title "New Title"` updates the card's title. Output confirms the change.
result: pass

### 5. /burrow:delete — Delete with Confirmation
expected: Running `/burrow:delete <id>` first shows the target card (preview), then asks for confirmation before deleting. Card is removed after confirmation.
result: pass

### 6. /burrow:move — Move a Card
expected: Running `/burrow:move <id> --parent <target-id>` moves the card under the target. The card appears as a child of the new parent.
result: pass

### 7. /burrow:archive and /burrow:unarchive
expected: Running `/burrow:archive <id>` hides the card from normal views. Running `/burrow:unarchive <id>` restores it. Archived cards don't appear in `/burrow:show`.
result: pass

### 8. /burrow:dump — Full Tree View
expected: Running `/burrow:dump` displays the entire card tree at all depths with hierarchical indentation.
result: pass

### 9. /burrow:help — Command Reference
expected: Running `/burrow:help` displays a formatted table of all available commands with descriptions and usage examples.
result: pass

## Summary

total: 9
passed: 9
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
