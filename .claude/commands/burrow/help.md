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
| `/burrow:add --title "card title" [--parent <id>] [--body "content"]` | Create a card |
| `/burrow:edit <id> [--title "new title"] [--body "new body"]` | Modify a card |
| `/burrow:remove <id>` | Delete card and descendants (confirm first) |
| `/burrow:move <id> --to <parent-id> [--at N]` | Move card to a different parent |
| `/burrow:read [<id>] [--depth N] [--full] [--include-archived] [--archived-only]` | View a card (default depth 1) |
| `/burrow:find <query>` | Search cards by title |
| `/burrow:archive <id>` | Archive card and descendants |
| `/burrow:unarchive <id>` | Restore archived card and descendants |
| `/burrow:dump ` | Show full tree (alias for read --depth 0) |
| `/burrow:path <id>` | Show ancestry from root to card |
| `/burrow:index [--depth N] [--include-archived] [--json]` | Lightweight tree summary (IDs, titles, counts) |
| `/burrow:config list | get <key> | set <key> <value>` | Manage settings |
| `/burrow:update ` | Update burrow to the latest version |
| `/burrow:help` | This reference |

### Examples

- `/burrow show me my bugs` -- natural language via `/burrow`
- `/burrow:add --title "fix login" --parent a1b2c3d4` -- add under a specific card
- `/burrow:read a1b2c3d4 --depth 2` -- view card with 2 levels of children
- `/burrow:find auth` -- search for cards with "auth" in the title
- `/burrow:config set loadMode index` -- change a setting
- `/burrow:dump` -- see everything
