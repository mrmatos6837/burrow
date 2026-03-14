# Requirements: Burrow

**Defined:** 2026-03-14
**Core Value:** One recursive data structure — cards containing cards — navigated by an agent that can traverse, summarize, and render any slice at any depth.

## v1.2 Requirements

Requirements for Packaging & Distribution milestone. Each maps to roadmap phases.

### Installer

- [ ] **INST-01**: User can run guided interactive install with readline prompts (install path, options)
- [ ] **INST-02**: Installer detects existing burrow installation and runs upgrade vs fresh install
- [ ] **INST-03**: User can run non-interactive install with `--yes` flag (all defaults)
- [ ] **INST-04**: Installer auto-appends burrow instructions block to CLAUDE.md

### npm Package

- [ ] **NPM-01**: Burrow is published as `create-burrow` on npm (`npx create-burrow`)
- [ ] **NPM-02**: Package uses `files` whitelist — only ships source, commands, and installer
- [ ] **NPM-03**: Running with `--help` displays usage information

### Updates

- [ ] **UPD-01**: Re-running installer on existing install replaces source code, preserves `cards.json`
- [ ] **UPD-02**: `/burrow:update` slash command runs update from within Claude Code session
- [ ] **UPD-03**: Version marker tracked in installed files with comparison logic
- [ ] **UPD-04**: CLI shows passive one-line notification when outdated (cached 24h check)

## Future Requirements

### Plugin Distribution

- **PLUG-01**: Burrow packaged as Claude Code plugin (skills, hooks, marketplace)
- **PLUG-02**: Plugin handles per-project scaffolding via init skill

### Integration

- **INTG-01**: GSD workflow integration (reconciliation, auto-tracking)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Homebrew tap | Wrong model for project scaffolding, high maintenance |
| curl\|bash installer | Unnecessary when npm and plugins both work better |
| Global-only install | Data is per-project; global source adds version mismatch risk |
| Claude Code plugin (v1.2) | Deferred to v1.3+ — plugin system is the long-term path but npm-first validates faster |
| Auto-update (no confirmation) | Updates should always be explicit and confirmed |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INST-01 | — | Pending |
| INST-02 | — | Pending |
| INST-03 | — | Pending |
| INST-04 | — | Pending |
| NPM-01 | — | Pending |
| NPM-02 | — | Pending |
| NPM-03 | — | Pending |
| UPD-01 | — | Pending |
| UPD-02 | — | Pending |
| UPD-03 | — | Pending |
| UPD-04 | — | Pending |

**Coverage:**
- v1.2 requirements: 11 total
- Mapped to phases: 0
- Unmapped: 11 ⚠️

---
*Requirements defined: 2026-03-14*
*Last updated: 2026-03-14 after initial definition*
