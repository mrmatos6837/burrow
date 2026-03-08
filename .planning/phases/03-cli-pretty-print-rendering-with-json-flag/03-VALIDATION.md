---
phase: 3
slug: cli-pretty-print-rendering-with-json-flag
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in, Node 22.x) |
| **Config file** | none — uses `node --test` directly |
| **Quick run command** | `node --test .claude/burrow/test/render.test.cjs` |
| **Full suite command** | `node --test .claude/burrow/test/*.test.cjs` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test .claude/burrow/test/render.test.cjs`
- **After every plan wave:** Run `node --test .claude/burrow/test/*.test.cjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 3 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | 01 | 0 | PP-01–PP-10 | unit | `node --test .claude/burrow/test/render.test.cjs` | ❌ W0 | ⬜ pending |
| TBD | 01 | 1 | PP-01 | unit | `node --test .claude/burrow/test/render.test.cjs` | ❌ W0 | ⬜ pending |
| TBD | 01 | 1 | PP-02 | unit | `node --test .claude/burrow/test/render.test.cjs` | ❌ W0 | ⬜ pending |
| TBD | 01 | 1 | PP-03 | unit | `node --test .claude/burrow/test/render.test.cjs` | ❌ W0 | ⬜ pending |
| TBD | 01 | 1 | PP-04 | unit | `node --test .claude/burrow/test/render.test.cjs` | ❌ W0 | ⬜ pending |
| TBD | 01 | 1 | PP-05 | unit | `node --test .claude/burrow/test/render.test.cjs` | ❌ W0 | ⬜ pending |
| TBD | 01 | 2 | PP-06 | integration | `node --test .claude/burrow/test/cli.test.cjs` | ✅ needs update | ⬜ pending |
| TBD | 01 | 2 | PP-07 | integration | `node --test .claude/burrow/test/cli.test.cjs` | ❌ new tests | ⬜ pending |
| TBD | 01 | 2 | PP-08 | integration | `node --test .claude/burrow/test/cli.test.cjs` | ❌ new tests | ⬜ pending |
| TBD | 01 | 1 | PP-09 | unit | `node --test .claude/burrow/test/render.test.cjs` | ❌ W0 | ⬜ pending |
| TBD | 01 | 1 | PP-10 | unit | `node --test .claude/burrow/test/render.test.cjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `.claude/burrow/test/render.test.cjs` — stubs for PP-01 through PP-05, PP-09, PP-10
- [ ] Update `.claude/burrow/test/cli.test.cjs` — add `--json` flag to existing tests

*Wave 0 creates test infrastructure before implementation begins.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Terminal width truncation looks correct | PP-05 | Visual alignment depends on actual terminal | Run `get` in terminals of different widths |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 3s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
