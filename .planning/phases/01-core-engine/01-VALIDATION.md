---
phase: 1
slug: core-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-07
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in `node:test` + `node:assert` (v22 stable) |
| **Config file** | none — Wave 0 creates test files |
| **Quick run command** | `node --test .claude/burrow/test/*.test.cjs` |
| **Full suite command** | `node --test .claude/burrow/test/*.test.cjs` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test .claude/burrow/test/*.test.cjs`
- **After every plan wave:** Run `node --test .claude/burrow/test/*.test.cjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 0 | DATA-01..08 | unit | `node --test .claude/burrow/test/tree.test.cjs` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 0 | DATA-02,09,10 | integration | `node --test .claude/burrow/test/storage.test.cjs` | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 0 | CLI-01,02 | integration | `node --test .claude/burrow/test/cli.test.cjs` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | DATA-01..08 | unit | `node --test .claude/burrow/test/tree.test.cjs` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 1 | DATA-02,09,10 | integration | `node --test .claude/burrow/test/storage.test.cjs` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 2 | CLI-01,02 | integration | `node --test .claude/burrow/test/cli.test.cjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `.claude/burrow/test/tree.test.cjs` — stubs for DATA-01 through DATA-08 (pure tree operations)
- [ ] `.claude/burrow/test/storage.test.cjs` — stubs for DATA-02, DATA-09, DATA-10 (file I/O, atomic writes, backup)
- [ ] `.claude/burrow/test/cli.test.cjs` — stubs for CLI-01, CLI-02 (end-to-end subcommand tests)
- [ ] Node.js `node:test` is built-in — no framework install needed

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
