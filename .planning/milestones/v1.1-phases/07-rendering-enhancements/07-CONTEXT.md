# Phase 7: Rendering Enhancements - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Tree output is visually correct at any nesting depth, adapts to terminal width, and handles all edge cases without crashing. Covers REND-06 through REND-10 and PERF-07.

</domain>

<decisions>
## Implementation Decisions

### Future date handling (REND-09)
- Clamp future timestamps to "just now" — treat negative diffs as zero
- Validate ISO input in formatAge — return "???" for NaN/invalid dates (covers QUAL-01 cross-concern)

### Empty title display (REND-08)
- Show a placeholder for empty or undefined titles — Claude picks the text (e.g., "(untitled)")
- Placeholder appears in both formatCardLine (tree lines) AND renderCard (detail header) — consistent everywhere

### Dynamic width (REND-07, REND-10)
- Read terminal width from process.stdout.columns, fall back to 80
- Support `--width N` CLI override flag on ALL commands (read, dump, add, edit, move, etc.)
- Calculate minimum width floor from fixed rendering elements — ensure titles get at least ~15-20 chars so output doesn't feel crammed
- Below the floor, clamp to minimum width — warning behavior at Claude's discretion

### Claude's Discretion
- Exact placeholder text for empty titles
- Minimum width floor value (derived from rendering math)
- Whether to show a warning when terminal is below minimum width
- Box-drawing alignment fix approach for REND-06 (technical implementation)
- PERF-07 pre-compute strategy (how descendantCount flows through pipeline)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `formatAge()` (render.cjs:24-41): Needs future-date guard and NaN validation added
- `formatCardLine()` (render.cjs:95-122): Needs empty title guard and width floor clamping
- `renderTreeLines()` (render.cjs:132-149): Uses fixed indent strings (`'    '` and `'│   '`) — alignment fix target for REND-06
- `truncate()` (render.cjs:82-85): Already handles string truncation with ellipsis

### Established Patterns
- `termWidth || 80` fallback used in formatCardLine and renderCard — replace with centralized width resolution
- Pure functions return strings, no stdout — maintain this (Phase 3/6 decision)
- render.cjs has zero mongoose dependency — uses pre-computed metadata only (Phase 6 decision)
- `card.descendantCount` and `card.hasBody` are pre-computed by renderTree (Phase 6 refactor)

### Integration Points
- `burrow-tools.cjs`: CLI entry point — needs to read process.stdout.columns and parse --width flag, pass to render functions
- `renderCard()` and `formatCardLine()` already accept `termWidth` parameter — needs to flow from CLI
- renderTree in mongoose.cjs computes the nested tree with metadata — PERF-07 may optimize descendantCount there

</code_context>

<specifics>
## Specific Ideas

- Width floor should be calculated from the actual fixed-width elements (prefix + ID bracket + indicators + age column) so it's derived, not a magic number
- "Comfortable, not crammed" — the floor should leave enough room that titles are readable, not just technically non-negative

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-rendering-enhancements*
*Context gathered: 2026-03-13*
