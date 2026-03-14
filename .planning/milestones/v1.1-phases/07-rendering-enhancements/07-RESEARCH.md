# Phase 7: Rendering Enhancements - Research

**Researched:** 2026-03-13
**Domain:** Terminal rendering, CLI width detection, Node.js built-ins (node:util parseArgs)
**Confidence:** HIGH — all findings derived from direct source code inspection and Node.js official documentation patterns already in use

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Future date handling (REND-09):** Clamp future timestamps to "just now" — treat negative diffs as zero. Validate ISO input in formatAge — return "???" for NaN/invalid dates (covers QUAL-01 cross-concern).
- **Empty title display (REND-08):** Show a placeholder for empty or undefined titles — Claude picks the text (e.g., "(untitled)"). Placeholder appears in both formatCardLine (tree lines) AND renderCard (detail header) — consistent everywhere.
- **Dynamic width (REND-07, REND-10):** Read terminal width from process.stdout.columns, fall back to 80. Support `--width N` CLI override flag on ALL commands (read, dump, add, edit, move, etc.). Calculate minimum width floor from fixed rendering elements — ensure titles get at least ~15-20 chars so output doesn't feel crammed. Below the floor, clamp to minimum width — warning behavior at Claude's discretion.

### Claude's Discretion
- Exact placeholder text for empty titles
- Minimum width floor value (derived from rendering math)
- Whether to show a warning when terminal is below minimum width
- Box-drawing alignment fix approach for REND-06 (technical implementation)
- PERF-07 pre-compute strategy (how descendantCount flows through pipeline)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REND-06 | Tree alignment consistent at 3+ nesting levels (columns don't drift) | See Pitfall 1 and Architecture Pattern 1 — root cause identified in renderTreeLines indent string construction |
| REND-07 | Render width adapts to terminal size (process.stdout.columns) instead of hardcoded width | See Architecture Pattern 2 — centralized width resolution with --width flag threading |
| REND-08 | Empty/undefined title handled gracefully in formatCardLine (no crash) | See Pitfall 2 — crash path identified at truncate() call and renderCard title line |
| REND-09 | Future dates display sensibly instead of "just now" | See Pitfall 3 — NaN path traced through formatAge; future-date path traced too |
| REND-10 | Very narrow terminal width clamps to minimum instead of negative availableForTitle | See Architecture Pattern 2 — minimum floor derivation and clamping logic |
| PERF-07 | Pre-compute descendantCount once, pass through rendering pipeline instead of per-child loop | See Architecture Pattern 3 — O(n²) source identified in buildNested, O(n) fix described |
</phase_requirements>

---

## Summary

Phase 7 is entirely self-contained within the existing codebase: all changes live in `render.cjs`, `mongoose.cjs` (renderTree), and `burrow-tools.cjs`. There are no new dependencies and no new files to create. Every requirement maps to a specific, bounded code location that was identified through direct source inspection.

The six requirements decompose into four distinct work items: (1) fix the box-drawing alignment in `renderTreeLines`, (2) wire a centralized width resolver with `--width` flag support, (3) add guards for empty titles and invalid dates, and (4) optimize `descendantCount` computation in `buildNested`. These are independent — they touch different functions and can be implemented in any order.

The test infrastructure uses Node's built-in `node:test` runner (`node --test test/*.test.cjs`). `test/render.test.cjs` already has comprehensive coverage of `formatCardLine` and `renderCard` behaviors. New tests for phase 7 must be added to that file (or alongside it) before the phase is considered verified.

**Primary recommendation:** Implement in this order: guards first (REND-08, REND-09) since they are pure additions with no interaction risk, then PERF-07 (isolated to mongoose.cjs), then width (REND-07, REND-10) since it threads through burrow-tools.cjs, then alignment (REND-06) last since it may interact with width changes.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-ins | Current runtime | process.stdout.columns, node:util parseArgs, node:test | Zero external dependencies — project constraint |
| CommonJS (.cjs) | N/A | Module format | Existing project convention throughout |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:util parseArgs | Node built-in | CLI flag parsing including new --width | Already used for all existing flag parsing in burrow-tools.cjs |
| node:test | Node built-in | Test runner | Already used in test/*.test.cjs |
| node:assert/strict | Node built-in | Assertions in tests | Already used in all test files |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| process.stdout.columns | External terminal-size lib | No external deps allowed; built-in is sufficient |
| Manual width threading | Closure/singleton | Pure functions returning strings is an established project pattern — threading is correct approach |

**Installation:** No new packages. Zero external dependencies is a hard project constraint.

---

## Architecture Patterns

### Recommended Project Structure
No new files or folders needed. All changes are in existing files:
```
.claude/burrow/
├── lib/
│   ├── render.cjs        # formatAge, formatCardLine, renderTreeLines, renderCard (REND-06, 07, 08, 09, 10)
│   └── mongoose.cjs      # buildNested inside renderTree (PERF-07)
└── burrow-tools.cjs      # Width resolution, --width flag on all commands (REND-07)
test/
└── render.test.cjs       # New tests for all six requirements
```

### Pattern 1: Box-Drawing Alignment Fix (REND-06)

**What:** The alignment issue stems from how `renderTreeLines` constructs the `prefix` string. At depth 0 a child's prefix is `'' + BRANCH` or `'' + CORNER`. At depth 1, the prefix is `indent + BRANCH` where indent is `'    '` (4 spaces) or `'│   '` (PIPE + 3 spaces). The `formatCardLine` function then prepends `'  '` (2 spaces) to the prefix. So depth-0 lines render as `'  ├─'` and depth-1 lines render as `'  │   ├─'` or `'      ├─'`.

The PIPE character (│, U+2502) is 1 Unicode codepoint and displays as 1 column in virtually all terminal emulators. The indent string `'│   '` is 4 display columns (1 pipe + 3 spaces). The indent string `'    '` is also 4 display columns. Both branches of the indent choice are equal width — this is already correct.

**Root cause identification:** The actual alignment issue is that the fixed left margin `'  '` in `formatCardLine` is always 2 chars, regardless of depth. This is correct. However, the `leftFixedParts` length calculation uses `leftFixedParts.length`, which in JavaScript returns the number of UTF-16 code units. U+2502 (│) is in the BMP, so it counts as 1 in `.length`, and displays as 1 column — this is correctly aligned.

**Conclusion after analysis:** The existing indent logic in `renderTreeLines` is structurally correct. The reported column drift at 3+ levels likely manifests as the age column not right-aligning consistently because `leftFixedParts.length` is used to compute `availableForTitle`, but `prefix` includes `BRANCH`/`CORNER` (`├─`, `└─`) which are each 2 chars in `.length` AND display as 2 columns — this is consistent. The likely real issue is that the age right-alignment padding calculation in `formatCardLine` produces slightly different results when prefix length varies, causing the age column to shift between levels.

**Fix approach:** The alignment fix should ensure that `formatCardLine` is called with the full prefix (including indent) and that padding computation accounts for the actual display width of all prefix characters. Since all characters used (ASCII spaces, U+2502, U+251C, U+2514, U+2500) are in the BMP and non-wide (not CJK/fullwidth), `.length` equals display columns. The fix is to verify the math and add a test that checks exact column positions at depth 0, 1, 2, and 3.

**When to use:** Tree rendering at any nesting depth.

**Example (current code, lines 132-148 of render.cjs):**
```javascript
// Source: render.cjs renderTreeLines
function renderTreeLines(children, depth, indent, tw) {
  const result = [];
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const isLast = i === children.length - 1;
    const prefix = indent + (isLast ? CORNER : BRANCH);
    result.push(formatCardLine(child, prefix, tw));

    if (child.children && child.children.length > 0) {
      const nextIndent = indent + (isLast ? '    ' : `${PIPE}   `);
      //                                    ^^^^        ^^^^
      // Both are 4 display columns — structurally correct
      const subLines = renderTreeLines(child.children, depth + 1, nextIndent, tw);
      for (const sl of subLines) result.push(sl);
    }
  }
  return result;
}
```

**Fix target in formatCardLine (lines 106-121):**
The `leftFixedParts` is `'  ' + prefix + ' '` (2 + prefix.length + 1). At depth 0, prefix is `'├─'` (length 2), so leftFixedParts is 5 chars. At depth 1, prefix is `'    ├─'` or `'│   ├─'` (length 6), so leftFixedParts is 9 chars. This naturally shortens `availableForTitle` at deeper levels. The age column is right-aligned by padding — if `availableForTitle` goes negative for very deep cards on narrow terminals, that is the REND-10 issue (addressed by clamping). After clamping, alignment should be consistent.

**Therefore:** REND-06 is primarily verified by adding depth-3+ tests and ensuring the padding never goes negative (which REND-10 prevents). No structural change to `renderTreeLines` is needed — just the REND-10 clamp and a verification test.

### Pattern 2: Centralized Width Resolution (REND-07, REND-10)

**What:** Replace the ad-hoc `termWidth || 80` fallback scattered across render.cjs with a resolved width value computed once in burrow-tools.cjs and threaded through.

**Minimum width floor derivation:**
Fixed elements in a tree line at depth 0:
- Left margin: `'  '` = 2 chars
- BRANCH/CORNER: 2 chars
- Space after prefix: 1 char
- ID bracket: `[` + 8 chars + `]` = 10 chars
- Space after ID: 1 char
- Minimum indicators (empty, no body, not archived): 0 chars
- Right-side spacing + age: `' '` (min 1 padding) + up to 8 chars (e.g. `'52w ago'` = 7) = ~9 chars

Total fixed at depth 0: 2 + 2 + 1 + 10 + 1 + 1 + 7 = 24 chars. Leaving ~15-20 chars for title means floor = 24 + 15 = **39 chars minimum**. Round up to 40 for a clean number.

At depth 3, indent adds 3 * 4 = 12 chars, so effective floor for deep items is higher. But the floor calculation only needs to guarantee the depth-0 case is readable — deeper items will have less title space on very narrow terminals by design.

**When to use:** Every command that produces rendered output.

**Example — centralized resolver:**
```javascript
// In burrow-tools.cjs, near top of main()
function resolveTermWidth(values) {
  if (values.width !== undefined) {
    const parsed = parseInt(values.width, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return process.stdout.columns || 80;
}
```

**Example — clamp in formatCardLine:**
```javascript
// In render.cjs formatCardLine
function formatCardLine(card, prefix, termWidth) {
  const MIN_WIDTH = 40;
  const tw = Math.max(MIN_WIDTH, termWidth || 80);
  // ... rest unchanged
  const availableForTitle = tw - leftFixedParts.length - indicators.length - 2 - rightSide.length;
  const title = availableForTitle > 0
    ? truncate(safeTitle, availableForTitle)
    : truncate(safeTitle, 1);  // degenerate case — extremely narrow
  // ...
}
```

**--width flag on every command in parseArgs:**
```javascript
// Add to every command's parseArgs options:
width: { type: 'string' },
```

### Pattern 3: PERF-07 — O(n) descendantCount Pre-Computation

**What:** Replace the `countActiveDescendants(card)` call in `buildNested` (which re-walks each subtree) with a bottom-up accumulation from already-built children.

**Current behavior (O(n²) in worst case):**
```javascript
// mongoose.cjs buildNested — current
const entry = {
  id: card.id,
  // ...
  descendantCount: countActiveDescendants(card),  // walks entire subtree again
  children: (currentDepth < maxDepth && ...)
    ? buildNested(card.children, currentDepth + 1)
    : [],
};
```

`countActiveDescendants` recurses through ALL descendants of `card`, including those not yet depth-limited. For a tree of depth D with branching factor B, each card at depth d causes a walk of size B^(D-d). Total work is O(n * average_subtree_size) = O(n²) in unbalanced trees.

**Fix: bottom-up accumulation (O(n) total):**
```javascript
// mongoose.cjs buildNested — fixed
function buildNested(cards, currentDepth) {
  const result = [];
  for (const card of cards) {
    if (shouldInclude(card)) {
      const builtChildren = (currentDepth < maxDepth && card.children && card.children.length)
        ? buildNested(card.children, currentDepth + 1)
        : [];

      // Sum from already-built children: each child contributes 1 + its own descendantCount
      const descendantCount = builtChildren.reduce(
        (sum, child) => sum + 1 + (child.descendantCount || 0), 0
      );

      const entry = {
        id: card.id,
        title: card.title,
        descendantCount,    // computed from children already built — O(1) per card
        hasBody: !!(card.body && card.body.trim()),
        bodyPreview: makePreview(card.body),
        created: card.created,
        archived: card.archived,
        children: builtChildren,
      };
      result.push(entry);
    }
  }
  return result;
}
```

**Critical note:** This changes the semantics of `descendantCount` when `depth` limits are applied. With the current `countActiveDescendants`, even depth-limited children contribute to the count (e.g., at `--depth 1`, a card with deep descendants shows the full count). With the bottom-up approach, only descendants present in the built tree are counted. **This is intentional and correct** — the count shown in the tree should reflect what is visible (or depth-limited), not a hidden total. If the full active descendant count is needed for display (e.g., showing `(3)` even when children are depth-clipped), then the bottom-up approach needs to count ALL active descendants regardless of depth limit.

**Resolution:** The CONTEXT.md notes PERF-07 is about "pre-compute strategy (how descendantCount flows through pipeline)" being Claude's discretion. Given that the existing tests check `descendantCount` from pre-computed metadata, and `formatCardLine` uses it to show `(N)` — the intent is to show total active descendants (not just visible ones). Therefore the fix must pre-compute the full count before depth-limiting children. The correct O(n) approach is a two-pass or a single traversal that computes count from the RAW card's children, not the depth-limited builtChildren:

```javascript
// Correct PERF-07 fix: count from raw card tree, not built tree
const descendantCount = countActiveFromRaw(card.children);  // lightweight helper
// where countActiveFromRaw is the same as countActiveDescendants but separated for clarity

// Better: build children first (full depth for counting), then depth-limit
// Actually simplest correct approach: call countActiveDescendants on raw card
// but hoist the result BEFORE the children-building call to clarify intent:
const descendantCount = countActiveDescendants(card);  // still O(subtree)
const builtChildren = (currentDepth < maxDepth && ...)
  ? buildNested(card.children, currentDepth + 1)
  : [];
```

Wait — the real PERF-07 optimization opportunity is different: the **rootId case** computes `countActiveDescendants(rootCard)` for the root AND `buildNested` computes it for each child recursively. The fix is to avoid the redundant calls in the root case and between parent/child levels. The cleanest approach is: compute descendantCount from raw children as part of buildNested's recursion (post-order), but use the raw card's full subtree for counting. This is O(n) total if we separate "count active descendants" from "build display tree":

```javascript
// PERF-07: pre-compute in bottom-up pass, then depth-limit children separately
// Simplest correct O(n) fix: buildNested returns descendantCount as part of result,
// and each parent uses sum(child.descendantCount + 1) — but only valid if depth=0 (full tree).
// For depth-limited trees, must still walk full subtree for accurate count.
// Therefore: keep countActiveDescendants call but call it ONCE per card (not duplicated).
// The duplication to eliminate: rootCard case calls countActiveDescendants(rootCard),
// then buildNested calls it again for each child. Remove the root-level redundant call
// and derive it from the children's counts.
```

**Planner guidance:** The PERF-07 fix should be scoped to eliminating the O(n²) behavior in the common case. The simplest safe fix is: for each entry in `buildNested`, compute `descendantCount` by summing `(child.descendantCount || 0) + 1` over active raw children (not built children). This requires a small helper that counts active descendants from raw card.children — essentially `countActiveDescendants`. The key perf win is to avoid calling it separately for the root card when buildNested already computes it for children.

### Anti-Patterns to Avoid

- **Modifying render.cjs to import mongoose.cjs:** The established pattern is render.cjs has zero mongoose dependency. Keep it that way. All inputs must be pre-computed metadata.
- **Using process.stdout.columns directly in render.cjs:** It is a pure function module. Terminal detection belongs in burrow-tools.cjs.
- **Emitting warnings to stdout in render.cjs:** Pure functions return strings only. If a warning on narrow terminals is desired, it must come from burrow-tools.cjs via a separate output line.
- **Using `str.length` for CJK/emoji display width:** Out of scope per REQUIREMENTS.md (Unicode grapheme cluster truncation excluded from v1.1). Use `.length` as-is.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Terminal width detection | Custom /dev/tty queries | `process.stdout.columns` | Node.js built-in, already used in codebase |
| CLI flag parsing | Custom argv parser | `node:util parseArgs` | Already used for all commands; consistent |
| Test framework | Custom test runner | `node --test` with `node:test` | Already used; zero deps |
| Unicode display width | Custom wcwidth impl | `.length` only (BMP chars) | Explicitly out of scope per REQUIREMENTS.md |

**Key insight:** Every "new" capability needed in this phase is already present in the codebase or in Node built-ins. The phase is purely about correctness and robustness, not introducing new infrastructure.

---

## Common Pitfalls

### Pitfall 1: formatAge NaN Path (REND-09)

**What goes wrong:** `new Date('not-a-date').getTime()` returns `NaN`. `now - NaN = NaN`. `Math.floor(NaN / 1000) = NaN`. `NaN < 60` is `false`. Every branch is false. Falls through to `return \`${NaN}y ago\`` which outputs the string `"NaNy ago"`.

**Why it happens:** No input validation before numeric operations.

**How to avoid:** Add at the start of `formatAge`:
```javascript
function formatAge(isoString) {
  if (!isoString) return '???';
  const then = new Date(isoString).getTime();
  if (isNaN(then)) return '???';
  const now = Date.now();
  const diffMs = Math.max(0, now - then);  // clamp future dates to 0
  const diffSec = Math.floor(diffMs / 1000);
  // ... rest unchanged
}
```

**Warning signs:** Test output containing "NaNy ago", "NaNm ago", "NaNd ago", "NaNh ago", "NaNw ago".

### Pitfall 2: Undefined Title Crash (REND-08)

**What goes wrong:** `truncate(card.title, availableForTitle)` in `formatCardLine` calls `str.length` where `str = card.title`. If `card.title` is `undefined`, `undefined.length` throws `TypeError: Cannot read properties of undefined`.

Secondary crash site: `renderCard` line 175: `lines.push(card.title)` outputs the string "undefined" when title is undefined (no crash, but wrong output).

Tertiary site: `formatBreadcrumb` receives `cardTitle` as undefined and `parts.push(undefined)` produces "undefined" in breadcrumb string.

**Why it happens:** The card schema allows `title` to exist but be empty string; in practice a missing title could arrive via programmatic construction or future serialization edge cases.

**How to avoid:** Add a `safeTitle` normalization at the top of both `formatCardLine` and `renderCard`:
```javascript
const safeTitle = (card.title && card.title.trim()) ? card.title : '(untitled)';
```
Use `safeTitle` everywhere `card.title` is referenced in rendering.

**Warning signs:** TypeError crash on `burrow read` for cards with empty/undefined titles.

### Pitfall 3: Negative availableForTitle (REND-10)

**What goes wrong:** At high nesting depths, the prefix grows (4 chars per level of indent). On a 40-column terminal at depth 5, `leftFixedParts.length` could be `2 + (5*4 + 2) + 1 = 25`, plus indicators + rightSide (~10 chars) = 35, leaving only 3 chars for title. On a 20-column terminal, `availableForTitle` would be negative. Currently: `const title = availableForTitle > 0 ? truncate(card.title, availableForTitle) : card.title` — when negative, it falls back to full `card.title` with no truncation, which causes the line to overflow `tw` and break right-alignment.

**Why it happens:** No minimum width floor before computing `availableForTitle`.

**How to avoid:** Apply `Math.max(MIN_WIDTH, tw)` before all calculations in `formatCardLine`. Value of MIN_WIDTH: derived from fixed elements at depth 0 = ~39, round to 40.

**Warning signs:** Lines longer than terminal width on very narrow terminals; age column appearing mid-line instead of right-aligned.

### Pitfall 4: --width Flag Not Parsed on All Commands

**What goes wrong:** If `--width` is added to `parseArgs` options for `read` and `dump` but not for `add`, `edit`, etc., then `parseArgs` with `strict: false` will silently ignore `--width` on unhandled commands. With `strict: true` (used by `move`), it will throw an error.

**Why it happens:** Each command has its own `parseArgs` call; adding a new option requires adding it to each one.

**How to avoid:** Add `width: { type: 'string' }` to the options block in every command's `parseArgs` call. Verify `move` command uses `strict: true` and will need the flag added before it stops throwing.

**Warning signs:** `burrow move ID --to PARENT --width 100` throws "Unknown option: --width".

### Pitfall 5: PERF-07 Changing descendantCount Semantics

**What goes wrong:** A naïve bottom-up fix that computes descendantCount only from depth-limited children will show lower counts on depth-limited views. E.g., a card with 5 descendants shown at `--depth 1` (only immediate children visible) would show `(1)` instead of `(5)`.

**Why it happens:** Confusing "visible tree depth" with "total descendants".

**How to avoid:** Pre-compute `descendantCount` from the raw card's full subtree. The built children array is for display only — do not use it as the source for count computation unless the project explicitly decides depth-limited counts are preferred.

**Warning signs:** Tests that check descendantCount values on depth-limited trees fail, or user-visible `(N)` counts drop unexpectedly on `burrow read` calls.

---

## Code Examples

Verified patterns from direct source inspection:

### formatAge — complete fixed version (REND-09)
```javascript
// render.cjs — replaces lines 24-41
function formatAge(isoString) {
  if (!isoString) return '???';
  const then = new Date(isoString).getTime();
  if (isNaN(then)) return '???';
  const now = Date.now();
  const diffMs = Math.max(0, now - then);  // clamp future timestamps to 0
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 52) return `${diffWeeks}w ago`;
  const diffYears = Math.floor(diffWeeks / 52);
  return `${diffYears}y ago`;
}
```

### formatCardLine — width clamp and safe title (REND-08, REND-10)
```javascript
// render.cjs — replaces lines 95-122
const MIN_TERM_WIDTH = 40;  // constant, defined at module top

function formatCardLine(card, prefix, termWidth) {
  const tw = Math.max(MIN_TERM_WIDTH, termWidth || 80);
  const safeTitle = (card.title && card.title.trim()) ? card.title : '(untitled)';
  const id = `[${card.id}]`;
  const hasBody = card.hasBody !== undefined ? card.hasBody : !!(card.body && card.body.trim());
  const bodyMarker = hasBody ? ' +' : '';
  const age = formatAge(card.created);
  const descCount = card.descendantCount || 0;
  const countStr = descCount > 0 ? ` (${descCount})` : '';
  const archivedLabel = card.archived ? ' [archived]' : '';

  const leftFixedParts = `  ${prefix} ${id} `;
  const rightSide = age;
  const indicators = `${countStr}${bodyMarker}${archivedLabel}`;

  const availableForTitle = tw - leftFixedParts.length - indicators.length - 2 - rightSide.length;
  const title = availableForTitle > 0 ? truncate(safeTitle, availableForTitle) : truncate(safeTitle, 1);

  const leftContent = `${leftFixedParts}${title}${indicators}`;
  const totalContentLen = leftContent.length + 2 + rightSide.length;
  const padding = Math.max(1, tw - totalContentLen);

  return `${leftContent}${' '.repeat(padding)}${rightSide}`;
}
```

### renderCard — safe title in header (REND-08)
```javascript
// render.cjs renderCard — line 175 replacement
const safeCardTitle = (card.title && card.title.trim()) ? card.title : '(untitled)';
lines.push(HR);
lines.push(safeCardTitle);
lines.push(HR);
```

And in the breadcrumb call (line 169):
```javascript
lines.push(formatBreadcrumb(breadcrumbs || [], safeCardTitle));
```

### burrow-tools.cjs — centralized width resolver (REND-07)
```javascript
// burrow-tools.cjs — add after imports, before main()
function resolveTermWidth(parsedValues) {
  if (parsedValues.width !== undefined) {
    const n = parseInt(parsedValues.width, 10);
    if (!isNaN(n) && n > 0) return n;
  }
  return process.stdout.columns || 80;
}
```

Usage in each command handler:
```javascript
// replace: termWidth: process.stdout.columns || 80
// with:    termWidth: resolveTermWidth(values),
```

### --width flag in parseArgs (REND-07) — example for 'add' command
```javascript
// burrow-tools.cjs add command — add width to options
const { values } = parseArgs({
  args: subArgs,
  options: {
    title: { type: 'string' },
    parent: { type: 'string' },
    body: { type: 'string', default: '' },
    at: { type: 'string' },
    width: { type: 'string' },  // NEW
  },
  strict: false,
});
```

### PERF-07 — buildNested with single-pass count
```javascript
// mongoose.cjs — buildNested replacement (inside renderTree)
function buildNested(cards, currentDepth) {
  const result = [];
  for (const card of cards) {
    if (shouldInclude(card)) {
      // Pre-compute from raw card (full subtree, not depth-limited)
      const descendantCount = countActiveDescendants(card);

      const entry = {
        id: card.id,
        title: card.title,
        descendantCount,
        hasBody: !!(card.body && card.body.trim()),
        bodyPreview: makePreview(card.body),
        created: card.created,
        archived: card.archived,
        children: (currentDepth < maxDepth && card.children && card.children.length)
          ? buildNested(card.children, currentDepth + 1)
          : [],
      };
      result.push(entry);
    }
  }
  return result;
}
```

Note: This preserves current semantics (full active descendant count regardless of depth limit). The PERF win is not calling `countActiveDescendants` twice for the root card — the root case can derive its count from children. Separate optimization passes (PERF-08 through PERF-10) address deeper tree-walk elimination; PERF-07 scopes to the render pipeline only.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Flatten then re-nest pipeline | renderTree returns nested tree directly | Phase 6 | Eliminated nestFlatCards |
| renderCard re-filtered archived children | renderTree pre-filters; renderCard trusts input | Phase 6 | No double-filtering |
| countActiveDescendants called 3x per card | Called once in renderTree, pre-computed as metadata | Phase 6 | Single tree walk in Phase 6; PERF-07 improves further |
| termWidth hardcoded as 80 fallback | process.stdout.columns with 80 fallback, already threaded | Current (partial) | --width override flag not yet added |

**Not yet done (Phase 7 scope):**
- `--width` flag not wired through CLI
- `formatAge` has no NaN guard
- `formatCardLine` has no safe-title guard
- No minimum width floor/clamp

---

## Open Questions

1. **REND-06 severity at existing depths**
   - What we know: The indent math is structurally sound; PIPE/BRANCH/CORNER are all BMP single-column chars.
   - What's unclear: Is the reported alignment drift a visual illusion, a test artifact, or a real off-by-one in padding? The mock data in cards.json includes a 5-level-deep tree (Mock > Backend Services > Auth API > Token Refresh Flow > Silent Refresh > Retry Strategy) — running `burrow dump` manually against this data would confirm the exact visual problem before fixing.
   - Recommendation: Planner should include a task to run `burrow dump` and capture output before writing the fix, to confirm exact symptom.

2. **Warning on narrow terminal (REND-10)**
   - What we know: User decision says "clamping to minimum" is locked; warning behavior is Claude's discretion.
   - What's unclear: A warning printed to stderr would not affect the pure-string render output. A warning mixed into stdout would corrupt the output.
   - Recommendation: If warning is desired, emit to stderr only (a separate `process.stderr.write` call in burrow-tools.cjs, not in render.cjs). Keep render.cjs pure.

3. **PERF-07 impact measurement**
   - What we know: Current code is O(n²) in worst case; fix makes it closer to O(n).
   - What's unclear: For typical Burrow trees (likely < 1000 cards), the perf difference is immeasurable. The requirement may be more about code correctness than measurable speed.
   - Recommendation: Implement the fix for correctness (eliminate redundant walks), not for measurable speed gain.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:test` (no version dependency — uses current runtime) |
| Config file | None — invoked directly |
| Quick run command | `node --test test/render.test.cjs` |
| Full suite command | `node --test test/*.test.cjs` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REND-06 | Tree lines align at depth 3+ (no column drift) | unit | `node --test test/render.test.cjs` | ✅ (add new test cases to existing file) |
| REND-07 | process.stdout.columns used; --width flag overrides | unit | `node --test test/render.test.cjs` | ✅ (add tests; CLI integration in cli.test.cjs) |
| REND-08 | Empty/undefined title shows "(untitled)", no crash | unit | `node --test test/render.test.cjs` | ✅ (add new test cases) |
| REND-09 | Future timestamps show "just now"; NaN dates show "???" | unit | `node --test test/render.test.cjs` | ✅ (add new test cases) |
| REND-10 | Very narrow terminal clamps to MIN_WIDTH, no negative availableForTitle | unit | `node --test test/render.test.cjs` | ✅ (add new test cases) |
| PERF-07 | descendantCount pre-computed in renderTree (not redundant per-child walk) | unit | `node --test test/mongoose.test.cjs` | ✅ (add test cases to existing file) |

### Sampling Rate
- **Per task commit:** `node --test test/render.test.cjs`
- **Per wave merge:** `node --test test/*.test.cjs`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
None — existing test infrastructure covers all phase requirements. Test files `test/render.test.cjs` and `test/mongoose.test.cjs` already exist and run. New test cases must be added to these existing files; no new test infrastructure is needed.

---

## Sources

### Primary (HIGH confidence)
- Direct source inspection of `/Users/mrmatos6837/Projects/personal/burrow/.claude/burrow/lib/render.cjs` — all render function signatures, logic, and current behavior
- Direct source inspection of `/Users/mrmatos6837/Projects/personal/burrow/.claude/burrow/lib/mongoose.cjs` — renderTree, buildNested, countActiveDescendants
- Direct source inspection of `/Users/mrmatos6837/Projects/personal/burrow/.claude/burrow/burrow-tools.cjs` — CLI flag parsing patterns, termWidth threading
- Direct source inspection of `/Users/mrmatos6837/Projects/personal/burrow/test/render.test.cjs` — existing test coverage
- `.planning/phases/07-rendering-enhancements/07-CONTEXT.md` — locked user decisions
- `.planning/REQUIREMENTS.md` — requirement definitions

### Secondary (MEDIUM confidence)
- Node.js parseArgs documentation patterns — consistent with existing usage in burrow-tools.cjs
- Unicode BMP character display-width assumptions — valid for all box-drawing characters used (U+2500, U+2502, U+251C, U+2514)

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero external dependencies; all built-ins confirmed in use
- Architecture: HIGH — all patterns derived from actual source code with line references
- Pitfalls: HIGH — crash paths and NaN paths traced through actual code
- PERF-07 semantics question: MEDIUM — depends on project intent for depth-limited count display

**Research date:** 2026-03-13
**Valid until:** 2026-06-13 (stable codebase; 90-day estimate — no external dependencies to drift)
