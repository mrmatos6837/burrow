# Phase 9: Installer Rewrite - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the current simple `install.cjs` (127 LOC, no prompts, no detection) with a guided interactive installer that handles fresh installs, upgrades, repairs, CLAUDE.md opt-in with sentinel markers, non-interactive mode (`--yes`), and clean uninstall (`--uninstall`). Re-running on an existing install upgrades cleanly without touching user data.

Requirements covered: INST-01, INST-02, INST-03, INST-04, INST-05, UPD-01

</domain>

<decisions>
## Implementation Decisions

### Prompt flow & UX
- First prompt: install path (default: current directory)
- Second prompt: CLAUDE.md opt-in (only other prompt)
- No additional prompts — everything else uses sensible defaults
- Output style: checklist with checkmarks (✓ done, · skipped) — like current installer but improved
- Post-install "getting started" message: Claude's discretion on content/length

### Detection & upgrade behavior
- Detection checks ALL core files (source, commands, data, CLAUDE.md section) — not just one marker file
- Three modes: fresh install, upgrade (all files present), repair (some files missing)
- Both upgrade and repair ask user for confirmation before proceeding
- `--yes` flag skips ALL prompts across all modes (fresh, upgrade, repair)
- Source file replacement: unconditional — replace all source files, no diffing
- Show version info on upgrade: "Upgrading burrow: v1.1 → v1.2"
- Create directories as needed — don't gate on prerequisites like existing .claude/ or git repo
- On upgrade, replace CLAUDE.md sentinel block with new version

### CLAUDE.md handling
- Opt-in prompt wording: explain what CLAUDE.md instructions do, then ask (default yes)
- Placement: append to end of CLAUDE.md
- Sentinel markers: `<!-- burrow:start -->` and `<!-- burrow:end -->` (HTML comments, invisible in rendered markdown)
- On upgrade: replace everything between sentinels with new version
- If user declines: brief note — "Skipped. Run the installer again to add it later."
- If user previously had non-sentinel burrow section (legacy): Claude's discretion on migration

### Uninstall design
- Invocation: `--uninstall` flag on same installer (no separate script)
- Confirmation: required with default NO (destructive action) — skipped with `--yes`
- Scope: remove EVERYTHING — .claude/burrow/, .claude/commands/burrow/, .claude/commands/burrow.md, .planning/burrow/, and CLAUDE.md sentinel block
- Clean up empty parent directories after file removal (no orphan dirs)

### Claude's Discretion
- Post-install message content and length
- Directory prerequisite handling (create vs warn)
- Stale file cleanup approach on upgrade (files that existed in old version but not new)
- Legacy CLAUDE.md migration (non-sentinel burrow sections from pre-v1.2)

</decisions>

<specifics>
## Specific Ideas

- User wants the uninstall to be "easy and clean" — nothing left behind
- Detection should comprehensively check all core files, not just one marker — repair anything missing
- Installer should "just work" — create directories as needed, don't require prerequisites
- Version display on upgrade gives user confidence they're getting the right update

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `install.cjs`: Current installer (127 LOC) — has copyDirSync, ensureDir helpers and CLAUDE_MD_SNIPPET const that can be evolved
- `ok()`, `skip()`, `fail()` helpers — good output pattern to keep and extend

### Established Patterns
- Zero external dependencies — installer must use Node.js built-ins only (fs, path, readline)
- CommonJS (.cjs) throughout
- Atomic writes pattern in warren.cjs (tmp + rename) — could inform safe file operations

### Integration Points
- Source files: `.claude/burrow/` (burrow-tools.cjs, lib/, workflows/)
- Commands: `.claude/commands/burrow.md` + `.claude/commands/burrow/` (9 subcommand .md files)
- Data: `.planning/burrow/cards.json` (must be preserved on upgrade, deleted on uninstall)
- CLAUDE.md: sentinel-wrapped instruction block

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-installer-rewrite*
*Context gathered: 2026-03-14*
