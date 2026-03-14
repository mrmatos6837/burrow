# Milestones

## v1.1 Rendering & Ergonomics (Shipped: 2026-03-14)

**Delivered:** Rendering pipeline rewrite, engine optimizations, CLI hardening, and project bootstrapping — 33 requirements across rendering, performance, validation, and data integrity.

**Stats:** 3 phases, 8 plans | 1,559 LOC | 240 tests | 33 requirements | 34 commits | 2 days

**Key accomplishments:**
1. Rendering pipeline rewrite — renderTree operates on nested structure directly, eliminating flatten-renest roundtrip
2. Dynamic terminal width — render output adapts to terminal size with MIN_TERM_WIDTH floor
3. Engine optimization — consolidated tree walks (moveCard 4→2, parameterized countDescendants, inline archive counting)
4. Data integrity — schema validation on load with human-readable errors, formatAge type guards
5. CLI hardening — strict flag parsing, input validation, enriched CRUD returns eliminating post-mutation walks
6. Project bootstrapping — `burrow init` for automatic .gitignore and CLAUDE.md setup

**Archives:** `milestones/v1.1-ROADMAP.md`, `milestones/v1.1-REQUIREMENTS.md`, `milestones/v1.1-MILESTONE-AUDIT.md`

---

## v1.0 MVP (Shipped: 2026-03-09)

**Delivered:** Infinitely nestable card tool for AI agents — recursive tree engine, pretty-print rendering, and natural language interface.

**Stats:** 5 phases, 10 plans | 1,415 LOC + 2,065 test LOC | 150 tests | 42 requirements | ~90 commits | 2 days

**Key accomplishments:**
1. Recursive tree engine — infinitely nestable cards with CRUD, move, find, path traversal
2. Simplified v2 schema — dropped position/ordering, renamed notes→body, 6-field cards
3. Depth-configurable views — flat render array with cascade archive/unarchive
4. Pretty-print rendering — box-drawing tree lines, counts, body indicators, relative ages
5. Agent interface — /burrow natural language + 9 shortcut commands
6. Zero tech debt — all 42 requirements satisfied, 150 tests, clean docs

**Archives:** `milestones/v1.0-ROADMAP.md`, `milestones/v1.0-REQUIREMENTS.md`, `milestones/v1.0-MILESTONE-AUDIT.md`

---

