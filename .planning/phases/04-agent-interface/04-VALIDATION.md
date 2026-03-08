---
phase: 4
slug: agent-interface
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner (node:test) |
| **Config file** | None (test files run directly) |
| **Quick run command** | `node --test .claude/burrow/test/cli.test.cjs` |
| **Full suite command** | `node --test .claude/burrow/test/*.test.cjs` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Verify file exists and has expected structure (Read tool)
- **After every plan wave:** Manual smoke test: invoke `/burrow show` and `/burrow add a test card`
- **Before `/gsd:verify-work`:** Full UAT — user runs each shortcut and the NL parser with real requests
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | CMDS-06 | manual-only | N/A — markdown content | N/A | ⬜ pending |
| 04-01-02 | 01 | 1 | CMDS-01 | manual-only | N/A — slash command invocation | N/A | ⬜ pending |
| 04-01-03 | 01 | 1 | CMDS-02 | manual-only | N/A — slash command invocation | N/A | ⬜ pending |
| 04-01-04 | 01 | 1 | CMDS-03 | manual-only | N/A — slash command invocation | N/A | ⬜ pending |
| 04-01-05 | 01 | 1 | CMDS-04 | manual-only | N/A — slash command invocation | N/A | ⬜ pending |
| 04-01-06 | 01 | 1 | CMDS-05 | manual-only | N/A — slash command invocation | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. This phase produces markdown files, not executable code. The underlying CLI (`burrow-tools.cjs`) is already fully tested from Phases 1-3.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| NL command file exists with correct frontmatter | CMDS-01 | Slash commands consumed by Claude Code runtime, not testable programmatically | Read `.claude/commands/burrow/burrow.md`, verify YAML frontmatter and workflow reference |
| `/burrow:add` shortcut works | CMDS-02 | Requires Claude Code slash command invocation | Invoke `/burrow:add --title "test"` and verify card created |
| `/burrow:show` shortcut works | CMDS-03 | Requires Claude Code slash command invocation | Invoke `/burrow:show` and verify tree output |
| `/burrow:move` shortcut works | CMDS-04 | Requires Claude Code slash command invocation | Create two cards, invoke `/burrow:move <id> --to <parent>` |
| `/burrow:archive` shortcut works | CMDS-05 | Requires Claude Code slash command invocation | Create card, invoke `/burrow:archive <id>`, verify archived |
| Workflow file has required sections | CMDS-06 | Markdown content review | Read workflow file, verify invariants, examples, and rendering rules sections |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
