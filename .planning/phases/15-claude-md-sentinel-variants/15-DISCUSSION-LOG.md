# Phase 15: CLAUDE.md Sentinel Variants - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 15-CLAUDE.md Sentinel Variants
**Areas discussed:** Snippet content per mode, Index depth handling, Atomic write strategy, Code organization

---

## Snippet Content Per Mode

### Trigger Words Architecture
User raised a foundational question: should trigger words ("remember", "note this") be configurable rather than hardcoded? And more broadly — is having both config.json AND a CLAUDE.md snippet redundant?

**Resolution:** Not redundant — CLAUDE.md is the bootstrap (auto-loaded by Claude Code harness), config.json is for programmatic settings. But the snippet content should be config-driven where it makes sense. Trigger words become configurable.

### Default Trigger Words
| Option | Description | Selected |
|--------|-------------|----------|
| Current set | "remember", "don't forget", "always do X" | |
| Broader set + "burrow this" | Add "note this", "save this", "keep track of", "burrow this" | :heavy_check_mark: |
| Single keyword | Just "remember" | |

**User's choice:** Broader set as default, plus "burrow this" as a branded trigger. Minimal option should be just "burrow this". No triggers = omit section entirely.

### No Triggers Mode
| Option | Description | Selected |
|--------|-------------|----------|
| Omit trigger section entirely | Snippet just doesn't mention card creation | :heavy_check_mark: |
| Replace with explicit instruction | Show "Card creation is manual only" | |

**User's choice:** Omit entirely.

### Snippet Verbosity
| Option | Description | Selected |
|--------|-------------|----------|
| Shared base + mode line | Compact, one line per mode | |
| Mode-specific paragraph | Tailored paragraph per mode explaining behavior + lazy loading | :heavy_check_mark: |

**User's choice:** Mode-specific paragraphs. Agent needs clear per-mode instructions.

---

## Index Depth Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Default depth only | No depth flag in snippet | |
| Config-driven depth | New indexDepth config key | |
| Defer to Phase 16 | Depth in workflow LOAD step, not snippet | :heavy_check_mark: |

**User's choice:** Defer to Phase 16.

---

## Atomic Write Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Generic atomicWriteFile() in core.cjs | Text-agnostic atomic write alongside atomicWriteJSON() | :heavy_check_mark: |
| Inline in writeSentinelBlock() | Self-contained, no new export | |

**User's choice:** Deferred to Claude — "whatever you think is best, keep DRY and simple, reuse as possible." Claude chose generic atomicWriteFile() in core.cjs. User clarified: keep atomicWriteFile as a separate function from atomicWriteJSON since they do different things.

---

## Code Organization

| Option | Description | Selected |
|--------|-------------|----------|
| In installer.cjs | Keep co-located with existing sentinel logic | :heavy_check_mark: |
| New lib/sentinel.cjs module | Extract all sentinel logic to own module | |
| You decide | Claude picks simplest approach | |

**User's choice:** generateSnippet() in installer.cjs. Atomic text write as separate function in core.cjs.

---

## Claude's Discretion

- Exact wording of each mode's snippet paragraph
- Internal structure of atomicWriteFile vs atomicWriteJSON (shared helper or duplicated pattern)
- How trigger presets map to word lists internally

## Deferred Ideas

- Index depth in snippet — Phase 16
- Interactive trigger word config via /burrow:config — Phase 17
