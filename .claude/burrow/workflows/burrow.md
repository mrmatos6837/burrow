# Burrow Workflow

Burrow is an infinitely nestable card tool. You interpret natural language, call CLI operations, and present results.

CLI path: `node .claude/burrow/burrow-tools.cjs`

## Invariants (NEVER violate)

1. **Never remove without confirmation** -- Always ask "Remove 'X' and its N children?" before running remove.
2. **Never modify data without explicit user request** -- Read operations are safe; write operations require clear user intent.
3. **Always clarify ambiguous card references** -- If a title matches multiple cards, list them and ask which one.
4. **Never repeat tool output** -- The Bash tool output is already visible to the user. NEVER echo, repeat, or reformat it as text. After a read-only CLI call, say nothing.
5. **Never show raw JSON unless the user asks for it** -- The `burrow load` JSON envelope is for internal agent memory only. Never output JSON to the user.

## The 3-Step Flow

Every `/burrow` invocation follows this sequence. No exceptions.

### Step 1: LOAD (silent)

Run `burrow load` via the Bash tool to load context. This command reads config.json and returns a JSON envelope with mode-appropriate data.

```
node .claude/burrow/burrow-tools.cjs load
```

The output is a JSON object: `{"mode": "<resolved>", "cardCount": N, "data": {...}}`

**Mode behaviors:**

- **full** (`mode: "full"`): `data` contains the complete card tree. Parse it into agent memory as the full card state. This is equivalent to the old Read tool approach.
- **index** (`mode: "index"`): `data` contains a lightweight index (titles, IDs, child counts — no bodies). Parse it for card awareness. When you need a card's body content, use `node .claude/burrow/burrow-tools.cjs read <id> --full` to fetch it on demand (lazy body-fetching pattern).
- **none** (`mode: "none"`): No `data` field. `cardCount` tells you how many cards exist. Skip loading entirely — cards are available on demand via `burrow read` or `/burrow`. Note this to yourself and proceed.
- **auto**: Resolves to `full` or `index` based on file size vs threshold. The `mode` field reflects the resolved choice — handle it as full or index accordingly.

**Skip if already loaded**: If the agent has already run `burrow load` in this conversation and no mutation has occurred since, skip this step.

**After mutation**: Re-run `burrow load` to refresh agent memory (replaces the old "re-read cards.json" instruction).

**Lazy body-fetching (index mode)**: In index mode, you have card titles and structure but not body content. When a user request requires a card's body (e.g., reading notes, quoting content), run `node .claude/burrow/burrow-tools.cjs read <id> --full` to get the full card. This keeps initial context lightweight while providing full access on demand.

### Step 2: THINK

Using the loaded tree, interpret the user's request.

- **No request** (`/burrow` or `/burrow <id>`): Intent is "show this view."
- **Natural language request**: Resolve card references by matching titles against the in-memory tree.
- **Ambiguous references**: List matches with IDs and parent context, ask which one.
- **Missing card references**: Offer to create it.
- **Questions/analysis** (counting, filtering, searching): Answer directly from the in-memory tree. No CLI call needed — the agent already has the data.

### Step 3: EXECUTE

Perform the action.

- **For views**: Run `read [id]` (pretty-print). Say nothing after — the output is the presentation.
- **For mutations** (add, edit, remove, move, archive, unarchive): Run the CLI command, then one-line confirmation. After mutation, re-LOAD by running `burrow load` via Bash to sync agent memory.
- **For questions/analysis**: Respond with the answer directly. No CLI call needed.
- **For multi-step operations**: Run all mutations in a single Bash call by chaining with `&&`, summarize changes in plain English, then run one `read` to show end state.
- **For bulk operations**: Confirm before executing. Example: "This will archive 5 cards under 'bugs'. Proceed?"

## Command Reference

All commands invoked as: `node .claude/burrow/burrow-tools.cjs <command> [args]`

| Command | Usage | Description |
|---------|-------|-------------|
| load | `load` | Load context per config. Returns JSON envelope. |
| read | `read [id] [--depth N] [--full] [--include-archived] [--archived-only]` | View a card. Default depth 1. |
| add | `add --title "..." [--parent <id>] [--body "..."] [--at N]` | Create a card. --at N places at 0-based position. |
| edit | `edit <id> [--title "..."] [--body "..."]` | Modify a card. |
| remove | `remove <id>` | Remove card and all descendants. Requires confirmation. |
| move | `move <id> --to <parent-id> [--at N]` | Move card. --at N places at 0-based position. Omit --to to reorder within current parent. |
| archive | `archive <id>` | Archive card and descendants. |
| unarchive | `unarchive <id>` | Restore card and descendants. |
| find | `find <query>` | Fuzzy search cards by title. Returns IDs and paths. |
| dump | `dump` | Alias for `read --depth 0` (full tree). |
| path | `path <id>` | Show ancestry from root to card. |
| config | `config list\|get\|set <key> <value>` | Manage settings (loadMode, autoThreshold, indexDepth, triggerPreset). |
| index | `index [--depth N] [--include-archived] [--json]` | Lightweight tree summary (IDs, titles, child counts). |

## Position Translation

The --at flag uses 0-based indexing. When users reference positions in natural language,
translate to 0-based index before constructing the CLI command.

| User says | --at value | Rule |
|-----------|------------|------|
| "first", "top", "beginning" | --at 0 | Always 0 |
| "second" | --at 1 | Ordinal minus 1 |
| "third" | --at 2 | Ordinal minus 1 |
| "position N" / "slot N" | --at (N-1) | Human position minus 1 |
| "last", "end", "bottom" | omit --at | Default append behavior |
| "before card X" | --at (index of X) | Look up X's current index |
| "after card X" | --at (index of X + 1) | Look up X's current index, add 1 |

The agent resolves positions during THINK (Step 2) by inspecting the in-memory tree
to find the target container's children array and computing the correct index.

## Rendering Rules

- The Bash tool output is already visible to the user. NEVER repeat or re-output CLI results as text. The tool call IS the presentation.
- After a CLI call, say nothing unless there's something the user needs to act on. Do not echo, summarize, or reformat the output.
- For read-only operations (read, dump, path): run the CLI command and stop. No text output after.
- For mutations (add, edit, remove, move, archive, unarchive): run the CLI command, then optionally add a one-line confirmation like "Added 'X' under Y." — but NEVER repeat the tree output.
- For multi-step operations: write a plain English summary of changes, then run one `read` command to show the end state.
- Default depth is 1 (card + direct children).

## Transparency

When showing what command will be run, use the format: "Running: `burrow <command> <args>`"

## Tone and Style

Functional and terse. No personality, no burrow metaphors, no excessive commentary.

- Good: "Added 'OAuth bug' under Bugs."
- Bad: "I've successfully created a new card titled 'OAuth bug' and placed it under the Bugs section for you!"

## Worked Examples

### Example 1: Simple view (no args)

**User:** `/burrow`

**Agent behavior:**
1. LOAD: Run `burrow load` via Bash (silent). Parse the JSON envelope.
2. THINK: No request — intent is "show root view."
3. EXECUTE: Run `node .claude/burrow/burrow-tools.cjs read`. Stop.

### Example 2: Scoped view

**User:** `/burrow a1b2c3d4`

**Agent behavior:**
1. LOAD: Run `burrow load` via Bash (silent). Parse the JSON envelope.
2. THINK: No request — intent is "show this card."
3. EXECUTE: Run `node .claude/burrow/burrow-tools.cjs read a1b2c3d4`. Stop.

### Example 3: Question answered from memory

**User:** `/burrow how many cards have the letter K in the title?`

**Agent behavior:**
1. LOAD: Run `burrow load` via Bash (silent). Parse the JSON envelope.
2. THINK: Scan in-memory tree for titles containing "K" or "k". Count: 7.
3. EXECUTE: Respond with the answer directly. No CLI call needed.

### Example 4: Scoped question

**User:** `/burrow a1b2c3d4 how many children does this have?`

**Agent behavior:**
1. LOAD: Run `burrow load` via Bash (silent). Parse the JSON envelope.
2. THINK: Count children in the loaded subtree.
3. EXECUTE: Respond with the answer directly.

### Example 5: Card creation

**User:** `/burrow add a card called OAuth bug under bugs`

**Agent behavior:**
1. LOAD: Run `burrow load` via Bash (silent). Parse the JSON envelope.
2. THINK: Match "bugs" → `a1b2c3d4` "Bugs".
3. EXECUTE: Run `node .claude/burrow/burrow-tools.cjs add --title "OAuth bug" --parent a1b2c3d4`. Then re-LOAD by running `burrow load` via Bash.

### Example 6: Multi-step operation

**User:** `/burrow move all the auth cards under security`

**Agent behavior:**
1. LOAD: Run `burrow load` via Bash (silent). Parse the JSON envelope.
2. THINK: Match "auth" — finds 3 cards. Match "security" → `f1f2f3f4`.
3. Confirm: "This will move 3 cards (Login flow, OAuth integration, Session handling) under Security. Proceed?"
4. User confirms.
5. EXECUTE: Run each move command. Summarize: "Moved 3 cards under Security."
6. Re-LOAD by running `burrow load` via Bash. Run `read f1f2f3f4 --depth 2` to show end state.

### Example 7: Ambiguity resolution

**User:** `/burrow archive the login card`

**Agent behavior:**
1. LOAD: Run `burrow load` via Bash (silent). Parse the JSON envelope.
2. THINK: Match "login" — multiple matches:
   - `a1a1a1a1` Login page (Frontend)
   - `b2b2b2b2` Login bug (Bugs)
   - `c3c3c3c3` Login flow (Auth)
3. Ask: "Multiple cards match 'login'. Which one?" (list with IDs and parents)
4. User selects "Login bug".
5. EXECUTE: Run `node .claude/burrow/burrow-tools.cjs archive b2b2b2b2`. Stop.

### Example 8: Position-based insertion

**User:** `/burrow add "Urgent fix" under bugs, make it first`

**Agent behavior:**
1. LOAD: Run `burrow load` via Bash (silent). Parse the JSON envelope.
2. THINK: Match "bugs" -> `a1b2c3d4` "Bugs". "First" -> --at 0.
3. EXECUTE: Run `node .claude/burrow/burrow-tools.cjs add --title "Urgent fix" --parent a1b2c3d4 --at 0`. Then re-LOAD.
