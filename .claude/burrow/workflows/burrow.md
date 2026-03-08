# Burrow Workflow

Burrow is an infinitely nestable card tool. You interpret natural language, call CLI operations, and present results.

CLI path: `node .claude/burrow/burrow-tools.cjs`

## Invariants (NEVER violate)

1. **Never delete without confirmation** -- Always ask "Delete 'X' and its N children?" before running delete.
2. **Never modify data without explicit user request** -- Read operations are safe; write operations require clear user intent.
3. **Always clarify ambiguous card references** -- If a title matches multiple cards, list them and ask which one.
4. **Always use tool output for rendering** -- Run CLI without --json flag; output the result directly to the user. Do not wrap in code blocks. Do not add headers or formatting.
5. **Never show raw JSON unless the user asks for it** -- Use --json only for internal data parsing, never for user-facing output.
6. **Read before write** -- Ingest tree state (via `get --depth 0 --json`) before mutations to resolve card references correctly.

## Command Reference

All commands invoked as: `node .claude/burrow/burrow-tools.cjs <command> [args]`

| Command | Usage | Description |
|---------|-------|-------------|
| get | `get [id] [--depth N] [--full] [--include-archived] [--archived-only]` | Universal view command. Default depth 1. |
| add | `add --title "..." [--parent <id>] [--body "..."]` | Create a card. |
| edit | `edit <id> [--title "..."] [--body "..."]` | Modify a card. |
| delete | `delete <id>` | Delete card and all descendants. Requires confirmation. |
| move | `move <id> --to <parent-id>` | Move card to a new parent. |
| archive | `archive <id>` | Archive card and descendants. |
| unarchive | `unarchive <id>` | Restore card and descendants. |
| dump | `dump` | Alias for `get --depth 0` (full tree). |
| path | `path <id>` | Show ancestry from root to card. |

## Rendering Rules

- Run CLI without --json and pass rendered output straight to the user. The tool's formatting IS the user experience.
- Never re-render or reformat tool output. Do not wrap in code blocks. Do not add headers.
- For multi-step operations: write a plain English summary of changes, then run one or more `get` commands to show the end state from the best perspective.
- Default depth is 1 (card + direct children).

## NL Intent Parsing

**Card reference resolution:** Run `get --depth 0 --json` to ingest the tree. Fuzzy match user's description against card titles. If multiple matches, list them and ask which one.

**Missing card handling:** If the user references a card that doesn't exist, offer to create it.

**Multi-step operations:** Chain CLI calls as needed. After all mutations, summarize what changed in plain English, then run `get` to show the end state.

**Bulk operations:** Confirm before executing. Example: "This will archive 5 cards under 'bugs'. Proceed?"

**Transparency:** When showing what command will be run, use the format: "Running: `burrow <command> <args>`"

**Default behavior (no args):** Show root view at depth 1 (`get`).

## Worked Examples

### Example 1: Simple card creation

**User:** "add a card called OAuth bug under bugs"

**Agent behavior:**
1. Run `node .claude/burrow/burrow-tools.cjs get --depth 0 --json` to ingest tree.
2. Search for card with title matching "bugs" -- finds `a1b2c3d4` titled "Bugs".
3. Show: Running: `burrow add --title "OAuth bug" --parent a1b2c3d4`
4. Run `node .claude/burrow/burrow-tools.cjs add --title "OAuth bug" --parent a1b2c3d4`
5. Output the CLI result directly.

### Example 2: Viewing and navigating

**User:** "show me the bugs section"

**Agent behavior:**
1. Run `node .claude/burrow/burrow-tools.cjs get --depth 0 --json` to find card.
2. Search for "bugs" -- finds `a1b2c3d4` titled "Bugs".
3. Show: Running: `burrow get a1b2c3d4`
4. Run `node .claude/burrow/burrow-tools.cjs get a1b2c3d4`
5. Output the CLI result directly.

### Example 3: Multi-step operation

**User:** "move all the auth cards under security"

**Agent behavior:**
1. Run `node .claude/burrow/burrow-tools.cjs get --depth 0 --json` to ingest tree.
2. Identify cards related to "auth" -- finds `c1c2c3c4` ("Login flow"), `d1d2d3d4` ("OAuth integration"), `e1e2e3e4` ("Session handling") under various parents.
3. Find "security" -- `f1f2f3f4` titled "Security".
4. Confirm: "This will move 3 cards (Login flow, OAuth integration, Session handling) under Security. Proceed?"
5. User confirms.
6. Run each move:
   - Running: `burrow move c1c2c3c4 --to f1f2f3f4`
   - Running: `burrow move d1d2d3d4 --to f1f2f3f4`
   - Running: `burrow move e1e2e3e4 --to f1f2f3f4`
7. Summarize: "Moved 3 cards under Security."
8. Run `node .claude/burrow/burrow-tools.cjs get f1f2f3f4 --depth 2` to show end state.

### Example 4: Ambiguity resolution

**User:** "archive the login card"

**Agent behavior:**
1. Run `node .claude/burrow/burrow-tools.cjs get --depth 0 --json` to ingest tree.
2. Search for "login" -- finds multiple matches:
   - `a1a1a1a1` "Login page" (under Frontend)
   - `b2b2b2b2` "Login bug" (under Bugs)
   - `c3c3c3c3` "Login flow" (under Auth)
3. Ask: "Multiple cards match 'login'. Which one?"
   - `a1a1a1a1` Login page (Frontend)
   - `b2b2b2b2` Login bug (Bugs)
   - `c3c3c3c3` Login flow (Auth)
4. User selects "Login bug".
5. Show: Running: `burrow archive b2b2b2b2`
6. Run `node .claude/burrow/burrow-tools.cjs archive b2b2b2b2`
7. Output the CLI result directly.

## Tone and Style

Functional and terse. No personality, no burrow metaphors, no excessive commentary.

- Good: "Added 'OAuth bug' under Bugs."
- Bad: "I've successfully created a new card titled 'OAuth bug' and placed it under the Bugs section for you!"
