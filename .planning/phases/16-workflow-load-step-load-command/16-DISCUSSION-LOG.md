# Phase 16: Workflow LOAD Step + Load Command - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 16-workflow-load-step-load-command
**Areas discussed:** Auto-mode threshold logic, Workflow LOAD step structure, burrow load command, Index depth at runtime

---

## Auto-Mode Threshold Logic

### Q1: How should auto mode check cards.json size?

| Option | Description | Selected |
|--------|-------------|----------|
| fs.stat() file size | Use fs.statSync() to get byte count, divide by ~4 for token estimate. No file read needed | ✓ |
| Read file, measure length | Read file contents, check string length / 4. More accurate but always reads file | |
| Card count heuristic | Run burrow index, count cards, threshold on card count | |

**User's choice:** fs.stat() file size (Recommended)
**Notes:** Cheapest possible check — no file read needed for the size decision.

### Q2: Where should the auto-threshold comparison live?

| Option | Description | Selected |
|--------|-------------|----------|
| In the workflow markdown | Workflow tells agent to stat and decide. Pure workflow logic | |
| In a `burrow load` command | New CLI command encapsulates threshold check and returns right output | ✓ |
| In lib/config.cjs | shouldLoadFull(cwd) helper that stats file and compares | |

**User's choice:** In a `burrow load` command
**Notes:** User chose to encapsulate the logic in a CLI command rather than workflow markdown.

### Q3: Should `burrow load` be the single entry point for ALL modes, or just auto?

| Option | Description | Selected |
|--------|-------------|----------|
| Universal dispatcher | `burrow load` reads config, handles all modes. One command, one code path | ✓ |
| Auto-only command | `burrow load` only handles auto. Workflow calls other commands for full/index/none | |

**User's choice:** Universal dispatcher (Recommended)
**Notes:** None.

---

## Workflow LOAD Step Structure

### Q4: How should the workflow's Step 1 (LOAD) change?

| Option | Description | Selected |
|--------|-------------|----------|
| Replace with `burrow load` call | One Bash call replaces current Read tool call. Command handles everything | ✓ |
| Add conditional branching | Workflow reads config first, then branches per mode. More logic in markdown | |
| Layered approach | Call `burrow load` via Bash plus read config separately via Read tool | |

**User's choice:** Replace with `burrow load` call (Recommended)
**Notes:** None.

### Q5: What should `burrow load` output for each mode?

| Option | Description | Selected |
|--------|-------------|----------|
| JSON to stdout | Envelope: `{"mode":"full","cardCount":42,"data":{...}}`. Agent always knows which mode was resolved | ✓ |
| Raw data only | No metadata wrapper — agent relies on sentinel block to know the mode | |
| Structured report | Human-readable summary plus data | |

**User's choice:** JSON to stdout (Recommended)
**Notes:** None.

### Q6: How should the workflow handle `none` mode?

| Option | Description | Selected |
|--------|-------------|----------|
| Agent notes availability, moves on | Note cards available on demand, proceed without loading data | ✓ |
| Skip LOAD step entirely | Detect none mode before calling burrow load, skip Bash call | |
| Show card count hint | Even in none mode, output count so agent knows data exists | |

**User's choice:** Agent notes availability, moves on (Recommended)
**Notes:** None.

---

## `burrow load` Command

### Q7: Should `burrow load` support flag overrides, or always follow config?

| Option | Description | Selected |
|--------|-------------|----------|
| Config only, no flags | Always reads config.json. Change behavior by changing config | ✓ |
| Optional --mode override | `--mode full` overrides config for this invocation | |
| Flags mirror config keys | Full flag surface overriding any config value | |

**User's choice:** Config only, no flags (Recommended)
**Notes:** None.

### Q8: Where should the `burrow load` logic live in the codebase?

| Option | Description | Selected |
|--------|-------------|----------|
| New lib/loader.cjs module | Dedicated module: reads config, stats file, dispatches. Clean separation | ✓ |
| Inline in burrow-tools.cjs | Logic lives directly in CLI switch case | |
| Extend config.cjs | Add loadContext(cwd) to config module | |

**User's choice:** New lib/loader.cjs module (Recommended)
**Notes:** None.

### Q9: What should the metadata wrapper look like?

| Option | Description | Selected |
|--------|-------------|----------|
| Envelope with mode + data | `{"mode":"full","cardCount":42,"data":{...}}` | ✓ |
| Minimal header line + raw data | First line JSON header, blank line, then raw data | |

**User's choice:** Envelope with mode + data (Recommended)
**Notes:** User confirmed the preview showing the envelope structure.

---

## Index Depth at Runtime

### Q10: Should index mode apply a depth limit from config?

| Option | Description | Selected |
|--------|-------------|----------|
| Full index tree, no depth limit | Index already strips bodies (~85% reduction). Keep simple | |
| Configurable indexDepth in config | New config key, `burrow load` passes --depth N when set | ✓ |
| Auto-scale depth based on size | Progressively reduce depth if index is large | |

**User's choice:** Configurable indexDepth in config
**Notes:** User wants power users to be able to cap depth for huge trees.

### Q11: What should the default for indexDepth be?

| Option | Description | Selected |
|--------|-------------|----------|
| 0 (unlimited) | Full index tree — backward compatible with Phase 15 | ✓ |
| 3 levels | Covers most practical trees | |
| 5 levels | Generous default for most real-world nesting | |

**User's choice:** 0 (unlimited) (Recommended)
**Notes:** None.

---

## Claude's Discretion

- Exact envelope field names and none-mode shape
- Whether loader.cjs imports buildIndex or shells out to burrow index
- Error handling when config.json is missing

## Deferred Ideas

None — discussion stayed within phase scope.
