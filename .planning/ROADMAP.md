# Roadmap: Burrow

## Milestones

- ✅ **v1.0 MVP** — Phases 1-5 (shipped 2026-03-09)
- ✅ **v1.1 Rendering & Ergonomics** — Phases 6-8 (shipped 2026-03-14)
- ✅ **v1.2 Packaging & Distribution** — Phases 9-13 (shipped 2026-03-29)
- 🚧 **v1.3 Onboarding & Configuration** — Phases 14-17 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-5) — SHIPPED 2026-03-09</summary>

- [x] Phase 1: Core Engine (2/2 plans) — completed 2026-03-07
- [x] Phase 2: Schema, Views, and Archive (2/2 plans) — completed 2026-03-08
- [x] Phase 3: CLI Pretty-Print Rendering (3/3 plans) — completed 2026-03-08
- [x] Phase 4: Agent Interface (2/2 plans) — completed 2026-03-08
- [x] Phase 5: v1 Tech Debt Cleanup (1/1 plan) — completed 2026-03-09

Full details: `milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 Rendering & Ergonomics (Phases 6-8) — SHIPPED 2026-03-14</summary>

- [x] Phase 6: Rendering Pipeline Refactor (2/2 plans) — completed 2026-03-13
- [x] Phase 7: Rendering Enhancements (2/2 plans) — completed 2026-03-13
- [x] Phase 8: Engine Quality & Ergonomics (4/4 plans) — completed 2026-03-14

Full details: `milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>✅ v1.2 Packaging & Distribution (Phases 9-13) — SHIPPED 2026-03-29</summary>

- [x] Phase 9: Installer Rewrite (2/2 plans) — completed 2026-03-14
- [x] Phase 10: Version Tracking & Update Command (2/2 plans) — completed 2026-03-14
- [x] Phase 11: npm Package (1/1 plan) — completed 2026-03-16
- [x] Phase 12: Fix npm Package Files Whitelist (1/1 plan) — completed 2026-03-17
- [x] Phase 13: npm-First Update System (1/1 plan) — completed 2026-03-19

Full details: `milestones/v1.2-ROADMAP.md`

</details>

### 🚧 v1.3 Onboarding & Configuration (In Progress)

**Milestone Goal:** Give users control over how Burrow loads context — configurable modes, installer onboarding prompts, and runtime config command — reducing token cost by up to 95%.

- [x] **Phase 14: Config Foundation + Index Command** - `lib/config.cjs` with get/set/list API and `burrow index` lightweight JSON output (completed 2026-04-02)
- [x] **Phase 15: CLAUDE.md Sentinel Variants** - `generateSnippet(loadMode)` replacing hardcoded snippet; atomic `writeSentinelBlock()` (completed 2026-04-02)
- [ ] **Phase 16: Workflow LOAD Step + Load Command** - `burrow load` dispatcher and `workflows/burrow.md` updated to branch on loadMode
- [ ] **Phase 17: Installer Onboarding + Config Command** - loadMode prompt during install, upgrade path preservation, and `/burrow:config` slash command

## Phase Details

### Phase 14: Config Foundation + Index Command
**Goal**: Config persists across sessions and `burrow index` outputs a lightweight tree that costs ~95% fewer tokens than a full cards.json read
**Depends on**: Phase 13 (v1.2 complete)
**Requirements**: CFG-01, CFG-02, CFG-03, CFG-04, CFG-05, IDX-01, IDX-02, IDX-03
**Success Criteria** (what must be TRUE):
  1. Running `burrow config list` prints current settings with defaults shown for any unset keys
  2. Running `burrow config set loadMode index` persists the value and `burrow config get loadMode` returns `index` on next invocation
  3. `config.json` is never overwritten on upgrade — running the installer over an existing install leaves user-set values intact
  4. Running `burrow index` outputs a valid JSON tree containing only titles, IDs, and child counts — no bodies, no ages
  5. Running `burrow index --depth 2` limits output to two levels; `--include-archived` includes archived cards in the output
**Plans**: 2 plans
Plans:
- [x] 14-01-PLAN.md — Config system: atomicWriteJSON, lib/config.cjs, config CLI commands
- [x] 14-02-PLAN.md — Index command: buildIndex, renderIndex, index CLI with flags

### Phase 15: CLAUDE.md Sentinel Variants
**Goal**: The CLAUDE.md sentinel block correctly reflects the configured loadMode, and writes to CLAUDE.md are atomic so a crash cannot corrupt the agent's instruction set
**Depends on**: Phase 14
**Requirements**: SNP-01, SNP-02, SNP-03
**Success Criteria** (what must be TRUE):
  1. Calling `generateSnippet('full')`, `generateSnippet('index')`, and `generateSnippet('auto')` each return a distinct, correct CLAUDE.md snippet instructing the agent to load context in that mode
  2. `writeSentinelBlock()` uses a tmp-file-then-rename pattern — a simulated mid-write crash leaves the CLAUDE.md file unchanged rather than corrupt
  3. After a loadMode change, the CLAUDE.md sentinel block content matches the new mode without any manual intervention
**Plans**: 2 plans
Plans:
- [x] 15-01-PLAN.md — Config schema expansion (triggerWords/triggerPreset), atomicWriteFile, generateSnippet(config)
- [x] 15-02-PLAN.md — Atomic writeSentinelBlock/removeSentinelBlock, wire install.cjs to generateSnippet

### Phase 16: Workflow LOAD Step + Load Command
**Goal**: The agent's session-start workflow reads `config.json` and branches to the correct loading behavior — full read, index-only, none, or auto-threshold — making the entire config system meaningful at runtime
**Depends on**: Phase 15
**Requirements**: WFL-01, WFL-02, WFL-03, WFL-04, WFL-05, WFL-06
**Success Criteria** (what must be TRUE):
  1. With `loadMode = full`, the agent reads `cards.json` in full at session start (current behavior unchanged)
  2. With `loadMode = index`, the agent runs `burrow index` and receives titles/IDs only — no body content loaded
  3. With `loadMode = none`, the agent skips context loading entirely and notes cards are available on demand
  4. With `loadMode = auto`, the workflow checks `cards.json` file size against the threshold and selects full or index accordingly
  5. The workflow documents the lazy body-fetching pattern so the agent knows to drill down when it needs card bodies in index mode
**Plans**: 2 plans
Plans:
- [x] 16-01-PLAN.md — lib/loader.cjs + indexDepth config + CLI wiring + tests
- [ ] 16-02-PLAN.md — Workflow LOAD step rewrite with mode-aware dispatcher

### Phase 17: Installer Onboarding + Config Command
**Goal**: Users are asked about their preferred loading mode during install, upgrades never lose existing config, and the `/burrow:config` command lets users view and change settings from within Claude Code
**Depends on**: Phase 16
**Requirements**: ONB-01, ONB-02, ONB-03, ONB-04, CMD-01, CMD-02, CMD-03, CMD-04, CMD-05
**Success Criteria** (what must be TRUE):
  1. Running the interactive installer presents a loadMode question with mode options and explanations; the chosen mode is written to `config.json` and reflected in the CLAUDE.md sentinel block before the installer exits
  2. Running the installer with `--yes` completes without prompting and sets `loadMode = auto` in `config.json`
  3. Running the installer over an existing v1.3+ install skips the loadMode prompt and preserves the existing `config.json` unchanged
  4. Running the installer over a pre-v1.3 install (no `config.json`) creates `config.json` with defaults and prints a single notification line — no prompt
  5. Invoking `/burrow:config` displays current settings in a formatted table and offers options to change each setting; selecting a new loadMode updates both `config.json` and the CLAUDE.md sentinel block atomically
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Core Engine | v1.0 | 2/2 | Complete | 2026-03-07 |
| 2. Schema, Views, and Archive | v1.0 | 2/2 | Complete | 2026-03-08 |
| 3. CLI Pretty-Print Rendering | v1.0 | 3/3 | Complete | 2026-03-08 |
| 4. Agent Interface | v1.0 | 2/2 | Complete | 2026-03-08 |
| 5. v1 Tech Debt Cleanup | v1.0 | 1/1 | Complete | 2026-03-09 |
| 6. Rendering Pipeline Refactor | v1.1 | 2/2 | Complete | 2026-03-13 |
| 7. Rendering Enhancements | v1.1 | 2/2 | Complete | 2026-03-13 |
| 8. Engine Quality & Ergonomics | v1.1 | 4/4 | Complete | 2026-03-14 |
| 9. Installer Rewrite | v1.2 | 2/2 | Complete | 2026-03-14 |
| 10. Version Tracking & Update Command | v1.2 | 2/2 | Complete | 2026-03-14 |
| 11. npm Package | v1.2 | 1/1 | Complete | 2026-03-16 |
| 12. Fix npm Package Files Whitelist | v1.2 | 1/1 | Complete | 2026-03-17 |
| 13. npm-First Update System | v1.2 | 1/1 | Complete | 2026-03-19 |
| 14. Config Foundation + Index Command | v1.3 | 2/2 | Complete    | 2026-04-02 |
| 15. CLAUDE.md Sentinel Variants | v1.3 | 2/2 | Complete    | 2026-04-02 |
| 16. Workflow LOAD Step + Load Command | v1.3 | 1/2 | In Progress|  |
| 17. Installer Onboarding + Config Command | v1.3 | 0/? | Not started | - |
