# Burrow Workflow

Burrow is an infinitely nestable card tool. You interpret natural language, call CLI operations, and present results.

CLI path: `node .claude/burrow/burrow-tools.cjs`

## Invariants (NEVER violate)

1. **Never remove without confirmation** -- Always ask "Remove 'X' and its N children?" before running remove.
2. **Never modify data without explicit user request** -- Read operations are safe; write operations require clear user intent.
3. **Always clarify ambiguous card references** -- If a title matches multiple cards, list them and ask which one.
4. **Never repeat tool output** -- The Bash tool output is already visible to the user. NEVER echo, repeat, or reformat it as text. After a read-only CLI call, say nothing.
5. **Never show raw JSON unless the user asks for it** -- The Read tool is used for internal data loading. Never output JSON to the user.

## The 3-Step Flow

Every `/burrow` invocation follows this sequence. No exceptions.

### Step 1: LOAD (silent)

Read `cards.json` directly using the Read tool to load the tree into agent memory. The Read tool output is invisible to the user, making this truly silent.

- **Skip if already loaded**: If the agent has already read `cards.json` in this conversation and no mutation has occurred since, skip this step.
- **Read on first use or after mutation**: `.planning/burrow/cards.json` using the Read tool (NOT the CLI).
- **Card ID detection**: An 8-character hex string at the start of user arguments (e.g., `a1b2c3d4`).
- **NEVER use Bash/CLI for loading.** Bash output is visible to the user. The Read tool is not.
- **JSON structure**: The file contains an array of card objects. Each card has `id`, `title`, `children` (nested array), and optional `body`, `createdAt`, `archived`.

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
- **For mutations** (add, edit, remove, move, archive, unarchive): Run the CLI command, then one-line confirmation. After mutation, re-LOAD by reading `cards.json` with the Read tool to sync agent memory.
- **For questions/analysis**: Respond with the answer directly. No CLI call needed.
- **For multi-step operations**: Run all mutations, summarize changes in plain English, then run one `read` to show end state.
- **For bulk operations**: Confirm before executing. Example: "This will archive 5 cards under 'bugs'. Proceed?"

## Command Reference

All commands invoked as: `node .claude/burrow/burrow-tools.cjs <command> [args]`

| Command | Usage | Description |
|---------|-------|-------------|
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
1. LOAD: Read `.planning/burrow/cards.json` using the Read tool (silent).
2. THINK: No request — intent is "show root view."
3. EXECUTE: Run `node .claude/burrow/burrow-tools.cjs read`. Stop.

### Example 2: Scoped view

**User:** `/burrow a1b2c3d4`

**Agent behavior:**
1. LOAD: Read `.planning/burrow/cards.json` using the Read tool (silent).
2. THINK: No request — intent is "show this card."
3. EXECUTE: Run `node .claude/burrow/burrow-tools.cjs read a1b2c3d4`. Stop.

### Example 3: Question answered from memory

**User:** `/burrow how many cards have the letter K in the title?`

**Agent behavior:**
1. LOAD: Read `.planning/burrow/cards.json` using the Read tool (silent).
2. THINK: Scan in-memory tree for titles containing "K" or "k". Count: 7.
3. EXECUTE: Respond with the answer directly. No CLI call needed.

### Example 4: Scoped question

**User:** `/burrow a1b2c3d4 how many children does this have?`

**Agent behavior:**
1. LOAD: Read `.planning/burrow/cards.json` using the Read tool (silent).
2. THINK: Count children in the loaded subtree.
3. EXECUTE: Respond with the answer directly.

### Example 5: Card creation

**User:** `/burrow add a card called OAuth bug under bugs`

**Agent behavior:**
1. LOAD: Read `.planning/burrow/cards.json` using the Read tool (silent).
2. THINK: Match "bugs" → `a1b2c3d4` "Bugs".
3. EXECUTE: Run `node .claude/burrow/burrow-tools.cjs add --title "OAuth bug" --parent a1b2c3d4`. Then re-LOAD by reading `cards.json` with the Read tool.

### Example 6: Multi-step operation

**User:** `/burrow move all the auth cards under security`

**Agent behavior:**
1. LOAD: Read `.planning/burrow/cards.json` using the Read tool (silent).
2. THINK: Match "auth" — finds 3 cards. Match "security" → `f1f2f3f4`.
3. Confirm: "This will move 3 cards (Login flow, OAuth integration, Session handling) under Security. Proceed?"
4. User confirms.
5. EXECUTE: Run each move command. Summarize: "Moved 3 cards under Security."
6. Re-LOAD by reading `cards.json` with the Read tool. Run `read f1f2f3f4 --depth 2` to show end state.

### Example 7: Ambiguity resolution

**User:** `/burrow archive the login card`

**Agent behavior:**
1. LOAD: Read `.planning/burrow/cards.json` using the Read tool (silent).
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
1. LOAD: Read `.planning/burrow/cards.json` using the Read tool (silent).
2. THINK: Match "bugs" -> `a1b2c3d4` "Bugs". "First" -> --at 0.
3. EXECUTE: Run `node .claude/burrow/burrow-tools.cjs add --title "Urgent fix" --parent a1b2c3d4 --at 0`. Then re-LOAD.
