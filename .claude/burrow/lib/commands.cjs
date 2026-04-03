'use strict';

/**
 * Command registry — single source of truth for all Burrow CLI commands.
 *
 * Everything that needs command metadata imports from here:
 *   - burrow-tools.cjs  (help/error messages)
 *   - loader.cjs        (load envelope for agent discovery)
 *   - installer.cjs     (generates .claude/commands/burrow/*.md slash commands)
 *   - help.md           (generated from this registry)
 */

const CLI = 'node .claude/burrow/burrow-tools.cjs';

const COMMANDS = [
  {
    name: 'load',
    desc: 'Load card context (returns JSON envelope with cards and command list)',
    usage: 'load',
    argHint: '',
    body: 'Load burrow card context.',
    slash: false,  // no user-facing slash command
  },
  {
    name: 'add',
    desc: 'Create a card',
    usage: 'add --title "..." [--parent <id>] [--body "..."]',
    argHint: '--title "card title" [--parent <id>] [--body "content"]',
    body: 'Add a card to burrow with the given flags.',
  },
  {
    name: 'edit',
    desc: 'Modify a card',
    usage: 'edit <id> [--title "..."] [--body "..."]',
    argHint: '<id> [--title "new title"] [--body "new body"]',
    body: "Edit a burrow card with the given flags.",
  },
  {
    name: 'remove',
    desc: 'Delete card and descendants (confirm first)',
    usage: 'remove <id>',
    argHint: '<id>',
    body: 'Ask the user to confirm before running the remove command. Show what will be removed by running `' + CLI + ' read <id>` first.\n\nAfter confirmation, run:',
    runPrefix: false,  // body already contains the run instruction context
  },
  {
    name: 'move',
    desc: 'Move card to a different parent',
    usage: 'move <id> --to <parent-id> [--at N]',
    argHint: '<id> --to <parent-id> [--at N]',
    body: 'Move a burrow card to a different parent.',
  },
  {
    name: 'read',
    desc: 'View a card (default depth 1)',
    usage: 'read [id] [--depth N] [--full]',
    argHint: '[<id>] [--depth N] [--full] [--include-archived] [--archived-only]',
    body: 'Show burrow cards. With no arguments, shows root at depth 1.',
  },
  {
    name: 'find',
    desc: 'Search cards by title',
    usage: 'find <query>',
    argHint: '<query>',
    body: 'Search card titles for the given query.',
  },
  {
    name: 'archive',
    desc: 'Archive card and descendants',
    usage: 'archive <id>',
    argHint: '<id>',
    body: 'Archive a burrow card.',
  },
  {
    name: 'unarchive',
    desc: 'Restore archived card and descendants',
    usage: 'unarchive <id>',
    argHint: '<id>',
    body: 'Restore an archived burrow card.',
  },
  {
    name: 'dump',
    desc: 'Show full tree (alias for read --depth 0)',
    usage: 'dump',
    argHint: '',
    body: 'Show the full burrow tree at all depths.',
  },
  {
    name: 'path',
    desc: 'Show ancestry from root to card',
    usage: 'path <id>',
    argHint: '<id>',
    body: 'Show the ancestry path from root to a card.',
  },
  {
    name: 'index',
    desc: 'Lightweight tree summary (IDs, titles, counts)',
    usage: 'index [--depth N] [--json]',
    argHint: '[--depth N] [--include-archived] [--json]',
    body: 'Show a lightweight tree summary.',
  },
  {
    name: 'config',
    desc: 'Manage settings',
    usage: 'config list|get|set <key> <value>',
    argHint: 'list | get <key> | set <key> <value>',
    body: 'Manage burrow configuration.',
  },
  {
    name: 'update',
    desc: 'Update burrow to the latest version',
    usage: 'update',
    argHint: '',
    body: 'Check for and install burrow updates.',
    slash: true,
    cliCommand: false,  // slash-only, not a CLI subcommand
  },
  {
    name: 'help',
    desc: 'Show burrow command reference',
    usage: 'help',
    argHint: '',
    slash: true,
    cliCommand: false,  // slash-only, generated separately
    custom: true,       // help.md is generated with full table, not the standard template
  },
];

// ── Derived helpers ──────────────────────────────────────────────────────────

/** Commands that are CLI subcommands (used in burrow-tools.cjs switch) */
const CLI_COMMANDS = COMMANDS.filter(c => c.cliCommand !== false);

/** Commands that get a slash command file (used by installer) */
const SLASH_COMMANDS = COMMANDS.filter(c => c.slash !== false);

/**
 * Generate the content of a slash command .md file.
 * @param {object} cmd - Command entry from COMMANDS
 * @returns {string} Full .md file content
 */
function generateSlashCommand(cmd) {
  if (cmd.custom) return null;  // custom commands (help) are generated separately

  const frontmatter = [
    '---',
    `name: burrow:${cmd.name}`,
    `description: ${cmd.desc}`,
    `argument-hint: "${cmd.argHint}"`,
    'allowed-tools:',
    '  - Bash',
    '---',
  ].join('\n');

  const runLine = `Run: \`${CLI} ${cmd.name} $ARGUMENTS\``;
  const footer = 'Do not repeat the CLI output — it is already visible to the user. Say nothing after read-only commands.';

  // remove has custom body that includes its own run context
  if (cmd.runPrefix === false) {
    return `${frontmatter}\n${cmd.body} \`${CLI} ${cmd.name} $ARGUMENTS\`\n\n${footer}\n`;
  }

  return `${frontmatter}\n${cmd.body}\n\n${runLine}\n\n${footer}\n`;
}

/**
 * Generate the help.md slash command with a full command table.
 * @returns {string} Full help.md content
 */
function generateHelpCommand() {
  const slashCmds = SLASH_COMMANDS;

  const rows = [
    '| `/burrow [request]` | Natural language -- describe what you want |',
  ];
  for (const cmd of slashCmds) {
    if (cmd.name === 'help') {
      rows.push('| `/burrow:help` | This reference |');
    } else {
      rows.push(`| \`/burrow:${cmd.name} ${cmd.argHint}\` | ${cmd.desc} |`);
    }
  }

  const table = rows.join('\n');

  return `---
name: burrow:help
description: Show burrow command reference
argument-hint: ""
allowed-tools: []
---
Output the following command reference:

## Burrow Commands

| Command | Description |
|---------|-------------|
${table}

### Examples

- \`/burrow show me my bugs\` -- natural language via \`/burrow\`
- \`/burrow:add --title "fix login" --parent a1b2c3d4\` -- add under a specific card
- \`/burrow:read a1b2c3d4 --depth 2\` -- view card with 2 levels of children
- \`/burrow:find auth\` -- search for cards with "auth" in the title
- \`/burrow:config set loadMode index\` -- change a setting
- \`/burrow:dump\` -- see everything
`;
}

/**
 * Return the subset of command data included in the load envelope (agent-facing).
 * Strips internal fields like argHint, body, slash, custom, etc.
 */
function commandsForEnvelope() {
  return CLI_COMMANDS.map(({ name, usage, desc }) => ({ name, usage, desc }));
}

module.exports = {
  COMMANDS,
  CLI_COMMANDS,
  SLASH_COMMANDS,
  generateSlashCommand,
  generateHelpCommand,
  commandsForEnvelope,
  CLI,
};
