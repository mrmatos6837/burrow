---
phase: 04-agent-interface
verified: 2026-03-08T21:30:00Z
status: passed
score: 10/10 must-haves verified
re_verification: false
---

# Phase 4: Agent Interface Verification Report

**Phase Goal:** Users interact with Burrow through natural language and shortcut commands via `/burrow:*` namespace -- the agent interprets intent, calls CLI operations, and passes through the tool's rendered output
**Verified:** 2026-03-08T21:30:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Workflow file defines agent invariants, command reference, rendering rules, and worked examples | VERIFIED | `.claude/burrow/workflows/burrow.md` has 6 invariants, 9-command reference table, rendering rules, NL parsing section, 4 worked examples, tone guidelines |
| 2 | User can type /burrow with natural language and the agent interprets intent, calls CLI, and presents results | VERIFIED | `.claude/commands/burrow/burrow.md` has frontmatter with `name: burrow`, `$ARGUMENTS` processing, `@` reference to workflow, process steps for NL parsing |
| 3 | Agent shows what command it is running before executing (transparency) | VERIFIED | Workflow specifies: "Running: `burrow <command> <args>`" format; all 4 worked examples demonstrate this pattern |
| 4 | /burrow with no args shows root view at depth 1 | VERIFIED | Command file process step 2: "If empty, run: node .claude/burrow/burrow-tools.cjs get"; workflow default behavior section confirms |
| 5 | User can run /burrow:add with structured flags to create a card | VERIFIED | `add.md` maps `$ARGUMENTS` to `burrow-tools.cjs add` |
| 6 | User can run /burrow:show with optional ID and depth to view tree | VERIFIED | `show.md` maps to `burrow-tools.cjs get` (correct show-to-get mapping) |
| 7 | User can run /burrow:move with ID and --to flag to move a card | VERIFIED | `move.md` maps to `burrow-tools.cjs move` |
| 8 | User can run /burrow:archive with ID to archive a card | VERIFIED | `archive.md` maps to `burrow-tools.cjs archive` |
| 9 | User can run /burrow:help to see usage examples | VERIFIED | `help.md` outputs command reference table with all 10 commands and 4 usage examples; `allowed-tools: []` (no CLI needed) |
| 10 | All shortcut commands pass through CLI output without reformatting | VERIFIED | Every shortcut includes "Output the CLI result directly. Do not reformat or wrap in code blocks." |

**Score:** 10/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.claude/burrow/workflows/burrow.md` | Agent behavior definition | VERIFIED | 119 lines. Contains Invariants, Command Reference, Rendering Rules, NL Intent Parsing, 4 Worked Examples, Tone and Style. References `burrow-tools.cjs`. |
| `.claude/commands/burrow/burrow.md` | NL parser slash command | VERIFIED | 32 lines. Frontmatter with `name: burrow`, `allowed-tools: [Bash, Read]`. `@` references workflow. Processes `$ARGUMENTS`. |
| `.claude/commands/burrow/add.md` | /burrow:add shortcut | VERIFIED | Thin wrapper. Maps to `burrow-tools.cjs add`. |
| `.claude/commands/burrow/show.md` | /burrow:show shortcut | VERIFIED | Maps to `burrow-tools.cjs get` (correct naming abstraction). |
| `.claude/commands/burrow/edit.md` | /burrow:edit shortcut | VERIFIED | Maps to `burrow-tools.cjs edit`. |
| `.claude/commands/burrow/move.md` | /burrow:move shortcut | VERIFIED | Maps to `burrow-tools.cjs move`. |
| `.claude/commands/burrow/delete.md` | /burrow:delete shortcut | VERIFIED | Includes confirmation step: shows target via `get` before delete. |
| `.claude/commands/burrow/archive.md` | /burrow:archive shortcut | VERIFIED | Maps to `burrow-tools.cjs archive`. |
| `.claude/commands/burrow/unarchive.md` | /burrow:unarchive shortcut | VERIFIED | Maps to `burrow-tools.cjs unarchive`. |
| `.claude/commands/burrow/dump.md` | /burrow:dump shortcut | VERIFIED | Maps to `burrow-tools.cjs dump`. |
| `.claude/commands/burrow/help.md` | /burrow:help reference | VERIFIED | Static text output. `allowed-tools: []`. Lists all 10 commands with examples. |
| `.planning/REQUIREMENTS.md` | Updated with /burrow:* namespace | VERIFIED | CMDS-01 through CMDS-06 updated. Note about expanded surface. No old `/gsd:burrow` or `/gsd:bw-*` references. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `.claude/commands/burrow/burrow.md` | `.claude/burrow/workflows/burrow.md` | `@` reference in execution_context | WIRED | `@./.claude/burrow/workflows/burrow.md` on line 15 |
| `.claude/burrow/workflows/burrow.md` | `.claude/burrow/burrow-tools.cjs` | CLI invocation instructions | WIRED | Path referenced in overview, command reference, and all 4 worked examples |
| `.claude/commands/burrow/add.md` | `.claude/burrow/burrow-tools.cjs` | Bash invocation | WIRED | `node .claude/burrow/burrow-tools.cjs add $ARGUMENTS` |
| `.claude/commands/burrow/show.md` | `.claude/burrow/burrow-tools.cjs` | Bash invocation (show->get) | WIRED | `node .claude/burrow/burrow-tools.cjs get $ARGUMENTS` |
| Shortcuts (edit, move, delete, archive, unarchive, dump) | `.claude/burrow/burrow-tools.cjs` | Bash invocation | WIRED | All reference correct CLI commands |
| Shortcuts (add, show, edit, move, delete, archive, unarchive, dump) | workflow file | Should NOT reference | VERIFIED | Only `burrow.md` loads workflow; no shortcuts reference it |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CMDS-01 | 04-01 | `/burrow` handles any natural language command | SATISFIED | `burrow.md` command + workflow file handle NL intent |
| CMDS-02 | 04-02 | `/burrow:add` shortcut for quick card creation | SATISFIED | `add.md` exists, maps to `burrow-tools.cjs add` |
| CMDS-03 | 04-02 | `/burrow:show` shortcut for viewing tree | SATISFIED | `show.md` exists, maps to `burrow-tools.cjs get` |
| CMDS-04 | 04-02 | `/burrow:move` shortcut for moving cards | SATISFIED | `move.md` exists, maps to `burrow-tools.cjs move` |
| CMDS-05 | 04-02 | `/burrow:archive` shortcut for archiving | SATISFIED | `archive.md` exists, maps to `burrow-tools.cjs archive` |
| CMDS-06 | 04-01 | Workflow file defines agent behavior | SATISFIED | `workflows/burrow.md` with invariants, command ref, examples |

No orphaned requirements found. All 6 CMDS-* IDs are accounted for across plans 04-01 and 04-02.

### Anti-Patterns Found

None. All files are clean -- no TODO, FIXME, PLACEHOLDER, or stub patterns detected.

### Human Verification Required

### 1. Natural Language Intent Parsing

**Test:** Type `/burrow add a card called "fix auth" under bugs` and verify the agent ingests the tree, resolves "bugs", and runs the correct CLI command
**Expected:** Agent runs `get --depth 0 --json`, finds the bugs card, shows "Running: burrow add ...", executes, and outputs CLI result without reformatting
**Why human:** NL parsing is agent behavior at runtime -- cannot verify statically that the agent correctly interprets arbitrary natural language

### 2. Ambiguity Resolution

**Test:** Create two cards with similar names (e.g., "Login page" and "Login bug"), then type `/burrow archive the login card`
**Expected:** Agent lists both matches and asks which one before proceeding
**Why human:** Requires runtime agent behavior following invariant 3

### 3. Delete Confirmation Flow

**Test:** Run `/burrow:delete <id>` on a card with children
**Expected:** Agent shows the card and its children first, asks for confirmation, only deletes after user confirms
**Why human:** Requires interactive agent behavior following invariant 1 and delete.md instructions

### 4. Shortcut Command Registration

**Test:** Verify that Claude Code recognizes `/burrow:add`, `/burrow:show`, etc. as valid slash commands in the command palette
**Expected:** All 10 commands appear and are invocable
**Why human:** Command registration depends on Claude Code's runtime directory scanning behavior

---

_Verified: 2026-03-08T21:30:00Z_
_Verifier: Claude (gsd-verifier)_
