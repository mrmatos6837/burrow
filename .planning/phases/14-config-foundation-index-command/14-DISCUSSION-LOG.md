# Phase 14: Config Foundation + Index Command - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 14-Config Foundation + Index Command
**Areas discussed:** Config defaults, Index output shape, CLI surface, Config file format, Testing strategy, Error messages, Config + index interaction

---

## Config Defaults

| Option | Description | Selected |
|--------|-------------|----------|
| auto | Checks cards.json size and picks full or index | ✓ |
| full | Always read entire cards.json | |
| index | Always use lightweight index | |

**User's choice:** auto (default for new installs)
**Notes:** None

### Auto-threshold format

| Option | Description | Selected |
|--------|-------------|----------|
| Token-based (~4K tokens) | Estimate token count from file size | ✓ |
| File size (10KB) | Simple byte check | |
| Card count (50 cards) | Count cards in tree | |

**User's choice:** Token-based
**Notes:** User emphasized: "make sure to note somewhere that the token count is estimated based on the file size"

### Threshold expression in config

| Option | Description | Selected |
|--------|-------------|----------|
| Token count (4000) | Config stores token estimate | ✓ |
| Byte size with label ("16KB") | Human-readable string | |
| Raw bytes (16384) | Plain number in bytes | |

**User's choice:** Token count (4000)

### Schema extensibility

| Option | Description | Selected |
|--------|-------------|----------|
| Open schema | get/set works for any key | |
| Closed schema | Only known keys accepted | ✓ |

**User's choice:** Closed schema

### Validation behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Reject on set | Error listing valid values | ✓ |
| Warn on read | Store anything, warn on use | |
| Silent fallback | Accept anything, use default | |

**User's choice:** Reject on set

---

## Index Output Shape

### Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Nested tree | Same shape as cards.json, stripped fields | ✓ |
| Flat array with parentId | Linear scan | |

**User's choice:** Nested tree

### Fields per card

| Option | Description | Selected |
|--------|-------------|----------|
| id + title + childCount | Minimum viable | ✓ |
| archived flag | Archive awareness | ✓ |
| hasBody indicator | Drill-down hint | ✓ |
| children array | Nested structure | ✓ |

**User's choice:** All four fields selected

### Output path

| Option | Description | Selected |
|--------|-------------|----------|
| Raw JSON to stdout | Bypass render.cjs | |
| Through render.cjs | Add renderIndex() | ✓ |

**User's choice:** Through render.cjs
**Notes:** User explained the render pipeline philosophy: "the render function is the last step of the fetch pipeline. we fetch the data based on the user commands and then render it out to output, either human readable or raw json, based on the flag. everything renders human readable by default but when the agent is using tree command in loading phase on a new session it should pass the --json or --minimal flag to reduce the token cost"

### Output format

**User's choice:** Human-readable minimal tree by default, --json flag for raw JSON. User wants both modes so users can see an overview and agents get cheap structured data.

### Separate command vs dump flag

| Option | Description | Selected |
|--------|-------------|----------|
| Separate command | burrow index — distinct command | ✓ |
| Flag on dump | burrow dump --index | |
| Replace dump | Make dump support both modes | |

**User's choice:** Separate command

---

## CLI Surface

### Command structure

| Option | Description | Selected |
|--------|-------------|----------|
| Subcommands | burrow config get/set/list | ✓ |
| Positional shorthand | burrow config <key> [value] | |
| Flag-based | burrow config --get/--set | |

**User's choice:** Subcommands (git-style)

### config list output

| Option | Description | Selected |
|--------|-------------|----------|
| Key-value table | Simple lines | |
| Annotated table | Marks defaults vs custom | |
| Rendered box | Pretty box via render.cjs | ✓ |

**User's choice:** Rendered box

### config get output

| Option | Description | Selected |
|--------|-------------|----------|
| Raw value only | Just the value on stdout | ✓ |
| Formatted line | key = value | |

**User's choice:** Raw value only

---

## Config File Format

### Key structure

| Option | Description | Selected |
|--------|-------------|----------|
| Flat keys | Simple key-value pairs | ✓ |
| Nested by category | Grouped objects | |

**User's choice:** Flat keys

### Defaults merge

| Option | Description | Selected |
|--------|-------------|----------|
| Runtime merge | File stores only user-set values | |
| Write-time merge | File always has every key | ✓ |

**User's choice:** Write-time merge

### Config creation

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-create on first access | Any config command creates file | |
| Create on first set only | File only on explicit set | |
| Create on install/update | Installer owns file lifecycle | ✓ |

**User's choice:** Create on install or update (user-specified)

### Version field

| Option | Description | Selected |
|--------|-------------|----------|
| No version field | Handle migration by key presence | ✓ |
| Add version field | Explicit schema versioning | |

**User's choice:** No version field

### Atomic write implementation

| Option | Description | Selected |
|--------|-------------|----------|
| Own atomic write | config.cjs has independent impl | |
| Extract shared utility | atomicWriteJSON() in core.cjs | ✓ |
| Skip atomic writes | Just writeFileSync | |

**User's choice:** Extract to core.cjs
**Notes:** User asked about coupling concern. Conclusion: natural coupling since both modules share same data directory and safety requirements.

---

## Testing Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Match existing pattern | config.test.cjs + cli.test.cjs cases | ✓ |
| Separate index test file | Additional test/index.test.cjs | |
| You decide | Claude picks structure | |

**User's choice:** Match existing pattern

---

## Error Messages

### Unknown key behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Error with valid keys list | Lists valid options | ✓ |
| Silent empty output | Exit 0, no output | |
| Exit with error code only | Exit 1, no message | |

**User's choice:** Error with valid keys list

### Missing config.json

| Option | Description | Selected |
|--------|-------------|----------|
| Show defaults | Display defaults transparently | |
| Error: run installer | Direct to npx create-burrow | ✓ |
| Create and show | Auto-create then display | |

**User's choice:** Error directing to installer

### Error format

| Option | Description | Selected |
|--------|-------------|----------|
| render.renderError() | Consistent styled errors | ✓ |
| Plain stderr | Separate error stream | |

**User's choice:** Through renderError()

### Set confirmation

| Option | Description | Selected |
|--------|-------------|----------|
| Brief confirmation | Echo new value | ✓ |
| Silent success | Exit 0, no output | |
| Rendered confirmation | Pretty box old→new | |

**User's choice:** Brief confirmation

---

## Config + Index Interaction

| Option | Description | Selected |
|--------|-------------|----------|
| Index ignores config | Independent building blocks | ✓ |
| Index reads autoThreshold | Tighter integration | |
| Index reads default depth | Config-driven defaults | |

**User's choice:** Keep independent in Phase 14
**Notes:** User raised ordering concern — "if index depends on config, the order should be reversed." Confirmed: config and index are parallel primitives, wired together in Phase 16.

---

## Claude's Discretion

- Exact renderIndex() formatting for human-readable mode
- Whether atomicWriteJSON() includes backup file creation or just tmp+rename
- Internal config schema definition structure

## Deferred Ideas

None — discussion stayed within phase scope
