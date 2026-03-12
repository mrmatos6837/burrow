# Requirements: Burrow

**Defined:** 2026-03-12
**Core Value:** One recursive data structure — cards containing cards — navigated by an agent that can traverse, summarize, and render any slice at any depth.

## v1.1 Requirements

Requirements for v1.1 Rendering & Ergonomics milestone. Each maps to roadmap phases.

### Rendering Pipeline

- [ ] **REND-01**: renderTree keeps nested structure instead of flattening then re-nesting
- [ ] **REND-02**: Breadcrumb computation happens once (eliminate duplicate in renderTree + getBreadcrumbs)
- [ ] **REND-03**: countActiveDescendants called once per card (eliminate triple-computation across renderTree/renderCard/formatCardLine)
- [ ] **REND-04**: Archive filtering happens once (eliminate duplicate in renderTree + renderCard)
- [ ] **REND-05**: nestFlatCards removed as dead code after renderTree refactor
- [ ] **REND-06**: Tree alignment consistent at 3+ nesting levels (columns don't drift)
- [ ] **REND-07**: Render width adapts to terminal size (process.stdout.columns) instead of hardcoded width
- [ ] **REND-08**: Empty/undefined title handled gracefully in formatCardLine (no crash)
- [ ] **REND-09**: Future dates display sensibly instead of "just now"
- [ ] **REND-10**: Very narrow terminal width clamps to minimum instead of negative availableForTitle

### Performance — Redundant Tree Walks

- [ ] **PERF-01**: moveCard combines cycle check, parent lookup, and container access into single traversal
- [ ] **PERF-02**: Consolidate countDescendants and countActiveDescendants into single parameterized function
- [ ] **PERF-03**: archiveCard/unarchiveCard counts descendants during recursive set instead of separate walk
- [ ] **PERF-04**: CRUD operations return path info — eliminate post-mutation getBreadcrumbs tree walk
- [ ] **PERF-05**: moveCard returns parent info — eliminate redundant findById for parent title
- [ ] **PERF-06**: editCard captures old values internally — eliminate double findById in edit command

### Performance — Unnecessary Work

- [ ] **PERF-07**: Pre-compute descendantCount once, pass through rendering pipeline instead of per-child loop
- [ ] **PERF-08**: makePreview truncates before replacing newlines (avoid processing full body string)
- [ ] **PERF-09**: Skip migrate() call on v2 data in warren.cjs load
- [ ] **PERF-10**: Eliminate O(n) collectAllIds on every addCard (cache or use collision-proof generation)

### Input Validation

- [ ] **VALID-01**: --depth with non-numeric input rejected with error instead of becoming NaN
- [ ] **VALID-02**: Negative --at values rejected with error instead of silent splice-from-end
- [ ] **VALID-03**: Unknown CLI flags rejected with error instead of silently ignored (strict: true or manual check)

### Code Quality

- [ ] **QUAL-01**: formatAge validates ISO input instead of silently producing NaN
- [ ] **QUAL-02**: findParent uses single traversal instead of overlapping root + nested loops
- [ ] **QUAL-03**: renderTree validates depth parameter type
- [ ] **QUAL-04**: Document or consolidate magic truncation numbers (200, 40, 80)

### Data Integrity

- [ ] **DATA-01**: Schema validation on load — corrupted cards.json produces clear error instead of unpredictable crashes
- [ ] **DATA-02**: Invalid ISO dates in created field handled gracefully in formatAge

### API Consistency

- [ ] **API-01**: deleteCard returns full card (same shape as moveCard/editCard) instead of minimal object
- [ ] **API-02**: find command reuses tree engine instead of reimplementing recursion with O(n) path copies

### Installation

- [ ] **INST-01**: Init script automatically adds cards.json.bak to .gitignore
- [ ] **INST-02**: Init script normalizes line endings when appending to existing CLAUDE.md

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Concurrency

- **CONC-01**: File locking for concurrent edits (read-modify-write race condition)
- **CONC-02**: Stale lock cleanup for crashed processes
- **CONC-03**: Multi-agent write safety

### CLI

- **CLI-01**: --minimal flag for machine-parseable compact output (reevaluate need first)
- **CLI-02**: Batch operations for commands (archive multiple IDs, bulk move)

### Distribution

- **DIST-01**: npm package for standalone installation

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Unicode grapheme cluster truncation | Edge case complexity not worth it for v1.1 |
| GSD integration / reconciliation | Deferred to v2 |
| Multi-file scaling | Don't compromise simplicity |
| Performance benchmarks vs alternatives | Marketing/research, not code quality |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| REND-01 | Phase 6 | Pending |
| REND-02 | Phase 6 | Pending |
| REND-03 | Phase 6 | Pending |
| REND-04 | Phase 6 | Pending |
| REND-05 | Phase 6 | Pending |
| REND-06 | Phase 7 | Pending |
| REND-07 | Phase 7 | Pending |
| REND-08 | Phase 7 | Pending |
| REND-09 | Phase 7 | Pending |
| REND-10 | Phase 7 | Pending |
| PERF-01 | Phase 8 | Pending |
| PERF-02 | Phase 8 | Pending |
| PERF-03 | Phase 8 | Pending |
| PERF-04 | Phase 8 | Pending |
| PERF-05 | Phase 8 | Pending |
| PERF-06 | Phase 8 | Pending |
| PERF-07 | Phase 7 | Pending |
| PERF-08 | Phase 8 | Pending |
| PERF-09 | Phase 8 | Pending |
| PERF-10 | Phase 8 | Pending |
| VALID-01 | Phase 8 | Pending |
| VALID-02 | Phase 8 | Pending |
| VALID-03 | Phase 8 | Pending |
| QUAL-01 | Phase 8 | Pending |
| QUAL-02 | Phase 8 | Pending |
| QUAL-03 | Phase 8 | Pending |
| QUAL-04 | Phase 8 | Pending |
| DATA-01 | Phase 8 | Pending |
| DATA-02 | Phase 8 | Pending |
| API-01 | Phase 8 | Pending |
| API-02 | Phase 8 | Pending |
| INST-01 | Phase 8 | Pending |
| INST-02 | Phase 8 | Pending |

**Coverage:**
- v1.1 requirements: 33 total (note: originally noted as 36, actual count is 33)
- Mapped to phases: 33
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-12*
*Last updated: 2026-03-12 — traceability populated after roadmap creation*
