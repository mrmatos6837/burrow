---
status: diagnosed
trigger: "burrow move <id> --to <parent-id> shows root->root and card doesn't move"
created: 2026-03-08T00:00:00Z
updated: 2026-03-08T00:00:00Z
---

## Current Focus

hypothesis: CLI move command parses --parent but user passes --to; newParentId is always null
test: confirmed by reading code
expecting: --to flag never parsed, defaults to null (root)
next_action: return diagnosis

## Symptoms

expected: card moves to target parent, output shows correct source/dest titles
actual: card stays at root, output shows "root -> root"
errors: none (silently wrong)
reproduction: `burrow move <id> --to 30059067`
started: since CLI was written

## Eliminated

(none needed - root cause found on first read)

## Evidence

- timestamp: 2026-03-08
  checked: burrow-tools.cjs move case (lines 193-248)
  found: parseArgs options only defines `parent` (line 198), not `to`. User passes `--to`, which is ignored by strict:false.
  implication: newParentId is ALWAYS null because values.parent is always undefined when --to is used

- timestamp: 2026-03-08
  checked: newParentId derivation logic (lines 209-216)
  found: When values.parent is undefined (line 210), newParentId is set to null. This means "move to root".
  implication: The card is "moved" from root to root (a no-op), explaining both the wrong display AND the card not actually moving.

## Resolution

root_cause: |
  TWO bugs, same root cause:

  BUG 1 (card doesn't move): The CLI move command defines `--parent` as the option name
  (line 198: `parent: { type: 'string' }`), but the user passes `--to`. Since parseArgs
  is called with `strict: false`, `--to` is silently ignored rather than raising an error.
  `values.parent` is always `undefined`, so `newParentId` is always set to `null` (root).
  The card is "moved" from root to root -- a no-op.

  BUG 2 (shows "root -> root"): This is a direct consequence of Bug 1. Since newParentId
  is null, line 238 evaluates `newParentId` as falsy and falls through to 'root'. The source
  parent is also root (card was already there), so you get "root -> root".

fix: (not applied - diagnosis only)
verification: (pending)
files_changed: []
