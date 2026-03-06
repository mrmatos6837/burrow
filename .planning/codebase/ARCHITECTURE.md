# Architecture

**Analysis Date:** 2026-03-06

## Pattern Overview

**Overall:** Greenfield Project (No Application Code Yet)

**Key Characteristics:**
- Project is in pre-development state with only tooling and planning infrastructure
- No application source code, configuration files, or dependencies exist
- GSD (Get Shit Done) Claude workflow tooling is installed and configured
- Project name "todobox" suggests a todo/task management application is planned

## Layers

**No application layers exist yet.**

When application code is added, this document should be updated to reflect the chosen architecture.

## Data Flow

**No data flow exists yet.**

No application entry points, APIs, databases, or state management are present.

## Key Abstractions

**GSD Tooling (Development Infrastructure Only):**
- Purpose: Claude Code workflow management for planning, execution, and verification
- Location: `.claude/`
- Contains: Agent definitions, command definitions, workflow scripts, templates
- Pattern: Command-based workflow system with hooks

## Entry Points

**No application entry points exist.**

The only executable code is GSD tooling:
- **GSD CLI Tool:** `.claude/get-shit-done/bin/gsd-tools.cjs` - Node.js CLI for project management
- **Session Hook:** `.claude/hooks/gsd-check-update.js` - Runs on Claude session start
- **Context Monitor:** `.claude/hooks/gsd-context-monitor.js` - Runs after each tool use
- **Status Line:** `.claude/hooks/gsd-statusline.js` - Provides status bar information

## Error Handling

**Strategy:** Not yet defined (no application code)

## Cross-Cutting Concerns

**Logging:** Not yet defined
**Validation:** Not yet defined
**Authentication:** Not yet defined

---

*Architecture analysis: 2026-03-06*
