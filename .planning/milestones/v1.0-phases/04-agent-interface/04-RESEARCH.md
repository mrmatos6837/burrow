# Phase 4: Agent Interface - Research

**Researched:** 2026-03-08
**Domain:** Claude Code custom slash commands, agent workflow design, NL intent parsing
**Confidence:** HIGH

## Summary

Phase 4 creates the user-facing agent interface for Burrow: a set of Claude Code slash command `.md` files and a workflow/behavior document that instructs the agent how to interpret natural language, call CLI operations, and present results. This is primarily a **content authoring** phase, not a code engineering phase -- the deliverables are markdown files that define agent behavior.

The core challenge is designing a workflow file that gives the agent enough structure to be predictable while keeping the rules minimal enough to avoid rigidity. The existing CLI (`burrow-tools.cjs`) already handles all data operations with pretty-print rendering; the agent layer just needs to know when/how to call it and how to present results.

**Primary recommendation:** Structure as two deliverables: (1) slash command `.md` files in `.claude/commands/burrow/` that wire user invocations to the workflow, and (2) a single `burrow.md` workflow file that defines all agent behavior, guardrails, and worked examples.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Burrow is its own tool, not a GSD addon. Commands use `/burrow:*` namespace
- `/burrow` -- NL parser (main entry point). With no args, shows root view at depth 1
- `/burrow:help` -- usage examples and command reference
- Full shortcut surface -- every CLI operation gets a direct slash command: `/burrow:add`, `/burrow:show`, `/burrow:edit`, `/burrow:move`, `/burrow:delete`, `/burrow:archive`, `/burrow:unarchive`, `/burrow:dump`
- GSD integration deferred to v2
- Shortcuts require structured parameters -- no NL interpretation. Mirror CLI tool flags exactly
- `/burrow` is the only command that accepts plain English
- When `/burrow` parses NL, it shows what command it's running (transparency)
- Agent runs CLI without --json and passes rendered output straight to the user
- Agent never re-renders or reformats tool output
- For multi-step operations: agent writes a plain English summary then runs get to show end state
- Agent uses --json behind the scenes when it needs to parse data
- Hard rules (invariants): never delete without confirmation, never modify without explicit request, always clarify ambiguous references, always use tool output for rendering, never show raw JSON unless asked, read before write
- Tone: Functional and terse
- REQUIREMENTS.md needs updating to reflect `/burrow:*` namespace

### Claude's Discretion
- Workflow file organization and section layout
- Number and selection of worked examples
- Whether shortcut commands are thin wrappers or self-contained
- Command file locations (.claude/commands/burrow/ vs .claude/burrow/commands/)
- Whether to include a brief data model section in the workflow
- When to show more or less context after mutations
- How to handle edge cases not covered by rules

### Deferred Ideas (OUT OF SCOPE)
- GSD integration (teaching GSD about Burrow) -- deferred to v2
- Color/ANSI support
- Search command
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CMDS-01 | `/burrow` handles any natural language command (agent interprets intent) | Workflow file NL parsing section with worked examples; main command .md file |
| CMDS-02 | `/burrow:add` shortcut for quick card creation | Shortcut command .md file mirroring CLI `add --title --parent --body` flags |
| CMDS-03 | `/burrow:show` shortcut for viewing tree at specified depth/focus | Shortcut command .md file mirroring CLI `get [id] [--depth N] [--full]` flags |
| CMDS-04 | `/burrow:move` shortcut for moving cards | Shortcut command .md file mirroring CLI `move <id> --to <parent>` flags |
| CMDS-05 | `/burrow:archive` shortcut for archiving cards | Shortcut command .md file mirroring CLI `archive <id>` |
| CMDS-06 | Workflow file (`burrow.md`) defines agent behavior for all interactions | Central workflow file with invariants, command reference, rendering rules, worked examples |
</phase_requirements>

## Standard Stack

### Core
| Asset | Type | Purpose | Why Standard |
|-------|------|---------|--------------|
| `.claude/commands/burrow/*.md` | Slash command files | User-invokable commands via `/burrow:*` | Standard Claude Code custom command location |
| `burrow.md` workflow | Workflow/behavior doc | Agent behavior definition | Referenced by all command files via `@` syntax |
| `burrow-tools.cjs` | CLI tool | All CRUD + view operations | Already built in Phases 1-3, fully tested |

### Supporting
| Asset | Type | Purpose | When to Use |
|-------|------|---------|-------------|
| `lib/render.cjs` | Render module | Pretty-print output | Agent passes through this output directly |
| `lib/mongoose.cjs` | Tree engine | Tree operations | Agent calls via CLI, not directly |

### No External Dependencies
This phase creates only markdown files. Zero npm packages needed.

## Architecture Patterns

### Recommended File Structure
```
.claude/
├── commands/
│   └── burrow/
│       ├── burrow.md          # /burrow — NL parser (main entry)
│       ├── help.md            # /burrow:help
│       ├── add.md             # /burrow:add
│       ├── show.md            # /burrow:show (maps to CLI `get`)
│       ├── edit.md            # /burrow:edit
│       ├── move.md            # /burrow:move
│       ├── delete.md          # /burrow:delete
│       ├── archive.md         # /burrow:archive
│       ├── unarchive.md       # /burrow:unarchive
│       └── dump.md            # /burrow:dump
└── burrow/
    ├── burrow-tools.cjs       # (existing) CLI tool
    ├── lib/                   # (existing) core libraries
    └── test/                  # (existing) test suite
```

**Rationale:** `.claude/commands/burrow/` is the standard Claude Code location for project-scoped custom commands. A file at `commands/burrow/add.md` becomes `/burrow:add`. The file `commands/burrow/burrow.md` becomes `/burrow` (the directory-named default).

### Pattern 1: Slash Command File Format
**What:** Each `.md` file in `.claude/commands/` defines a slash command with YAML frontmatter and structured sections.
**When to use:** Every command file.
**Example:**
```markdown
---
name: burrow:add
description: Add a new card to the burrow
argument-hint: --title "card title" [--parent <id>] [--body "content"]
allowed-tools:
  - Bash
  - Read
---
<objective>
Add a card to the burrow tree.
</objective>

<execution_context>
@./.claude/burrow/workflows/burrow.md
</execution_context>

<context>
Arguments: $ARGUMENTS
</context>

<process>
Parse the provided flags and run the CLI command:
node .claude/burrow/burrow-tools.cjs add $ARGUMENTS
Output the result directly.
</process>
```

### Pattern 2: Thin Wrapper Shortcuts
**What:** Shortcut commands are minimal -- they parse `$ARGUMENTS` and shell out to `burrow-tools.cjs`. No NL interpretation, no workflow complexity.
**When to use:** All `/burrow:add`, `/burrow:show`, etc.
**Why:** Shortcuts mirror CLI flags exactly. The workflow file is only loaded by `/burrow` (NL parser). Keeping shortcuts thin avoids context cost.

**Recommendation:** Shortcuts should NOT load the full workflow file via `@` reference. They just need the CLI path and flag mapping. The workflow is only needed for `/burrow` NL parsing.

### Pattern 3: NL Parser Workflow
**What:** The `/burrow` command loads the full workflow file, which teaches the agent to interpret natural language, resolve card references, chain operations, and present results.
**When to use:** Only the main `/burrow` command.
**Example flow:**
1. User types `/burrow move the login bug under authentication`
2. Agent loads workflow, reads tree state via `--json` to find cards
3. Agent resolves "login bug" and "authentication" to IDs
4. Agent shows what it will run: `burrow move a1b2c3d4 --to b5c6d7e8`
5. Agent runs the command (without --json) and passes output directly

### Pattern 4: CLI Path Reference
**What:** All command files need to reference the CLI tool. Use consistent path.
**Standard path:** `node .claude/burrow/burrow-tools.cjs`
**When:** Every Bash tool call to burrow.

### Anti-Patterns to Avoid
- **Re-rendering tool output:** Agent MUST NOT parse pretty-print output and reformat it. Pass through directly.
- **Loading full workflow for shortcuts:** Shortcuts don't need the NL parsing context. Keep them lightweight.
- **Hardcoding card IDs in examples:** Use descriptive placeholders.
- **Over-constraining agent behavior:** The user explicitly wants minimal invariants, not a rulebook.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Card CRUD operations | Custom agent logic | `burrow-tools.cjs` CLI | Already tested, atomic writes, proper error handling |
| Output formatting | Agent-side rendering | CLI's default pretty-print | One rendering path, consistency guaranteed |
| Data parsing for NL | Custom JSON parsing | `burrow-tools.cjs get --json` | Structured output with proper error codes |
| ID resolution | Agent guessing | `burrow-tools.cjs get --depth 0 --json` then search | Full tree ingest for reliable matching |

**Key insight:** The agent layer should be as thin as possible. All heavy lifting (tree ops, rendering, storage) is already in the CLI. The agent just decides WHAT to call and WHEN.

## Common Pitfalls

### Pitfall 1: Context Budget Bloat
**What goes wrong:** Loading the full workflow file into every shortcut command wastes context tokens.
**Why it happens:** Temptation to share behavior docs across all commands.
**How to avoid:** Only `/burrow` (NL parser) loads the workflow. Shortcuts are self-contained 20-line files.
**Warning signs:** Shortcut commands include `@` references to large workflow files.

### Pitfall 2: Agent Re-renders Output
**What goes wrong:** Agent receives pretty-print output from CLI but then wraps it in code blocks, adds headers, or reformats.
**Why it happens:** Default agent behavior is to "be helpful" with formatting.
**How to avoid:** Explicit instruction in workflow: "Output the CLI result directly. Do not wrap in code blocks. Do not add headers or formatting."
**Warning signs:** CLI output appearing inside ``` blocks or with added commentary.

### Pitfall 3: NL Parser Over-Promises
**What goes wrong:** Workflow describes capabilities the agent can't reliably deliver (complex multi-step reasoning, perfect fuzzy matching).
**Why it happens:** Aspirational worked examples that don't account for LLM limitations.
**How to avoid:** Keep NL examples grounded. Focus on clear intent patterns. Always include the "clarify if ambiguous" escape hatch.
**Warning signs:** Examples with multiple ambiguous references resolved without clarification.

### Pitfall 4: Namespace Mismatch in REQUIREMENTS.md
**What goes wrong:** REQUIREMENTS.md still says `/gsd:burrow`, `/gsd:bw-add` etc. but actual namespace is `/burrow:*`.
**Why it happens:** Requirements written before namespace decision was made.
**How to avoid:** Update REQUIREMENTS.md as part of this phase to reflect `/burrow:*` namespace and expanded command surface.
**Warning signs:** Requirements and implementation use different command names.

### Pitfall 5: Missing `--json` for Agent Data Reads
**What goes wrong:** Agent tries to parse pretty-print output to extract card IDs for multi-step operations.
**Why it happens:** Forgetting that `--json` exists for programmatic access.
**How to avoid:** Workflow must clearly state: "Use `--json` when you need to parse data (resolve IDs, check state). Use default (no flag) when showing results to the user."

### Pitfall 6: Command File Naming Collision
**What goes wrong:** File named `burrow.md` inside `commands/burrow/` might not map to `/burrow` correctly.
**Why it happens:** Claude Code command naming convention: directory name = namespace, file name = subcommand.
**How to avoid:** Verify that a file at `commands/burrow/burrow.md` registers as `/burrow` (not `/burrow:burrow`). If not, the main NL command may need to be at `commands/burrow.md` (a file, not directory).
**Warning signs:** User types `/burrow` and nothing happens, or they must type `/burrow:burrow`.

## Code Examples

### CLI Invocations (what the agent will run)

```bash
# Add a card
node .claude/burrow/burrow-tools.cjs add --title "Login bug" --parent a1b2c3d4

# Show a card at depth 2
node .claude/burrow/burrow-tools.cjs get a1b2c3d4 --depth 2

# Show root at default depth
node .claude/burrow/burrow-tools.cjs get

# Full tree dump
node .claude/burrow/burrow-tools.cjs dump

# Move a card
node .claude/burrow/burrow-tools.cjs move a1b2c3d4 --to b5c6d7e8

# Delete (agent must confirm first)
node .claude/burrow/burrow-tools.cjs delete a1b2c3d4

# Archive
node .claude/burrow/burrow-tools.cjs archive a1b2c3d4

# Get tree as JSON for data parsing
node .claude/burrow/burrow-tools.cjs get --depth 0 --json
```

### Slash Command File (shortcut pattern)

```markdown
---
name: burrow:add
description: Add a new card to the burrow
argument-hint: --title "card title" [--parent <id>] [--body "content"]
allowed-tools:
  - Bash
---
Add a card to the burrow. Run the following command with the user's arguments:

node .claude/burrow/burrow-tools.cjs add $ARGUMENTS

Output the CLI result directly. Do not reformat or wrap in code blocks.
```

### NL Parser Worked Example (for workflow file)

```markdown
## Example: Natural Language Card Creation

User: `/burrow add a card called "OAuth integration" under the auth section`

Agent behavior:
1. Run `node .claude/burrow/burrow-tools.cjs get --depth 0 --json` to find cards
2. Search for card with title matching "auth section" -> finds `b5c6d7e8` titled "Authentication"
3. Show: Running `burrow add --title "OAuth integration" --parent b5c6d7e8`
4. Run `node .claude/burrow/burrow-tools.cjs add --title "OAuth integration" --parent b5c6d7e8`
5. Output the CLI result directly
```

### Workflow Invariants Section (template)

```markdown
## Invariants (NEVER violate)

1. **Never delete without confirmation** — Always ask "Delete 'X' and its N children?" before running delete
2. **Never modify without explicit request** — Read operations are safe; write operations require clear user intent
3. **Always clarify ambiguous references** — If "bugs" matches multiple cards, list them and ask which one
4. **Always use tool output for rendering** — Run CLI without --json flag; output the result directly to the user
5. **Never show raw JSON unless asked** — Use --json only for internal data parsing, never for user-facing output
6. **Read before write** — Ingest tree state before mutations to resolve references correctly
```

## State of the Art

| Aspect | Approach | Rationale |
|--------|----------|-----------|
| Command namespace | `/burrow:*` (own namespace) | Independent tool, not GSD addon |
| NL parsing | Agent interprets via workflow instructions | No custom NL engine; LLM does the parsing |
| Output rendering | CLI pretty-print pass-through | Single rendering path, consistency |
| Data access for agent | `--json` flag when parsing needed | Clean separation: human output vs machine output |
| Shortcut design | Thin wrappers, no NL | Fast, predictable, low context cost |

## Open Questions

1. **Command file for `/burrow` (NL entry point)**
   - What we know: A file at `commands/burrow/burrow.md` should create `/burrow` based on Claude Code convention (directory name matching file name)
   - What's unclear: Need to verify this produces `/burrow` and not `/burrow:burrow`
   - Recommendation: Test during implementation. If it produces `/burrow:burrow`, move the NL command to `commands/burrow.md` as a standalone file and keep shortcuts in `commands/burrow/` directory. Alternatively, name it `commands/burrow/index.md` or similar convention.

2. **Workflow file location**
   - What we know: The workflow defines agent behavior and is loaded by `/burrow` NL command
   - What's unclear: Whether it should live in `.claude/burrow/workflows/burrow.md` or inline in the command file
   - Recommendation: Place it at `.claude/burrow/workflows/burrow.md` and reference via `@` from the NL command file. This keeps the workflow reusable and editable without touching command registration.

3. **REQUIREMENTS.md update scope**
   - What we know: Namespace changed from `/gsd:burrow` to `/burrow:*`, and shortcut surface expanded
   - What's unclear: Whether to update requirement IDs or just descriptions
   - Recommendation: Keep existing CMDS-01 through CMDS-06 IDs. Update descriptions to reflect `/burrow:*` namespace and the full command surface. Add note about expanded shortcuts.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (node:test) |
| Config file | None (test files run directly) |
| Quick run command | `node --test .claude/burrow/test/cli.test.cjs` |
| Full suite command | `node --test .claude/burrow/test/*.test.cjs` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CMDS-01 | NL command file exists and has correct frontmatter | manual-only | N/A -- markdown file, agent behavior | N/A |
| CMDS-02 | `/burrow:add` shortcut works | manual-only | N/A -- slash command invocation | N/A |
| CMDS-03 | `/burrow:show` shortcut works | manual-only | N/A -- slash command invocation | N/A |
| CMDS-04 | `/burrow:move` shortcut works | manual-only | N/A -- slash command invocation | N/A |
| CMDS-05 | `/burrow:archive` shortcut works | manual-only | N/A -- slash command invocation | N/A |
| CMDS-06 | Workflow file exists with required sections | manual-only | N/A -- markdown content | N/A |

### Sampling Rate
- **Per task commit:** Verify file exists and has expected structure (Read tool)
- **Per wave merge:** Manual smoke test: invoke `/burrow show` and `/burrow add a test card`
- **Phase gate:** UAT -- user runs each shortcut and the NL parser with real requests

### Wave 0 Gaps
None -- this phase produces markdown files, not executable code. The underlying CLI (`burrow-tools.cjs`) is already fully tested from Phases 1-3. Validation is structural (files exist, frontmatter correct, workflow has required sections) and behavioral (manual user testing).

**Justification for manual-only:** Slash command `.md` files are consumed by the Claude Code runtime, not by a test harness. There is no programmatic way to invoke `/burrow:add` from a test. Validation is: (1) file structure audit (automated via Read), (2) user acceptance testing.

## Sources

### Primary (HIGH confidence)
- Project codebase: `burrow-tools.cjs`, `lib/render.cjs`, `lib/mongoose.cjs` -- examined directly
- Existing GSD commands in `.claude/commands/gsd/` -- examined 4 files for format patterns
- `04-CONTEXT.md` -- all user decisions and constraints

### Secondary (MEDIUM confidence)
- Claude Code custom command format inferred from examining 4+ existing command files in the project
- Command namespace mapping (directory/file -> slash command name) inferred from GSD pattern

### Tertiary (LOW confidence)
- `/burrow` vs `/burrow:burrow` naming -- needs runtime verification (flagged in Open Questions)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no libraries needed, just markdown files and existing CLI
- Architecture: HIGH -- file structure and command format well-established by GSD precedent in this project
- Pitfalls: HIGH -- derived from direct examination of existing patterns and user constraints
- Naming convention: MEDIUM -- `/burrow` base command file location needs verification

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable -- markdown file format unlikely to change)
