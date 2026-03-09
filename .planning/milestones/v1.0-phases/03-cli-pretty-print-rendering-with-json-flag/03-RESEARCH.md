# Phase 3: CLI Pretty-Print Rendering - Research

**Researched:** 2026-03-08
**Domain:** CLI text rendering, Node.js built-in string formatting
**Confidence:** HIGH

## Summary

Phase 3 adds a human-readable rendering layer to every CLI command. The current behavior (raw JSON output) becomes opt-in via `--json`. A new `lib/render.cjs` module handles all text formatting -- it receives structured data and returns plain-text strings. No external dependencies; this is pure string manipulation using Node.js built-ins.

The user has provided exhaustive output specifications in CONTEXT.md including exact card detail format, tree listing format, mutation confirmations, error format, and breadcrumb style. The implementation is straightforward: intercept output in `burrow-tools.cjs` before `core.output()`, route through render functions unless `--json` is set.

**Primary recommendation:** Build `lib/render.cjs` as a pure-function module (input data, return string). Refactor `burrow-tools.cjs` to parse `--json` globally, then route each command's result through the appropriate render function or `core.output()`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Everything is a card. Root is a card. Same card detail format used everywhere.
- The tool is dumb -- no warnings, no confirmation logic, no safety checks. That's the agent's job.
- `--json` always returns complete, untruncated data. Limits and truncation are rendering concerns only.
- Card detail section order: header (breadcrumb) > title > metadata > children > body
- Sections delimited by horizontal rules (40-char `────────`)
- Children shown above body (structure before content)
- Children always shown: cards listed or "(none)"
- Body always shown: content or "(empty)"
- Body capped at ~200 chars with "...(truncated -- use --full for complete body)"
- `--full` flag shows complete body without truncation
- Root ID shown as `(root)` -- special marker
- Breadcrumb format: `burrow > ancestors > card name`
- Box-drawing lines: `├─`, `└─`, `│`
- Each card line: `[8-char ID] title *  age  (N)`
- `*` dot marker for cards with body content
- `(N)` descendant count at depth cutoff
- Right-aligned age column
- Age format: "Xd ago", "Xw ago", "Xh ago", "just now"
- Archived cards marked with `[archived]` label via `--include-archived`
- Terminal width: `process.stdout.columns` fallback 80
- Long titles truncated with `...`
- Mutation formats: add = full card detail, edit = diff + card detail, delete/move/archive/unarchive = compact one-liner
- Error format: `x message` (human), `{success: false, error, code}` (JSON)
- Plain text only -- no ANSI color codes. Symbols provide visual structure.
- Remove `list` and `children` commands
- Keep `dump` as alias for `get --depth 0`
- New `lib/render.cjs` module -- single dedicated module
- Exports: `renderCard()`, `renderMutation()`, `renderPath()`, `renderError()`
- Functions return strings (not write to stdout) -- testable
- Separate `test/render.test.cjs` for unit tests

### Claude's Discretion
- Exact spacing and padding within the card format
- How to handle edge cases not explicitly covered
- Render function internal structure (helpers, shared utilities)
- Age calculation thresholds (when does "hours" become "days"?)

### Deferred Ideas (OUT OF SCOPE)
- Color/ANSI support (could add later with `--color` flag)
- Distinct exit codes per error type (keep 0/1)
- Pagination for very large outputs
</user_constraints>

<phase_requirements>
## Phase Requirements

Phase 3 has no pre-existing requirement IDs in REQUIREMENTS.md -- these are new requirements defined by CONTEXT.md decisions. The planner should define IDs (e.g., PP-01 through PP-XX) during planning.

| Behavior | Research Support |
|----------|-----------------|
| Human-readable output by default for all commands | render.cjs module with per-type render functions |
| `--json` flag bypasses rendering, returns raw JSON | Global flag parsing in burrow-tools.cjs before command switch |
| Card detail format with breadcrumbs, metadata, children, body | `renderCard()` consumes `renderTree()` output + `getPath()` ancestry |
| Tree listing with box-drawing, age, descendant counts | `renderCard()` children section, reusable tree line formatter |
| Mutation confirmations (add/edit/delete/move/archive) | `renderMutation()` with type-specific formatting |
| Body truncation with `--full` override | `renderCard()` respects `full` flag, ~200 char cap |
| Remove `list` and `children` commands | CLI router cleanup |
| Error rendering | `renderError()` for `x message` format |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-ins | 22.x | `util.parseArgs`, `process.stdout.columns` | Zero-dependency constraint (project rule) |
| `node:test` | built-in | Test runner | Already used in existing test files |
| `node:assert/strict` | built-in | Test assertions | Already used in existing tests |

### Supporting
No additional libraries needed. This phase is pure string formatting.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual string building | chalk, cli-table3 | Project requires zero npm dependencies |
| Manual column alignment | columnify | Project requires zero npm dependencies |

**Installation:** None required -- zero dependencies.

## Architecture Patterns

### Recommended Project Structure
```
.claude/burrow/
├── burrow-tools.cjs    # CLI router (modify: global --json, route to render)
├── lib/
│   ├── core.cjs        # output(), errorOut() (keep for --json path)
│   ├── mongoose.cjs    # Tree operations (unchanged)
│   ├── warren.cjs      # Storage (unchanged)
│   └── render.cjs      # NEW: all rendering logic
└── test/
    ├── cli.test.cjs    # Integration tests (update for new output format)
    ├── mongoose.test.cjs
    ├── warren.test.cjs
    └── render.test.cjs # NEW: unit tests for render functions
```

### Pattern 1: Render Module as Pure Functions
**What:** `render.cjs` exports functions that take structured data and return formatted strings. No side effects, no stdout writes, no process.exit calls.
**When to use:** Always -- this is the locked decision.

```javascript
// lib/render.cjs
function renderCard(card, breadcrumbs, opts) {
  // card: full card object with children
  // breadcrumbs: array of {id, title} ancestors
  // opts: { full: boolean, termWidth: number, archiveFilter: string }
  // returns: formatted string
}

function renderMutation(type, result, breadcrumbs) {
  // type: 'add' | 'edit' | 'delete' | 'move' | 'archive' | 'unarchive'
  // result: command-specific result object
  // breadcrumbs: ancestry for context (add/edit need it)
  // returns: formatted string
}

function renderPath(pathArray) {
  // pathArray: [{id, title}, ...]
  // returns: breadcrumb line string
}

function renderError(message) {
  // returns: "✗ message"
}
```

### Pattern 2: Global --json Flag in CLI Router
**What:** Parse `--json` from `process.argv` before the command switch. If set, all output goes through `core.output()` (current behavior). If not set, output goes through `render.*` functions.
**When to use:** In `burrow-tools.cjs` main().

```javascript
function main() {
  // Parse --json globally (before command-specific parsing)
  const jsonMode = process.argv.includes('--json');
  // Remove --json from argv so it doesn't interfere with command parsing
  const cleanArgv = process.argv.filter(a => a !== '--json');

  const command = cleanArgv[2];
  const subArgs = cleanArgv.slice(3);

  // ... command switch ...
  // Each case: produce result, then either core.output(result) or render
}
```

### Pattern 3: Data Flow for Get Command
**What:** The `get` command needs to produce both the tree data AND full card data for the card detail format. Currently `renderTree()` returns a flat array -- the detail view needs the actual card object with children and body.
**When to use:** For `get` with a specific card ID (card detail view).

The current `renderTree()` returns `{breadcrumbs, cards}` where cards is a flat array with `{id, title, depth, descendantCount, hasBody, bodyPreview, created, archived}`. For the card detail view, the render function also needs:
- Full body text (not just preview) -- for body section
- The card's direct children as objects -- for children listing
- Path/breadcrumbs -- already available from `renderTree()` or `getPath()`

**Recommendation:** For card detail view, fetch the card via `findById()` separately and pass it to `renderCard()` along with breadcrumbs. For tree listing within the card detail (the children section), use the existing `renderTree()` flat array filtered to depth 1.

### Pattern 4: Age Formatting (Claude's Discretion)
**What:** Convert ISO timestamps to human-readable relative ages.
**Recommended thresholds:**
- < 60 seconds: "just now"
- < 60 minutes: "Xm ago"
- < 24 hours: "Xh ago"
- < 7 days: "Xd ago"
- < 52 weeks: "Xw ago"
- >= 52 weeks: "Xy ago"

### Pattern 5: Column Alignment for Tree Lines
**What:** Right-align age column across all cards in a tree listing.
**How:** Two-pass approach:
1. First pass: compute all line components (prefix + id + title, age string, descendant count)
2. Calculate max left-column width
3. Second pass: pad each line to align age column

```javascript
// Card line format: [8-char ID] title •  age  (N)
// With terminal width constraint, title gets truncated
function formatCardLine(card, prefix, termWidth) {
  const idPart = `[${card.id}]`;
  const bodyDot = card.hasBody ? ' \u2022' : '  ';
  const agePart = formatAge(card.created);
  const descPart = card.descendantCount > 0 ? `  (${card.descendantCount})` : '';

  // Fixed-width sections: prefix + id + bodyDot + age + desc
  // Title gets remaining space
  const fixedWidth = prefix.length + idPart.length + 1 + bodyDot.length + agePart.length + descPart.length + 2;
  const titleWidth = termWidth - fixedWidth;
  const title = truncateTitle(card.title, titleWidth);

  return `${prefix}${idPart} ${title}${bodyDot}${padLeft(agePart, ageColumnWidth)}${descPart}`;
}
```

### Anti-Patterns to Avoid
- **Writing to stdout from render functions:** Render functions return strings. Only the CLI router writes to stdout. This keeps them testable.
- **Coupling render to data loading:** Render functions receive data, never load it themselves.
- **Mixing --json logic into render functions:** The --json check happens once in the router, not in each render function.
- **Using ANSI codes:** Locked decision -- plain text only with Unicode symbols.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Argument parsing | Custom argv parser | `util.parseArgs` (built-in) | Already used, handles `--json`, `--full` cleanly |
| Terminal width | Manual COLUMNS env check | `process.stdout.columns \|\| 80` | Standard Node.js API, handles redirected output |

**Key insight:** This phase IS hand-rolling a renderer, which is appropriate because the output format is bespoke and simple enough that a library would add more complexity than it removes. The zero-dependency constraint also mandates it.

## Common Pitfalls

### Pitfall 1: Forgetting to Strip --json from subArgs
**What goes wrong:** `--json` gets passed to `parseArgs` for individual commands, which may not declare it, causing `ERR_PARSE_ARGS_UNKNOWN_OPTION` with `strict: true`.
**Why it happens:** Global flags mixed with command-specific flags.
**How to avoid:** Filter `--json` from argv before passing to command parsers. Several commands already use `strict: false` which would mask this, but it's cleaner to strip it.
**Warning signs:** "Unknown option" errors when using `--json` with specific commands.

### Pitfall 2: Age Calculation Timezone Issues
**What goes wrong:** Relative age shows wrong values because of timezone mismatch.
**Why it happens:** `new Date()` and ISO strings both use UTC, but off-by-one day errors can occur if comparing dates rather than timestamps.
**How to avoid:** Always work with millisecond timestamps: `Date.now() - new Date(card.created).getTime()`. Never parse date strings for comparison.

### Pitfall 3: Terminal Width Edge Cases
**What goes wrong:** Lines break or truncate badly when terminal is very narrow or when stdout is piped (columns = undefined).
**Why it happens:** `process.stdout.columns` is undefined when piped to another process.
**How to avoid:** Fallback to 80, enforce a minimum title width (e.g., 10 chars), and handle the case where the terminal is too narrow for the fixed-width parts by just letting lines overflow.
**Warning signs:** Tests pass but CI output looks wrong (CI pipes stdout).

### Pitfall 4: Edit Diff Needs Before/After State
**What goes wrong:** Edit mutation rendering can't show "old title -> new title" because `editCard()` returns only the updated card.
**Why it happens:** Current `editCard()` mutates in place and returns the result -- no "before" snapshot.
**How to avoid:** Capture the old title and body before calling `editCard()`. Pass both old and new values to `renderMutation('edit', ...)`.

### Pitfall 5: Root Card Detail View
**What goes wrong:** `get` with no args needs to render root as a card, but root is not a real card object -- it's the data wrapper.
**Why it happens:** The root `{version, cards}` doesn't have `id`, `title`, `created`, `body` fields.
**How to avoid:** Synthesize a virtual root card object for rendering: `{id: '(root)', title: 'burrow', created: data.cards[0]?.created, archived: false, body: '', children: data.cards}`. The render function doesn't need to know it's special.

### Pitfall 6: Breadcrumb Data for Mutations
**What goes wrong:** `add` and `edit` mutations need breadcrumbs for their card detail section, but `addCard()` and `editCard()` don't return path info.
**Why it happens:** Tree operations are path-unaware.
**How to avoid:** After the mutation, call `getPath()` to get the ancestry for breadcrumb rendering.

### Pitfall 7: Children Count Display Inconsistency
**What goes wrong:** Root card shows "4 cards (23 total)" but non-root cards just show children list.
**Why it happens:** The user's example shows a summary line for root: "children: 4 cards (23 total)".
**How to avoid:** The children header shows a count summary when there are children. Format: `children: N cards (M total)` where N = direct children count and M = total active descendants. Show "(none)" when empty.

## Code Examples

### Age Formatting
```javascript
function formatAge(isoString) {
  const ms = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 52) return `${weeks}w ago`;
  return `${Math.floor(weeks / 52)}y ago`;
}
```

### Horizontal Rule
```javascript
const HR_WIDTH = 40;
const HR = '\u2500'.repeat(HR_WIDTH); // ────────────────────────────────────────
```

### Breadcrumb Formatting
```javascript
function formatBreadcrumb(ancestors, cardTitle, context) {
  const parts = ['burrow', ...ancestors.map(a => a.title), cardTitle].filter(Boolean);
  let line = parts.join(' \u203A '); // › separator
  if (context) line += ` \u00B7 ${context}`; // · for filter context
  return line;
}
```

### Card Detail Template
```javascript
function renderCard(card, breadcrumbs, opts = {}) {
  const { full = false, termWidth = 80, archiveFilter = 'active' } = opts;
  const lines = [];

  // Breadcrumb header
  const crumb = formatBreadcrumb(breadcrumbs, card.title);
  lines.push(crumb);
  lines.push('');

  // Title section
  lines.push(HR);
  lines.push(card.title);
  lines.push(HR);

  // Metadata
  lines.push(`id:       ${card.id}`);
  lines.push(`created:  ${formatCreatedDate(card.created)}`);
  lines.push(`archived: ${card.archived ? 'yes' : 'no'}`);
  lines.push(HR);

  // Children section
  if (!card.children || card.children.length === 0) {
    lines.push('children: (none)');
  } else {
    const activeChildren = card.children.filter(c => !c.archived);
    // ... format children lines with box-drawing
  }
  lines.push(HR);

  // Body section
  if (!card.body || !card.body.trim()) {
    lines.push('body:     (empty)');
  } else if (!full && card.body.length > 200) {
    lines.push('body:');
    lines.push('  ' + card.body.slice(0, 200));
    lines.push('  ...(truncated -- use --full for complete body)');
  } else {
    lines.push('body:');
    lines.push('  ' + card.body.replace(/\n/g, '\n  ')); // indent body lines
  }
  lines.push(HR);

  return lines.join('\n');
}
```

### CLI Router Integration
```javascript
// In burrow-tools.cjs main()
const render = require('./lib/render.cjs');

// Global --json detection
const jsonMode = process.argv.includes('--json');

// Example: get command
case 'get': {
  // ... parse args, load data ...
  if (jsonMode) {
    const result = tree.renderTree(data, id, { depth, archiveFilter });
    core.output(result);
  } else {
    // Card detail or tree view
    const card = id ? tree.findById(data, id) : /* synthesize root */;
    const path = id ? tree.getPath(data, id) : [];
    const rendered = render.renderCard(card, path, { full, termWidth: process.stdout.columns });
    process.stdout.write(rendered + '\n');
    process.exit(0);
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Raw JSON output only | Human-readable default + --json opt-in | Phase 3 | All CLI output changes |
| `list`, `children`, `dump` as separate commands | `get` as universal view, `dump` alias only | Phase 3 | Simpler CLI surface |

**Deprecated/outdated:**
- `list` command: removed, use `get` with no args
- `children` command: removed, use `get <id>`

## Open Questions

1. **Created date display format**
   - What we know: Age relative format is specified ("2d ago"). The metadata line shows "2026-03-06 (2d ago)".
   - What's unclear: Exact date format -- ISO date (2026-03-06) or localized?
   - Recommendation: Use ISO date (YYYY-MM-DD) + relative age in parens. Consistent, locale-independent. Matches the example in CONTEXT.md.

2. **Depth views in pretty-print mode**
   - What we know: `get --depth 0` dumps full tree. Card detail is for single-card focus.
   - What's unclear: When `get` returns multiple cards (no ID, depth > 0), should it render as a tree listing or as the root card detail? The CONTEXT.md root card example shows root as a card with children listed.
   - Recommendation: `get` always renders as card detail. No ID = root card detail. The tree listing IS the children section of the card detail. `get --depth 2` shows root card with children and grandchildren in the tree section.

3. **Existing cli.test.cjs update scope**
   - What we know: Current CLI tests parse JSON output. With pretty-print as default, they'll break.
   - What's unclear: Update all tests to use `--json`, or rewrite for pretty-print output?
   - Recommendation: Update existing CLI tests to pass `--json` flag (preserving current behavior verification). Add new render.test.cjs for pretty-print output testing with fixture data.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | node:test (built-in, Node 22.x) |
| Config file | none -- uses `node --test` directly |
| Quick run command | `node --test .claude/burrow/test/render.test.cjs` |
| Full suite command | `node --test .claude/burrow/test/*.test.cjs` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PP-01 | renderCard produces correct card detail format | unit | `node --test .claude/burrow/test/render.test.cjs` | No -- Wave 0 |
| PP-02 | renderCard truncates body at ~200 chars, --full shows all | unit | `node --test .claude/burrow/test/render.test.cjs` | No -- Wave 0 |
| PP-03 | renderMutation formats add/edit/delete/move/archive correctly | unit | `node --test .claude/burrow/test/render.test.cjs` | No -- Wave 0 |
| PP-04 | formatAge produces correct relative timestamps | unit | `node --test .claude/burrow/test/render.test.cjs` | No -- Wave 0 |
| PP-05 | Tree lines use box-drawing with right-aligned age | unit | `node --test .claude/burrow/test/render.test.cjs` | No -- Wave 0 |
| PP-06 | --json flag returns raw JSON (existing behavior preserved) | integration | `node --test .claude/burrow/test/cli.test.cjs` | Yes -- needs --json flag added |
| PP-07 | Default output is human-readable (not JSON) | integration | `node --test .claude/burrow/test/cli.test.cjs` | No -- needs new tests |
| PP-08 | `list` and `children` commands removed | integration | `node --test .claude/burrow/test/cli.test.cjs` | Partial -- existing tests need update |
| PP-09 | renderError produces `x message` format | unit | `node --test .claude/burrow/test/render.test.cjs` | No -- Wave 0 |
| PP-10 | Root card rendered with (root) ID and synthesized data | unit | `node --test .claude/burrow/test/render.test.cjs` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test .claude/burrow/test/render.test.cjs`
- **Per wave merge:** `node --test .claude/burrow/test/*.test.cjs`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `.claude/burrow/test/render.test.cjs` -- covers PP-01 through PP-05, PP-09, PP-10
- [ ] Update `.claude/burrow/test/cli.test.cjs` -- add `--json` flag to existing tests, add pretty-print integration tests

## Sources

### Primary (HIGH confidence)
- Project codebase: `burrow-tools.cjs`, `lib/core.cjs`, `lib/mongoose.cjs`, `lib/warren.cjs` -- direct code inspection
- `03-CONTEXT.md` -- locked user decisions with exact output format specs
- Node.js docs -- `util.parseArgs`, `process.stdout.columns` are stable APIs in Node 22

### Secondary (MEDIUM confidence)
- None needed -- this phase uses only project-internal code and Node.js built-ins

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero dependencies, Node.js built-ins only, well-understood
- Architecture: HIGH -- user specified exact module structure (`lib/render.cjs`) and function signatures
- Pitfalls: HIGH -- identified from direct code inspection of existing codebase (edit before/after, root synthesis, breadcrumb data gaps)

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable -- no external dependencies to drift)
