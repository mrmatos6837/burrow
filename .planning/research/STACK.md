# Stack Research

**Domain:** Node.js CLI addon for Claude Code (bucket-based task manager with markdown+YAML flat files)
**Researched:** 2026-03-06
**Confidence:** HIGH

## Constraint

**Zero external npm dependencies.** Burrow is a Claude Code addon distributed as flat files. It cannot assume `npm install` has been run. Every capability must come from Node.js built-in modules or custom code vendored into the addon. This is not a preference -- it is a hard constraint inherited from the GSD framework pattern.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | 22.x LTS | Runtime | Already required by Claude Code and GSD. v22 is current LTS ("Jod"), ships `util.styleText()` and stable `util.parseArgs()`. No additional runtime needed. |
| CommonJS (`.cjs`) | N/A | Module format | GSD convention. Claude Code invokes tools via `node path/to/tool.cjs`. ESM would require `--input-type=module` or `.mjs` extension, adding friction for no benefit in a CLI tool. |

### Built-in Node.js APIs (the actual "stack")

| API | Module | Purpose | Why This Over Alternatives |
|-----|--------|---------|---------------------------|
| `fs.readFileSync` / `fs.writeFileSync` | `node:fs` | File CRUD | Synchronous is correct here -- CLI tool runs, does one thing, exits. Async adds complexity with zero benefit for single-file operations. |
| `fs.mkdirSync` | `node:fs` | Directory creation | `{ recursive: true }` handles nested paths. |
| `fs.readdirSync` | `node:fs` | List items/archive | With `{ withFileTypes: true }` for filtering `.md` files efficiently. |
| `fs.existsSync` | `node:fs` | Path checking | Simple boolean check. Preferred over try/catch on `statSync`. |
| `path.join` / `path.resolve` | `node:path` | Path construction | Cross-platform path handling. Always use over string concatenation. |
| `util.parseArgs()` | `node:util` | CLI argument parsing | Stable since Node.js 20. Supports `--flag value`, `-f`, boolean/string types, and positionals. Replaces minimist/yargs entirely. Verified working on v22.14.0. |
| `util.styleText()` | `node:util` | Terminal text coloring | New in Node.js 22, stable. Supports bold, dim, underline, italic, and all 16 ANSI colors. Replaces chalk/kleur/picocolors entirely. Verified: all needed styles (bold, dim, green, yellow, red, cyan) work on v22.14.0. |
| `JSON.parse` / `JSON.stringify` | Built-in | Config management | `config.json` is the storage format. Native JSON handles all config needs. |
| `crypto.randomUUID()` | `node:crypto` | Item ID generation | Stable since Node.js 19. Generates RFC 4122 v4 UUIDs without external libs. Use for unique item filenames if slug collisions are a concern. |
| `process.stdout.write` | Built-in | Output | Direct stdout control. Preferred over `console.log` for structured output (avoids trailing newline when undesired). |

### Custom Implementations (vendored into addon)

| Component | Purpose | Complexity | Notes |
|-----------|---------|------------|-------|
| YAML frontmatter parser | Parse `---\nyaml\n---\nmarkdown` | Low | GSD already has `extractFrontmatter()` in `lib/frontmatter.cjs`. Fork and simplify for Burrow's narrower schema (no 3-level nesting needed). ~40 lines of code. |
| YAML frontmatter serializer | Write frontmatter back to files | Low | GSD has `reconstructFrontmatter()`. Fork it. Burrow items have flat schemas (title, bucket, tags[], created, updated) -- simpler than GSD's deeply nested PLAN frontmatter. ~30 lines. |
| Frontmatter splice | Replace frontmatter in existing file | Low | GSD has `spliceFrontmatter()`. Direct reuse pattern. ~5 lines. |
| Text renderer | Pan view, drill view, item display | Medium | Custom. Uses `util.styleText()` for colors, manual string padding for alignment. The dotted-leader pattern (bucket name . . . count) is ~10 lines. No need for a table library. |
| Slug generator | Convert titles to filenames | Low | `text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')`. GSD has `generateSlug()`. |

### Data Formats

| Format | Used For | Schema |
|--------|----------|--------|
| Markdown + YAML frontmatter | Item files | `title`, `bucket`, `tags[]`, `created`, `updated` in frontmatter; free-form notes in body |
| JSON | Config (`config.json`) | `buckets[]` (name, order, limit), `settings` (default bucket, archive behavior) |
| Plain text | CLI display output | Formatted with ANSI via `util.styleText()` |
| JSON | CLI structured output | For agent consumption (`--json` flag) |

## Architecture Pattern: Single-File CLI Tool

Follow GSD's established pattern:

```
.claude/burrow/
  burrow-tools.cjs          # Single entry point, all commands
  lib/
    frontmatter.cjs          # YAML frontmatter parse/serialize (forked from GSD)
    items.cjs                # Item CRUD operations
    render.cjs               # Text rendering (pan view, drill view)
    config.cjs               # Config read/write/validate
```

**Why this structure:** Matches `gsd-tools.cjs` conventions. The agent calls `node .claude/burrow/burrow-tools.cjs <command> [args]`. Single entry point with subcommands. Lib modules keep concerns separated without any module system beyond `require()`.

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Custom YAML parser | `js-yaml` npm package | External dependency. Burrow's YAML is trivially simple (flat key-value + one array field). Full YAML spec support is unnecessary overhead and violates the zero-deps constraint. |
| Custom YAML parser | `yaml` npm package | Same as above. More modern API but still an external dep. |
| `util.styleText()` | `chalk` / `picocolors` | External dependencies. `styleText()` covers all needed formatting (bold, dim, colors) natively in Node.js 22. |
| `util.parseArgs()` | `minimist` / `yargs` / `commander` | External dependencies. `parseArgs()` handles Burrow's simple argument patterns (subcommand + named flags + positionals). |
| `crypto.randomUUID()` | `uuid` npm package | Built-in since Node.js 19. No reason for external package. |
| Synchronous fs | `fs/promises` (async) | CLI tool does sequential file ops and exits. Async adds complexity (async/await boilerplate, error handling) with no performance benefit. GSD uses sync fs throughout. |
| CommonJS | ESM | GSD convention is `.cjs`. Switching to ESM would create inconsistency with the parent framework. |
| Flat files | SQLite / LevelDB | Project constraint: flat file storage only. Markdown files are human-readable, git-friendly, and trivially debuggable. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Any npm package | Hard constraint: zero external dependencies. Addon is distributed as flat files with no install step. | Node.js built-in APIs + custom code |
| `gray-matter` | Popular frontmatter parser, but it is an npm package with transitive deps. Overkill for Burrow's flat schema. | Custom `extractFrontmatter()` (forked from GSD's proven implementation) |
| `inquirer` / `prompts` | Interactive CLI prompts. Burrow is not interactive -- the agent interprets user intent and calls the CLI tool with explicit arguments. | Direct argument parsing via `parseArgs()` |
| `blessed` / `ink` / `terminal-kit` | TUI frameworks. Burrow renders simple formatted text, not interactive UIs. | `util.styleText()` + manual string formatting |
| `fs/promises` (async) | Adds unnecessary complexity for sequential single-file operations in a CLI that runs and exits. | `fs.readFileSync` / `fs.writeFileSync` |
| `child_process.exec` for git | Burrow does not manage git. The GSD framework handles commits. | N/A -- out of scope |
| Full YAML spec parser | YAML is complex (anchors, aliases, multiline, type coercion). Burrow needs none of this. Building or importing a full parser invites bugs for features never used. | Minimal parser that handles: `key: value`, `key: [a, b]`, and `- item` lists. Nothing else. |

## Stack Patterns

**For the CLI tool entry point:**
- Use `util.parseArgs()` with strict mode to catch typos
- Route subcommands via switch/case (matches GSD pattern)
- Output JSON for agent consumption, formatted text for display (detect with `--json` flag)

**For frontmatter parsing:**
- Fork GSD's `extractFrontmatter()` but simplify: Burrow items max out at 1-level nesting (tags array). Remove GSD's 3-level nesting support.
- Validate schema on write: reject items missing `title` or `bucket`

**For text rendering:**
- Build strings, write once to stdout. No incremental rendering.
- Use `util.styleText('dim', text)` for secondary info, `util.styleText('bold', text)` for headers
- Dotted leaders: `name + ' ' + '.'.repeat(width - name.length - countStr.length - 2) + ' ' + countStr`

**For config management:**
- Read: `JSON.parse(fs.readFileSync(configPath, 'utf-8'))`
- Write: `fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8')`
- Always write with trailing newline (git-friendly)
- Validate on read, provide defaults for missing optional fields

## Version Compatibility

| Component | Minimum Node.js | Status in v22.14.0 |
|-----------|-----------------|---------------------|
| `util.parseArgs()` | 18.3+ (experimental), 20+ (stable) | Stable. Verified working. |
| `util.styleText()` | 21.7+ (experimental), 22+ (stable) | Stable. Verified working with all needed styles. |
| `crypto.randomUUID()` | 19+ (stable) | Stable. Verified working. |
| `fs.mkdirSync({ recursive })` | 10.12+ | Stable. Long-established. |
| CommonJS `require()` | All versions | Stable. Will not be removed. |

**Node.js 22 is the minimum supported version.** This is acceptable because Claude Code itself requires a modern Node.js runtime. No need to support older versions.

## Sources

- Node.js v22 `util.parseArgs()` -- [Official docs](https://nodejs.org/docs/latest-v22.x/api/util.html#utilparseargsconfig), verified working on v22.14.0
- Node.js v22 `util.styleText()` -- [Official docs](https://nodejs.org/docs/latest-v22.x/api/util.html#utilstyletextformat-text), verified working on v22.14.0 with all needed styles (bold, dim, underline, italic, red, green, yellow, blue, cyan)
- GSD `frontmatter.cjs` -- `.claude/get-shit-done/bin/lib/frontmatter.cjs`, proven implementation with extract/reconstruct/splice pattern (directly inspected)
- GSD `gsd-tools.cjs` -- `.claude/get-shit-done/bin/gsd-tools.cjs`, established CLI tool pattern with subcommand routing (directly inspected)
- [Node.js 22 release announcement](https://nodejs.org/en/blog/announcements/v22-release-announce) -- feature overview
- [ANSI terminal color comparison](https://dev.to/webdiscus/comparison-of-nodejs-libraries-to-colorize-text-in-terminal-4j3a) -- confirmed `util.styleText()` as built-in alternative

---
*Stack research for: Burrow CLI addon (zero-dependency Node.js tool)*
*Researched: 2026-03-06*
