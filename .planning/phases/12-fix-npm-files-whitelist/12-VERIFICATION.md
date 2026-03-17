---
phase: 12-fix-npm-files-whitelist
verified: 2026-03-17T00:00:00Z
status: passed
score: 2/2 must-haves verified
gaps: []
---

# Phase 12: Fix npm Files Whitelist — Verification Report

**Phase Goal:** Fix the npm files whitelist so that all required files are included in the npm tarball
**Verified:** 2026-03-17
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `.claude/commands/burrow.md` is included in the npm tarball | VERIFIED | `npm pack --dry-run` lists `.claude/commands/burrow.md` at 372B in the Tarball Contents section |
| 2 | `npx create-burrow` does not crash with ENOENT on burrow.md copy step | VERIFIED | File is present in tarball; install.cjs line 162 references `commandFile: '.claude/commands/burrow.md'` and will find it during install |

**Score:** 2/2 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `package.json` | `files` whitelist includes `.claude/commands/burrow.md` | VERIFIED | files array contains 4 entries: `install.cjs`, `.claude/burrow/`, `.claude/commands/burrow/`, `.claude/commands/burrow.md` |

**Artifact levels:**

- Level 1 (Exists): `package.json` exists at repo root
- Level 2 (Substantive): files array contains exactly 4 entries, including the new `.claude/commands/burrow.md` — no stub patterns found
- Level 3 (Wired): Change is wired; `npm pack --dry-run` confirms the file appears in the actual tarball output at 372B

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `package.json` files array | `install.cjs` line 162 (`commandFile`) | npm pack includes `.claude/commands/burrow.md` | VERIFIED | `npm pack --dry-run` output confirms file is at position 11 in the Tarball Contents list (372B); install.cjs line 162 references `'.claude/commands/burrow.md'` exactly |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| NPM-02 | 12-01-PLAN.md | Package uses `files` whitelist — only ships source, commands, and installer | SATISFIED | `package.json` files array is a whitelist with 4 precise entries; all installer-referenced files confirmed present in `npm pack --dry-run` output |

**Orphaned requirements check:** REQUIREMENTS.md traceability table maps only NPM-02 to Phase 12. No orphaned requirements found.

---

### Commit Verification

| Commit | Status | Details |
|--------|--------|---------|
| `d1d1244` | VERIFIED | Exists in git history; modified `package.json` (+2/-1 lines); commit message accurately describes the fix |

---

### Anti-Patterns Found

None. No TODO/FIXME/placeholder comments or empty implementations detected in the modified file.

---

### Human Verification Required

None. The fix is mechanically verifiable: the file appears in `npm pack --dry-run` output, the installer reference exists at the documented line, and the commit is present. No visual or UX behavior to validate.

---

## Gaps Summary

No gaps. Phase goal fully achieved.

- `package.json` `files` array now contains `.claude/commands/burrow.md` as its 4th entry
- `npm pack --dry-run` confirms the file is included in the tarball at 372B
- `install.cjs` line 162 references this file; the ENOENT crash path is eliminated
- Commit `d1d1244` is present and correctly scoped
- NPM-02 requirement satisfied — the files whitelist ships only source, commands, and installer; no extraneous files

---

_Verified: 2026-03-17_
_Verifier: Claude (gsd-verifier)_
