---
status: diagnosed
trigger: "children count (N) only appears on cards with descendants, causing column misalignment in pretty-print tree view"
created: 2026-03-08T00:00:00Z
updated: 2026-03-08T00:00:00Z
---

## Current Focus

hypothesis: formatCardLine conditionally includes count string, causing variable-width right column
test: read formatCardLine logic
expecting: conditional inclusion of count in right-side content
next_action: return diagnosis

## Symptoms

expected: consistent column alignment across all child card lines in tree view
actual: cards with descendants show `(N)` suffix, cards without descendants omit it entirely, causing ragged right column
errors: none (cosmetic issue)
reproduction: run `burrow show` on a card whose children have mixed descendant counts (some zero, some non-zero)
started: since render.cjs was implemented

## Eliminated

(none needed - root cause found on first pass)

## Evidence

- timestamp: 2026-03-08T00:00:00Z
  checked: render.cjs lines 118-121 (formatCardLine)
  found: |
    const descCount = card.descendantCount !== undefined
      ? card.descendantCount
      : countActiveDescendants(card);
    const countStr = descCount > 0 ? `  (${descCount})` : '';
  implication: When descCount is 0, countStr is empty string. This means the right-side content has different widths for cards with vs without descendants.

- timestamp: 2026-03-08T00:00:00Z
  checked: render.cjs lines 124-139 (padding calculation)
  found: |
    rightSide = `${age}${countStr}` -- variable width due to conditional countStr
    padding is calculated as tw - totalContentLen, which adapts to content width
    But rightSide itself has inconsistent width across sibling lines
  implication: The padding pushes age to the right edge, but the count suffix (or lack thereof) creates ragged alignment because each line's rightSide has a different length.

## Resolution

root_cause: |
  In formatCardLine (render.cjs line 121), the descendant count string is conditionally omitted
  when descCount is 0: `const countStr = descCount > 0 ? '  (${descCount})' : '';`

  This causes two alignment problems:
  1. The right column (`rightSide = age + countStr`) has inconsistent width across sibling lines
  2. Cards with counts like `(2)` get 6 extra characters that cards without counts don't have

  The padding calculation (line 137) right-aligns the entire rightSide block against terminal width,
  but since rightSide varies in length, the age strings end up at different horizontal positions
  across sibling lines.

fix: (not applied - diagnosis only)
verification: (not applicable)
files_changed: []
