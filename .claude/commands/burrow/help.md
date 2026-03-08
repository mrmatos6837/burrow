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
| `/burrow:help` | This reference |

### Examples

- `/burrow show me my bugs` -- natural language via `/burrow`
- `/burrow:add --title "fix login" --parent a1b2c3d4` -- add under a specific card
- `/burrow:read a1b2c3d4 --depth 2` -- view card with 2 levels of children
- `/burrow:dump` -- see everything
