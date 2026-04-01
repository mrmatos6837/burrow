# Requirements: Burrow

**Defined:** 2026-04-01
**Core Value:** One recursive data structure — cards containing cards — navigated by an agent that can traverse, summarize, and render any slice at any depth.

## v1.3 Requirements

Requirements for Onboarding & Configuration milestone. Each maps to roadmap phases.

### Config System

- [ ] **CFG-01**: Config file loads from `.planning/burrow/config.json` with defaults-merge (missing keys get defaults)
- [ ] **CFG-02**: Config file uses atomic writes (tmp + rename pattern matching warren.cjs)
- [ ] **CFG-03**: Config exposes get/set/list API via `lib/config.cjs`
- [ ] **CFG-04**: Config file is sacred — never overwritten on upgrade (preserved like cards.json)
- [ ] **CFG-05**: Auto mode checks cards.json file size and switches full→index at configurable threshold

### Index Command

- [ ] **IDX-01**: `burrow index` outputs lightweight JSON tree (titles, IDs, child counts — no bodies, no ages)
- [ ] **IDX-02**: `burrow index --depth N` limits output depth
- [ ] **IDX-03**: `burrow index --include-archived` includes archived cards

### Installer Onboarding

- [ ] **ONB-01**: Installer asks "How should Burrow load on session start?" with mode options
- [ ] **ONB-02**: Chosen mode writes to config.json and generates matching CLAUDE.md sentinel snippet
- [ ] **ONB-03**: `--yes` flag defaults to auto mode without prompting
- [ ] **ONB-04**: Upgrade path preserves existing config.json (does not re-prompt or overwrite)

### Config Command

- [ ] **CMD-01**: `/burrow:config` displays current settings in a formatted table
- [ ] **CMD-02**: `/burrow:config` offers AskUserQuestion options to change each setting
- [ ] **CMD-03**: Agent calls `burrow config <key> <value>` CLI to persist changes
- [ ] **CMD-04**: After loadMode change, agent auto-updates CLAUDE.md sentinel block
- [ ] **CMD-05**: CLI `burrow config` supports get/set/list for programmatic use (agent primitive)

### CLAUDE.md Variants

- [ ] **SNP-01**: Sentinel block content varies by loadMode (full/index/index --depth N/none/auto)
- [ ] **SNP-02**: `generateSnippet(loadMode)` function replaces hardcoded snippet constant
- [ ] **SNP-03**: `writeSentinelBlock()` refactored to atomic writes (tmp + rename)

### Workflow Update

- [ ] **WFL-01**: Workflow LOAD step reads config.json to determine loading mode
- [ ] **WFL-02**: Full mode: reads cards.json via Read tool (current behavior)
- [ ] **WFL-03**: Index mode: runs `burrow index` via Bash, parses JSON
- [ ] **WFL-04**: None mode: skips load entirely, notes cards available on demand
- [ ] **WFL-05**: Auto mode: checks size, picks full or index accordingly
- [ ] **WFL-06**: Workflow documents lazy body fetching pattern (load index, drill down as needed)

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Index Extensions

- **IDX-04**: `burrow index --flat` outputs flat array with parentId instead of nested tree — dropped from v1.3, no clear use case

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Multi-file sharding | v2+ candidate — don't compromise simplicity |
| Subtree extraction | Not needed for context loading optimization |
| GSD workflow integration | Deferred to v2 per PROJECT.md |
| Plugin packaging | Separate milestone concern |
| Global config (~/.config/burrow/) | Per-project scope only — .planning/burrow/ is correct |
| XDG directory compliance | Unnecessary for project-local tool |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CFG-01 | Phase 14 | Pending |
| CFG-02 | Phase 14 | Pending |
| CFG-03 | Phase 14 | Pending |
| CFG-04 | Phase 14 | Pending |
| CFG-05 | Phase 14 | Pending |
| IDX-01 | Phase 14 | Pending |
| IDX-02 | Phase 14 | Pending |
| IDX-03 | Phase 14 | Pending |
| SNP-01 | Phase 15 | Pending |
| SNP-02 | Phase 15 | Pending |
| SNP-03 | Phase 15 | Pending |
| WFL-01 | Phase 16 | Pending |
| WFL-02 | Phase 16 | Pending |
| WFL-03 | Phase 16 | Pending |
| WFL-04 | Phase 16 | Pending |
| WFL-05 | Phase 16 | Pending |
| WFL-06 | Phase 16 | Pending |
| ONB-01 | Phase 17 | Pending |
| ONB-02 | Phase 17 | Pending |
| ONB-03 | Phase 17 | Pending |
| ONB-04 | Phase 17 | Pending |
| CMD-01 | Phase 17 | Pending |
| CMD-02 | Phase 17 | Pending |
| CMD-03 | Phase 17 | Pending |
| CMD-04 | Phase 17 | Pending |
| CMD-05 | Phase 17 | Pending |

**Coverage:**
- v1.3 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0

---
*Requirements defined: 2026-04-01*
*Last updated: 2026-04-01 after roadmap creation*
