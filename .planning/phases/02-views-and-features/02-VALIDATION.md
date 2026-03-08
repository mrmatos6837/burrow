---
phase: 2
slug: views-and-features
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` (built-in, Node.js 18+) |
| **Config file** | None — uses built-in test runner |
| **Quick run command** | `node --test .claude/burrow/test/mongoose.test.cjs` |
| **Full suite command** | `node --test .claude/burrow/test/*.test.cjs` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test .claude/burrow/test/mongoose.test.cjs`
- **After every plan wave:** Run `node --test .claude/burrow/test/*.test.cjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | SCHEMA-01 | unit | `node --test .claude/burrow/test/mongoose.test.cjs` | Existing (needs update) | ⬜ pending |
| 02-01-02 | 01 | 1 | SCHEMA-02 | unit | `node --test .claude/burrow/test/mongoose.test.cjs` | Existing (needs update) | ⬜ pending |
| 02-01-03 | 01 | 1 | SCHEMA-03 | unit+integration | `node --test .claude/burrow/test/mongoose.test.cjs && node --test .claude/burrow/test/cli.test.cjs` | Existing (needs update) | ⬜ pending |
| 02-01-04 | 01 | 1 | SCHEMA-04 | unit | `node --test .claude/burrow/test/mongoose.test.cjs` | Existing (needs update) | ⬜ pending |
| 02-02-01 | 02 | 2 | RNDR-01 | unit+integration | `node --test .claude/burrow/test/mongoose.test.cjs && node --test .claude/burrow/test/cli.test.cjs` | Needs new tests | ⬜ pending |
| 02-02-02 | 02 | 2 | RNDR-02 | unit | `node --test .claude/burrow/test/mongoose.test.cjs` | Needs new tests | ⬜ pending |
| 02-02-03 | 02 | 2 | RNDR-03 | unit | `node --test .claude/burrow/test/mongoose.test.cjs` | Needs new tests | ⬜ pending |
| 02-02-04 | 02 | 2 | RNDR-04 | unit | `node --test .claude/burrow/test/mongoose.test.cjs` | Needs new tests | ⬜ pending |
| 02-02-05 | 02 | 2 | RNDR-05 | unit | `node --test .claude/burrow/test/mongoose.test.cjs` | Needs new tests | ⬜ pending |
| 02-03-01 | 03 | 2 | ARCH-01 | unit+integration | `node --test .claude/burrow/test/mongoose.test.cjs && node --test .claude/burrow/test/cli.test.cjs` | Needs new tests | ⬜ pending |
| 02-03-02 | 03 | 2 | ARCH-02 | unit | `node --test .claude/burrow/test/mongoose.test.cjs` | Needs new tests | ⬜ pending |
| 02-03-03 | 03 | 2 | ARCH-03 | unit | `node --test .claude/burrow/test/mongoose.test.cjs` | Needs new tests | ⬜ pending |
| 02-04-01 | 04 | 2 | CLI-03 | integration | `node --test .claude/burrow/test/cli.test.cjs` | Needs new tests | ⬜ pending |
| 02-04-02 | 04 | 2 | CLI-04 | integration | `node --test .claude/burrow/test/cli.test.cjs` | Already true | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Update `mongoose.test.cjs` fixtures: remove `position`, `ordering`, rename `notes` to `body`, change `children` from `{ordering, cards:[]}` to `[]`
- [ ] Update `cli.test.cjs` tests: change `--notes` to `--body`, remove `--ordering` tests, update expected output shapes
- [ ] Add `renderTree()` test cases in `mongoose.test.cjs`
- [ ] Add `archiveCard()` / `unarchiveCard()` test cases in `mongoose.test.cjs`
- [ ] Add alias routing tests in `cli.test.cjs` (list, dump, children -> get)
- [ ] Add migration test in `warren.test.cjs` (v1 data -> v2 migration on load)

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
