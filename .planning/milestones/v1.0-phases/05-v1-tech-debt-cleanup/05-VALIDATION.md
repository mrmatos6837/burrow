---
phase: 5
slug: v1-tech-debt-cleanup
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner (node:test) |
| **Config file** | None (uses node --test directly) |
| **Quick run command** | `node --test .claude/burrow/test/render.test.cjs` |
| **Full suite command** | `node --test .claude/burrow/test/` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test .claude/burrow/test/render.test.cjs`
- **After every plan wave:** Run `node --test .claude/burrow/test/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | DATA-02, DATA-09 | manual-smoke | `node -e "require('./.claude/burrow/bin/init.cjs')"` with temp dir | No dedicated test | ⬜ pending |
| 05-01-02 | 01 | 1 | PP-03 | unit | `node --test .claude/burrow/test/render.test.cjs` | ✅ Existing (stale) | ⬜ pending |
| 05-01-03 | 01 | 1 | PP-06, CLI-01, RNDR-01, CLI-03, CMDS-03 | manual-only | Visual inspection of REQUIREMENTS.md | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. The two failing tests ARE the fix target (not missing tests).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Requirement text matches codebase | PP-06, CLI-01, RNDR-01, CLI-03, CMDS-03 | Documentation-only changes | Verify no references to `--json`, `get` (as command), `/burrow:show`, `/burrow:delete` in requirement text |
| ROADMAP.md completion status | N/A | State file update | Verify Phase 2 and 4 show "Complete" |
| No empty stale directories | N/A | Filesystem state | Verify `.planning/phases/04-cli-pretty-print-rendering-with-json-flag/` removed |
| find command reconciled | N/A | Documentation wording | Verify Out of Scope clarifies "Search / query engine" vs `find` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
