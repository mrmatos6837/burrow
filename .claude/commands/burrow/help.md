---
name: burrow:help
description: Show burrow command reference
argument-hint: ""
allowed-tools: []
---
Output the following command reference:

## Burrow Commands

| Command | Description |
|---------|-------------|
| `/burrow [request]` | Natural language -- describe what you want |
| `/burrow:read [id] [--depth N]` | View cards (root at depth 1 if no args) |
| `/burrow:add --title "..." [--parent id] [--body "..."]` | Add a card |
| `/burrow:edit id [--title "..."] [--body "..."]` | Edit a card |
| `/burrow:move id --to parent-id` | Move a card |
| `/burrow:remove id` | Remove a card (with confirmation) |
| `/burrow:archive id` | Archive a card |
| `/burrow:unarchive id` | Restore an archived card |
| `/burrow:dump` | Full tree view (all depths) |
| `/burrow:find <query>` | Search cards by title |
| `/burrow:path <id>` | Show ancestry path from root to card |
| `/burrow:config list\|get\|set` | Manage burrow settings |
| `/burrow:index [--depth N] [--json]` | Lightweight tree summary |
| `/burrow:update` | Update burrow to latest version |
| `/burrow:help` | This reference |

### Examples

- `/burrow show me my bugs` -- natural language via `/burrow`
- `/burrow:add --title "fix login" --parent a1b2c3d4` -- add under a specific card
- `/burrow:read a1b2c3d4 --depth 2` -- view card with 2 levels of children
- `/burrow:find auth` -- search for cards with "auth" in the title
- `/burrow:config set loadMode index` -- change a setting
- `/burrow:dump` -- see everything
