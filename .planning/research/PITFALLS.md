# Domain Pitfalls

**Domain:** Retrofitting config system, context loading modes, and installer onboarding onto existing Burrow CLI tool (v1.3)
**Researched:** 2026-04-01
**Confidence:** HIGH

> This document supersedes the original PITFALLS.md (2026-03-06) for milestone v1.3. The original covered foundational pitfalls for the core engine and storage layer — those are still valid for that scope. This document focuses exclusively on pitfalls introduced by adding config management, configurable context loading, onboarding prompts, and CLAUDE.md sentinel block variants to the existing system.

---

## Critical Pitfalls

Mistakes that cause rewrites, data corruption, or silent behavior changes.

---

### Pitfall 1: Config File Treated as Sacred — No Defensive Load

**What goes wrong:**
`config.json` is loaded with a simple `JSON.parse(fs.readFileSync(...))` and immediately destructured. When the user hand-edits the file (typo, trailing comma, wrong type for a value), the next CLI invocation crashes with a raw JSON parse error or a `TypeError: Cannot read property 'x' of undefined`. The user sees a cryptic stack trace, not a recovery path.

This is not hypothetical. Claude Code's own `.claude.json` had a documented corruption-on-crash bug (GitHub issue #28809 and #15608) caused by non-atomic writes and concurrent processes. The same class of failure hits user-edited config files.

**Why it happens:**
Developers test with well-formed config. No one tests with a config that has a missing key, a wrong-type value, or invalid JSON. When the file is user-visible and user-editable, all three will happen in production.

**Specific failure modes for Burrow v1.3:**
- User edits `config.json` and sets `"loadMode": "laazy"` (typo). Tool silently falls back or crashes depending on where validation lives.
- User upgrades Burrow; new version adds a `"autoThreshold"` key. Old `config.json` has no such key. Code tries to read `config.autoThreshold` and gets `undefined`, then uses it in a comparison.
- User removes the entire `config.json` between sessions (e.g., repo clean, accidental delete). Next CLI invocation fails on missing file rather than re-creating defaults.

**Prevention:**
- Never load config without a `try/catch` around `JSON.parse`.
- Always merge loaded config over a `DEFAULTS` object: `const cfg = { ...DEFAULTS, ...loadedCfg }`. New keys get defaults; old keys are not clobbered.
- Validate the merged config — check that `loadMode` is one of the allowed enum values; clamp `autoThreshold` to a numeric range. If invalid, log a warning and use the default for that key rather than crashing.
- Treat a missing `config.json` as equivalent to an empty file: return `DEFAULTS` and optionally create the file on next save.
- Use the same atomic write pattern (tmp + rename) as `warren.cjs` uses for `cards.json`.

**Detection:**
- CLI crashes with `SyntaxError: Unexpected token` when config is malformed.
- CLI silently behaves as if loadMode is the wrong value.
- Tests fail only when config file is absent or contains new keys.

**Phase to address:** Phase 1 of v1.3 (Config System). The defensive load pattern must be the very first thing built — every subsequent feature depends on it.

---

### Pitfall 2: CLAUDE.md Sentinel Block Variant Switching Corrupts Content

**What goes wrong:**
The sentinel block content changes depending on the chosen `loadMode` (e.g., "full" vs "lazy" vs "index"). The upgrade path writes new content between the existing `<!-- burrow:start -->` and `<!-- burrow:end -->` markers. If the write is interrupted (crash, Ctrl+C, disk-full), the file is partially written and now contains a truncated sentinel block.

Worse: if the markers are searched with `indexOf` and the content between them contains a string that looks like a marker (a user who wrote their own `<!-- burrow:start -->` comment elsewhere in the file, for example), the replacement lands in the wrong place and silently corrupts unrelated content.

The current `writeSentinelBlock()` in `installer.cjs` handles the replace-in-place case but writes directly to the target path (non-atomic). A crash mid-write leaves a partially-written CLAUDE.md.

**Why it happens:**
String-replace on live files without atomic write. The CLAUDE.md file is one of the most user-precious files in the project — it is version-controlled, hand-edited, and read by every Claude session. A corruption here breaks the agent's entire instruction set until the user manually repairs it.

**Specific failure modes for Burrow v1.3:**
- User switches from `full` to `lazy` via `/burrow:config`. The new sentinel content is written. If the process is interrupted between `writeFileSync` of the new content and the rename, CLAUDE.md is half-old/half-new.
- User has customized CLAUDE.md with a comment `<!-- burrow:start of notes -->` (not a real sentinel, but the string contains the marker prefix). `indexOf(SENTINEL_START)` finds the wrong location.
- On upgrade, the sentinel block exists but the installed version used a slightly different marker string (whitespace difference, capitalization). The "does it contain the sentinel?" check fails to find it, so a second block is appended instead of replacing the first.

**Prevention:**
- Make `writeSentinelBlock()` atomic: write the full new CLAUDE.md content to a `.tmp` file, then rename. Never write directly to CLAUDE.md.
- Use exact, distinctive sentinel markers that are highly unlikely to appear in human-written content: `<!-- burrow:start -->` is fine but must be matched as a complete line, not a substring.
- When checking for an existing block, match the start marker at the start of a line (`/^<!-- burrow:start -->$/m`) rather than anywhere in the file.
- Write a dedicated test that simulates: (a) sentinel present and well-formed, (b) sentinel start present but end missing (malformed), (c) sentinel absent, (d) user content that contains the marker string literally. All four must produce correct, non-corrupting behavior.
- The current `writeSentinelBlock()` handles the "start without end" malformed case by replacing from start to EOF — this is correct but should be tested explicitly.

**Detection:**
- CLAUDE.md contains the start marker but not the end marker after a variant switch.
- The agent stops loading cards.json silently (instructions were corrupted and the agent doesn't see the LOAD step).
- A second sentinel block appears in CLAUDE.md (duplicate insertion).

**Phase to address:** Phase 2 of v1.3 (CLAUDE.md snippet variants). Must be addressed before any variant-switching logic ships.

---

### Pitfall 3: Workflow LOAD Step Ignores Config — Behavior Diverges From Config

**What goes wrong:**
The config system (`config.json`) says `loadMode: "index"`. The workflow file (`burrow.md`) still has hardcoded instructions to read `cards.json` directly. The two sources of truth are out of sync. The agent reads config, sees "index", but then the workflow unconditionally reads `cards.json` anyway — or vice versa: the workflow conditionally branches on loadMode but the CLAUDE.md snippet still says "read cards.json on session start."

There are now three places that describe the loading behavior:
1. `config.json` — the setting
2. `burrow.md` workflow — the agent instructions at invocation time
3. CLAUDE.md sentinel block — the session-start instructions

If all three are not updated atomically when the mode changes, the agent receives conflicting instructions across a single session.

**Why it happens:**
The config and the workflow file are edited independently. A developer updates the config write path but forgets to regenerate or switch the workflow snippet. This is a coherence problem, not a code bug — and coherence bugs are invisible until the agent does the wrong thing silently.

**Specific failure modes for Burrow v1.3:**
- User sets `loadMode: "index"` via `/burrow:config`. Config file is updated. CLAUDE.md sentinel block is updated. But the next `/burrow` invocation uses `burrow.md` which still says "read cards.json directly". Two conflicting instructions hit the agent in the same session.
- Fresh install uses `loadMode: "full"` (default). Workflow file hardcodes full-load behavior. Six months later the user changes mode to `lazy`. Workflow is not regenerated. The session-start instruction in CLAUDE.md says lazy, but the invocation-time workflow says full.
- The `burrow index` command is implemented in the CLI but the `lazy` workflow mode still references `cards.json` directly because the workflow was never updated to call `burrow index`.

**Prevention:**
- The LOAD step in `burrow.md` must be mode-aware at runtime, not hardcoded. Instead of "read cards.json", it should say: "Check config.json for loadMode. If 'full', read cards.json. If 'index' or 'lazy', read the index output."
- Alternatively: the workflow always reads `config.json` first (it is tiny — a single JSON file read) and then branches. This is explicit and self-documenting.
- The CLAUDE.md sentinel block and the workflow file should not duplicate the loading strategy. One source of truth: the workflow reads config and decides. CLAUDE.md only needs to say "on session start, check config and load accordingly."
- When testing the `/burrow:config` command, verify that changing the mode actually changes agent behavior — not just that the config file changed.

**Detection:**
- Agent reads full `cards.json` even after `loadMode` was changed to `index`.
- Agent reads the index even when `loadMode` is `full` (loading stale abbreviated data).
- Tests pass because they test the config file write path but not the workflow branch logic.

**Phase to address:** Phase 3 of v1.3 (Workflow LOAD step update). Cannot ship the config system without verifying workflow coherence end-to-end.

---

### Pitfall 4: Installer Upgrade Path Loses Config — Overwrites config.json on Re-install

**What goes wrong:**
The current `performUpgrade()` in `installer.cjs` unconditionally copies `.claude/burrow/` from source to destination. If `config.json` lives inside `.claude/burrow/` (e.g., at `.claude/burrow/config.json` or `.planning/burrow/config.json`), an upgrade overwrites it with the default config from the package. The user's `loadMode` and `autoThreshold` settings are silently reset.

The same logic that currently protects `cards.json` ("never touched on upgrade") must also protect `config.json`. But unlike `cards.json` which lives in `.planning/burrow/`, config's location is not yet decided — if it lands inside `.claude/burrow/`, it gets clobbered by the directory copy.

**Why it happens:**
`copyDirSync` is a blanket recursive copy. Any file that lives in the copied directory gets overwritten. The install/upgrade logic was written before config.json existed, so it has no awareness of it.

**Specific failure modes for Burrow v1.3:**
- User installs v1.3, answers onboarding prompts, sets `loadMode: "lazy"`. Three months later they run `/burrow:update`. The upgrade copies fresh source files including a default `config.json`. User's loadMode is now `"full"` again. No warning is given.
- Fresh install creates default `config.json` in the data dir. Later, `performRepair()` replaces a missing `config.json` — but `performRepair` only copies missing files from source, so it would copy the source default. If the user's config was intentionally deleted (as a reset), this is correct. If it was accidentally deleted, it's data loss.
- A user who has never installed config (pre-v1.3 install) runs the v1.3 installer. The upgrade sees "all core files present, mode=upgrade" and copies `.claude/burrow/` over existing. A default config is created. But the sentinel block in CLAUDE.md still says "full load" (old default) because the upgrade didn't re-prompt or regenerate it.

**Prevention:**
- `config.json` must live in `.planning/burrow/` (the data directory), not in `.claude/burrow/` (the source directory). This mirrors the `cards.json` pattern: source code in `.claude/burrow/`, user data in `.planning/burrow/`. The upgrade logic already explicitly preserves everything in `.planning/burrow/`.
- Add `config.json` to the "never overwrite on upgrade" list alongside `cards.json`.
- When upgrading from pre-v1.3 to v1.3, detect the absence of `config.json` and create it with defaults (don't prompt on upgrade — prompt was only for fresh install). Log a single line: "Config created with default settings. Run /burrow:config to change."
- Document the invariant in a comment in `installer.cjs`: `.planning/burrow/` is user data, never overwritten.

**Detection:**
- After running `/burrow:update`, the user's loadMode setting reverts to default.
- The upgrade logs "upgraded" but does not mention config being reset.
- Post-upgrade, the CLAUDE.md sentinel block does not match the user's config.

**Phase to address:** Phase 1 of v1.3 (Config System) — decide the file location before writing any other config logic. Phase 4 of v1.3 (Installer onboarding) — verify the upgrade path preserves the file.

---

### Pitfall 5: Onboarding Prompts Re-Ask on Every Upgrade

**What goes wrong:**
The installer detects `mode: "upgrade"` but still presents the full onboarding questionnaire about `loadMode`. The user already made this decision. Being asked again on upgrade is confusing ("did my setting get wiped?") and undermines trust. Alternatively, the installer skips onboarding prompts entirely on upgrade but also fails to notify the user that a new configurable option was introduced — leaving users on the old behavior forever with no path to discover the new option.

**Why it happens:**
The upgrade path is built to mirror the fresh-install path for simplicity. Adding an "is this an upgrade? skip prompts" branch is an afterthought. The result is inconsistent: some prompts are skipped, some aren't, and the user cannot predict which.

**Specific failure modes for Burrow v1.3:**
- User re-runs `npx create-burrow` on an existing project. Installer detects upgrade mode. Asks "How should Burrow load context? (full / lazy / index)". User already configured this six months ago and doesn't remember their setting. They pick the default. Their config is now overwritten.
- User upgrades from v1.2 to v1.3 (which introduces `loadMode`). No prompt is shown. They never learn that lazy loading exists. They stay on `full` mode paying 95% more token cost than necessary.
- `--yes` flag is passed on upgrade. The installer silently creates config with defaults and overwrites existing config.

**Prevention:**
- On `mode: "upgrade"`, if `config.json` already exists: skip all config prompts. The user's settings are preserved implicitly.
- On `mode: "upgrade"`, if `config.json` does NOT exist (first v1.3 upgrade from pre-v1.3): show a single one-line notice: "New in this version: configurable context loading. Default is 'full'. Run /burrow:config to change." Then create config with defaults, no prompt.
- `--yes` on upgrade must never overwrite user data. `--yes` means "accept defaults for anything not already configured" — not "replace everything."
- The guiding principle: upgrades are silent unless something breaks or something new requires user decision that cannot have a safe default.

**Detection:**
- Users report being asked for settings they already configured.
- Users on old versions never discover new features (silent default adoption without notification).
- `--yes` upgrade wipes config.

**Phase to address:** Phase 4 of v1.3 (Installer onboarding). Design the upgrade path before building any prompt logic.

---

## Moderate Pitfalls

Mistakes that cause incorrect behavior but are recoverable without data loss.

---

### Pitfall 6: `burrow index` Output Schema Is Unstable — Agents Hardcode Structure

**What goes wrong:**
The `burrow index` command outputs a lightweight JSON tree (titles + IDs only). The workflow file for `loadMode: "index"` describes what fields to expect from this output. If the index output schema changes in a later version (e.g., adding `archived` flag, adding `childCount`), the workflow instructions become stale. The agent reads the new output but the instructions describe the old schema — causing misinterpretation or silent data truncation.

**Why it happens:**
CLI output schemas are rarely versioned. Developers add a field "for convenience" without realizing the workflow file depends on knowing exactly what fields exist.

**Prevention:**
- Define the `burrow index` output schema explicitly in a comment in the source, parallel to the `cards.json` schema definition in PROJECT.md.
- When changing the index output, search for and update all workflow files that reference it (a `grep` for `burrow index` in `.claude/` files).
- Keep the index output minimal: only fields the workflow actually uses. Resist adding fields speculatively.

**Phase to address:** Phase 1 of v1.3 (burrow index command). Lock the schema before writing the workflow.

---

### Pitfall 7: `loadMode: "lazy"` Skips Load on Session Start — Agent Has No Context for First Command

**What goes wrong:**
`loadMode: "lazy"` means the agent does not read `cards.json` at session start. It reads on the first `/burrow` invocation. But the CLAUDE.md session-start instructions may be used by the agent for non-burrow purposes ("remember to track todos as Burrow cards"). If the agent references a Burrow card in a non-burrow context (e.g., "check if the OAuth bug is still open") before any `/burrow` command is issued, it has no data in memory and either hallucinates or gives an "I don't have that context" response.

**Why it happens:**
Lazy loading assumes the agent only reads Burrow data when explicitly invoked via `/burrow`. But CLAUDE.md instructions are always active — they may prompt the agent to reference card data in any context.

**Prevention:**
- The CLAUDE.md snippet for `lazy` mode must be explicit: "Do NOT reference Burrow card data unless you have explicitly loaded it in this session."
- Alternatively: `lazy` mode does not change CLAUDE.md at all — it only changes the workflow's LOAD step behavior. The user simply does not get the "silently load on session start" behavior. This is simpler and safer.
- Document this tradeoff clearly in the config prompt and in `/burrow:config` output: "lazy mode reduces token cost but cards are not available until you run /burrow."

**Phase to address:** Phase 3 of v1.3 (Workflow LOAD step). Requires explicit behavioral specification before implementation.

---

### Pitfall 8: Auto-Threshold for Mode Switching Is Checked at Wrong Time

**What goes wrong:**
If `loadMode: "auto"` switches between `full` and `index` based on `cards.json` size, the check must happen at load time — not at install time or config-write time. A project starts small (full load is fine) and grows over months. If the auto-threshold check is only run during install/config-change, the mode never automatically switches even as the tree grows. Conversely, if the check runs on every CLI invocation regardless of mode, it adds a file stat call to every command.

**Why it happens:**
The auto-threshold feature sounds simple ("switch modes when file gets big") but requires answering when the check runs, how often, and what happens when it flips back and forth (a file that grows past threshold, then some cards are archived and it drops below threshold).

**Prevention:**
- If `loadMode: "auto"` is implemented, define exactly one check point: the LOAD step in the workflow, not the CLI.
- The CLI `burrow index` command does not need to know about thresholds — it just outputs the index. Mode selection is the workflow's concern.
- Consider whether hysteresis is needed: once in `index` mode (because tree exceeded threshold), stay there even if the tree shrinks temporarily. This prevents flapping.
- If the complexity is too high, defer `auto` mode to a later milestone and ship only explicit `full` / `index` / `lazy` for v1.3.

**Phase to address:** Phase 3 of v1.3 (Workflow LOAD step). If `auto` mode is deferred, this pitfall is avoided entirely.

---

### Pitfall 9: `/burrow:config` Command Changes Config But Not CLAUDE.md — Split State

**What goes wrong:**
The user runs `/burrow:config set loadMode lazy`. The command updates `config.json` correctly. But the CLAUDE.md sentinel block still contains the instructions for `full` mode ("silently read cards.json on session start"). The new config takes effect for all `/burrow` invocations (because the workflow reads config at invocation time), but the session-start behavior is still full-load until the user re-runs the installer or manually updates CLAUDE.md.

The user observes: "I set it to lazy but cards.json is still being loaded at session start." They're right. The config and the CLAUDE.md are out of sync.

**Why it happens:**
The `/burrow:config` command updates one file (config.json). The CLAUDE.md update is treated as an installer concern, not a config-change concern. The two are decoupled by design but the user's mental model couples them ("changing the mode should change everything").

**Prevention:**
- `/burrow:config set loadMode <value>` must update both `config.json` AND regenerate the CLAUDE.md sentinel block atomically (using `writeSentinelBlock()` with the appropriate snippet variant).
- If CLAUDE.md cannot be found (e.g., user deleted it), log a warning: "config.json updated. CLAUDE.md not found — session-start behavior unchanged. Re-run the installer to fix."
- Treat config changes and sentinel block updates as a single transaction: if either write fails, the command should report the partial failure clearly.

**Detection:**
- After `/burrow:config set loadMode lazy`, agent still reads cards.json at session start.
- `config.json` says `lazy`, CLAUDE.md snippet says `full`. Diverged state.

**Phase to address:** Phase 4 of v1.3 (`/burrow:config` command). The command must be aware of CLAUDE.md from day one.

---

## Minor Pitfalls

Small mistakes with limited blast radius.

---

### Pitfall 10: Config File Added to `.gitignore` Accidentally

**What goes wrong:**
`cards.json.bak` is correctly gitignored. If `config.json` is added to the same gitignore block by mistake, users lose their config settings when switching branches or checking out a fresh clone. This is particularly insidious because the user might not notice for a long time — the tool auto-creates a default config, so there's no error. Their `loadMode` preference just silently resets on clone.

**Prevention:**
- `config.json` should be committed (like `cards.json` itself). Add only `.planning/burrow/config.json.bak` and `.planning/burrow/.update-check` to `.gitignore`.
- Document the commit intent: "config.json is project-level config, intentionally version-controlled."
- In `ensureGitignoreEntry()`, only add the `.bak` extension for backup files and the `.update-check` for the version cache.

**Phase to address:** Phase 1 of v1.3 (Config System). Verify gitignore entries when designing the file layout.

---

### Pitfall 11: `--yes` Flag Silently Misses New Prompts

**What goes wrong:**
The `--yes` flag currently means "accept all defaults in non-interactive mode." When a new onboarding prompt is added (e.g., "Which loadMode would you like?"), the `--yes` code path must explicitly map it to a default. If the developer adds the prompt but forgets to add the `--yes` branch, the installer hangs waiting for input in non-interactive CI environments.

**Prevention:**
- Each interactive prompt must have a documented default that is also the `--yes` value.
- Test the full install flow with `--yes` as part of the installer test suite.
- Structure the prompt code so the default is a constant shared between the interactive and non-interactive paths, not hardcoded in two places.

**Phase to address:** Phase 4 of v1.3 (Installer onboarding).

---

### Pitfall 12: `burrow index` Output Is Not Atomic — Partial Reads Are Possible

**What goes wrong:**
`burrow index` writes its output to stdout. The agent reads this output. If `cards.json` is very large and index generation takes non-zero time while another process is modifying `cards.json`, the index output may reflect a partially-written tree. This is extremely unlikely in practice (the read is fast, mutations are atomic), but the risk is real in projects where the agent and user are both active simultaneously.

This is a low-probability issue but worth flagging because it's the same class as the race condition in the old YAML-based design.

**Prevention:**
- `burrow index` reads `cards.json` using the same `load()` function from `warren.cjs` — which reads the whole file atomically as a single `readFileSync` call. No streaming, no partial read. The index is generated from the fully-loaded in-memory tree. This is already correct by construction given the existing storage layer.
- No additional work needed — just verify this is the implementation path and add a test that confirms the index uses `warren.load()` not a raw `readFileSync`.

**Phase to address:** Phase 1 of v1.3 (burrow index command). Verify during implementation, not after.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| Config system (Phase 1) | Non-defensive JSON load crashes on user hand-edit | Merge-over-defaults pattern, validate enum fields, never crash |
| Config system (Phase 1) | Config file inside `.claude/burrow/` gets overwritten on upgrade | Put `config.json` in `.planning/burrow/` alongside `cards.json` |
| Config system (Phase 1) | Config added to `.gitignore` accidentally | Only gitignore `.bak` and `.update-check`, never `config.json` itself |
| `burrow index` command (Phase 1) | Schema instability causes workflow mismatch | Lock schema in a comment before writing workflow |
| CLAUDE.md variants (Phase 2) | Non-atomic write corrupts CLAUDE.md on crash | Write to `.tmp`, rename atomically — same pattern as `warren.cjs` |
| CLAUDE.md variants (Phase 2) | Sentinel marker matched as substring in user content | Match sentinel markers at start-of-line, not as arbitrary substring |
| Workflow LOAD step (Phase 3) | Workflow hardcodes loading strategy, ignores config | Workflow reads `config.json` and branches; workflow is the single LOAD authority |
| Workflow LOAD step (Phase 3) | CLAUDE.md and workflow give conflicting instructions | One source of truth: workflow decides, CLAUDE.md only says "follow workflow" |
| `lazy` mode (Phase 3) | Agent has no card context for non-burrow references | Document that lazy mode means no ambient card context; cards only available after first `/burrow` |
| `auto` threshold (Phase 3) | Mode flaps on tree size changes | Implement hysteresis or defer `auto` mode to v1.4 |
| Installer onboarding (Phase 4) | Re-prompts existing users on upgrade | Detect existing `config.json`; skip prompts, preserve settings |
| Installer onboarding (Phase 4) | Pre-v1.3 upgrade silently gets default config with no notification | Log one-line notice on first-time config creation |
| `/burrow:config` command (Phase 4) | Config change does not update CLAUDE.md — split state | `/burrow:config set` updates both `config.json` and CLAUDE.md sentinel block |
| `--yes` flag (Phase 4) | New prompts not handled in non-interactive mode — hangs | Every prompt has an explicit `--yes` default; test non-interactive path |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `warren.cjs` save pattern | Config write doesn't use same atomic pattern | Implement `saveConfig()` in parallel to `warren.save()` — same tmp+rename pattern |
| `installer.cjs` upgrade path | `copyDirSync` silently overwrites user config | Config lives in `.planning/burrow/`, not `.claude/burrow/` — immune to `copyDirSync` |
| `writeSentinelBlock()` | Direct `writeFileSync` to CLAUDE.md | Refactor to write-to-tmp, then rename — same as warren.cjs |
| `burrow.md` workflow | Hardcoded `cards.json` load instruction | Read `config.json` first, then branch on `loadMode` |
| `version.cjs` update cache | `.update-check` accidentally gitignored with `config.json` | `.update-check` is gitignored (ephemeral cache), `config.json` is not (user data) |
| `init.cjs` legacy init | Old `init` uses `## Burrow` heading detection, not sentinel | Post-v1.3, detection should use sentinel markers, not heading text |

---

## Recovery Strategies

| Scenario | Recovery Cost | Recovery Steps |
|----------|---------------|----------------|
| `config.json` corrupted by hand-edit | LOW | CLI detects parse failure, logs clear error identifying the field. User deletes file or fixes it. Defaults are recreated on next invocation. |
| CLAUDE.md sentinel block corrupted | MEDIUM | User runs `node .claude/burrow/burrow-tools.cjs init` (or installer repair). Sentinel is re-inserted from current config. User's non-Burrow CLAUDE.md content is preserved. |
| Config lost on upgrade (wrong file location) | MEDIUM | User re-runs `/burrow:config` to set preferences. Data (`cards.json`) is unaffected. |
| `lazy` mode; agent references cards without loading | LOW | User runs `/burrow` to trigger explicit load, then asks again. No data loss — the mode just deferred the load. |
| CLAUDE.md and config.json in split state after failed config change | LOW | Run `/burrow:config set loadMode <value>` again — idempotent. Or reinstall. |

---

## "Looks Done But Isn't" Checklist

- [ ] **Config defensive load:** Test with missing `config.json`, malformed JSON, missing keys, wrong-type values, unknown keys. All produce defaults or clear errors, never crashes.
- [ ] **Config upgrade preservation:** Test `performUpgrade()` with an existing `config.json`. Verify it is NOT overwritten.
- [ ] **Sentinel atomicity:** Simulate process kill mid-write during a variant switch. CLAUDE.md must be either fully old or fully new, never partial.
- [ ] **Sentinel marker search:** Test with CLAUDE.md that contains the sentinel string as a false positive in user content. Verify the replacement lands in the correct location.
- [ ] **Workflow coherence:** After `/burrow:config set loadMode lazy`, verify the agent does NOT load cards.json at session start AND does NOT reference card data before a `/burrow` invocation.
- [ ] **Upgrade from v1.2:** Run installer upgrade from pre-v1.3. Verify no prompts, one-line notice, default config created, cards.json preserved, existing CLAUDE.md sentinel block updated.
- [ ] **`--yes` non-interactive:** Full install and upgrade with `--yes`. No hanging. Defaults applied. No user data overwritten.
- [ ] **`/burrow:config` atomicity:** After `set loadMode <value>`, verify both `config.json` and CLAUDE.md sentinel block reflect the new value. Test with CLAUDE.md absent (config updates, warning logged, no crash).

---

## Sources

- Direct inspection of `installer.cjs`, `warren.cjs`, `version.cjs`, `init.cjs`, `burrow-tools.cjs`, and `burrow.md` (HIGH confidence — current codebase)
- Claude Code GitHub issue #28809: `.claude.json` becomes corrupted with non-atomic writes during tool use (HIGH confidence — official repo, documented 2025)
- Claude Code GitHub issue #15608: config file corruption when multiple processes run concurrently (HIGH confidence — official repo)
- Claude Code GitHub issues #7336, #11364, #16458, #19105: lazy loading context overhead and mode-switching failure rates (MEDIUM confidence — feature request threads, not official docs)
- Lazy-loaded prompt engineering patterns article (gopubby.com): "skill discovery fails 10–20% of the time" with lazy loading (LOW confidence — single source, unverified)
- JSON schema evolution best practices: backward-compatible field additions, default values, versioned schemas (MEDIUM confidence — multiple sources agree on merge-over-defaults pattern)
- Original `PITFALLS.md` (2026-03-06) for foundational pitfalls still applicable to the core engine (HIGH confidence — prior research)

---

*Pitfalls research for: Burrow v1.3 — Onboarding & Configuration*
*Researched: 2026-04-01*
*Scope: Config system, context loading modes, CLAUDE.md variants, installer upgrade path, /burrow:config command*
