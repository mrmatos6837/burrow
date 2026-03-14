# Roadmap: Burrow

## Milestones

- ✅ **v1.0 MVP** — Phases 1-5 (shipped 2026-03-09)
- ✅ **v1.1 Rendering & Ergonomics** — Phases 6-8 (shipped 2026-03-14)
- 🚧 **v1.2 Packaging & Distribution** — Phases 9-11 (in progress)

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

### 🚧 v1.2 Packaging & Distribution (In Progress)

**Milestone Goal:** Make burrow installable by anyone with a single command — guided installer UX, npm package, update mechanism, and version tracking.

- [ ] **Phase 9: Installer Rewrite** - Guided interactive install with detection, idempotency, non-interactive mode, CLAUDE.md setup, and clean uninstall
- [ ] **Phase 10: Version Tracking & Update Command** - Version marker, outdated check, passive notification, and `/burrow:update` slash command
- [ ] **Phase 11: npm Package** - Publish `create-burrow` to npm with files whitelist and `--help` output

## Phase Details

### Phase 9: Installer Rewrite
**Goal**: Anyone can install burrow with a single guided command, and re-running on an existing install upgrades cleanly without touching user data
**Depends on**: Nothing (first v1.2 phase)
**Requirements**: INST-01, INST-02, INST-03, INST-04, INST-05, UPD-01
**Success Criteria** (what must be TRUE):
  1. Running the installer presents readline prompts for install path and options, completing without errors
  2. Running the installer on a project that already has burrow detects the existing installation and switches to upgrade mode instead of overwriting
  3. Running `node install.cjs --yes` completes installation with all defaults and zero prompts
  4. Installer explains what CLAUDE.md instructions are for and prompts the user; if they opt in, CLAUDE.md contains the burrow block with sentinel markers — if they decline, CLAUDE.md is untouched
  5. Re-running the installer on an existing install replaces source files but leaves `cards.json` untouched
  6. Running uninstall removes `.claude/burrow/`, `.claude/commands/burrow/`, and if sentinel markers exist in CLAUDE.md, removes only that block — no other content is modified
**Plans:** 1/2 plans executed
Plans:
- [ ] 09-01-PLAN.md — Installer engine: detection, sentinel CLAUDE.md, file operations (TDD)
- [ ] 09-02-PLAN.md — Interactive CLI: readline prompts, --yes, --uninstall, integration tests

### Phase 10: Version Tracking & Update Command
**Goal**: Burrow tracks its own version and passively notifies users when an update is available, and users can trigger an update from within a Claude Code session
**Depends on**: Phase 9
**Requirements**: UPD-02, UPD-03, UPD-04
**Success Criteria** (what must be TRUE):
  1. A version marker is embedded in the installed files and compared against the source version to determine if an update is available
  2. Running any burrow CLI command shows a one-line "update available" notice when the installed version is behind — no more than once per 24 hours
  3. Running `/burrow:update` from within Claude Code triggers a re-run of the installer in upgrade mode, updating source files and preserving data
**Plans**: TBD

### Phase 11: npm Package
**Goal**: Burrow is publicly installable via `npx create-burrow` and the package ships only the files needed for a working install
**Depends on**: Phase 9
**Requirements**: NPM-01, NPM-02, NPM-03
**Success Criteria** (what must be TRUE):
  1. `npx create-burrow` runs the guided installer end-to-end — no git clone or manual download needed
  2. The published npm package contains only source files, commands, and the installer — no planning docs, test files, or generated artifacts
  3. Running `npx create-burrow --help` prints usage information describing available flags and options
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
| 9. Installer Rewrite | 1/2 | In Progress|  | - |
| 10. Version Tracking & Update Command | v1.2 | 0/? | Not started | - |
| 11. npm Package | v1.2 | 0/? | Not started | - |
