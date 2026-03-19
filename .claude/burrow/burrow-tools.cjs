#!/usr/bin/env node
'use strict';

const { parseArgs } = require('node:util');

const core = require('./lib/core.cjs');
const storage = require('./lib/warren.cjs');
const tree = require('./lib/mongoose.cjs');
const render = require('./lib/render.cjs');
const { init } = require('./lib/init.cjs');
const version = require('./lib/version.cjs');

/**
 * Resolve terminal width from --width flag or process.stdout.columns.
 * @param {object} values - Parsed CLI values (may have values.width)
 * @returns {number} Terminal width to use for rendering
 */
function resolveTermWidth(values) {
  if (values.width !== undefined) {
    const n = parseInt(values.width, 10);
    if (!isNaN(n) && n > 0) return n;
  }
  return process.stdout.columns || 80;
}

/**
 * Handle error output: human-readable rendered error.
 * @param {string} message - Error description
 */
function handleError(message) {
  process.stdout.write(render.renderError(message) + '\n');
  process.exit(1);
}

/**
 * Write rendered output to stdout and exit 0.
 * Checks npm registry for updates at most once per 24h (via cache) and
 * prints a notice to stderr if an update is available. Never throws.
 * @param {string} rendered - Formatted string
 */
async function writeAndExit(rendered) {
  process.stdout.write(rendered + '\n');
  // Passive update notification (at most once per 24h via cache)
  try {
    const result = await version.checkForUpdate(process.cwd());
    if (result && result.outdated) {
      process.stderr.write(
        `\n  Update available: ${result.installedVersion} \u2192 ${result.latestVersion}  Run /burrow:update\n\n`
      );
    }
  } catch (_) {
    // Never crash on notification failure
  }
  process.exit(0);
}

async function main() {
  const command = process.argv[2];
  const subArgs = process.argv.slice(3);
  const cwd = process.cwd();

  if (!command) {
    handleError(
      'No command provided. Available: init, add, edit, remove, move, read, dump, path, find, archive, unarchive'
    );
  }

  core.ensureDataDir(cwd);

  switch (command) {
    case 'init': {
      const result = init(cwd);
      const lines = [
        `gitignore: ${result.gitignore}`,
        `claudeMd: ${result.claudeMd}`,
        `dataDir: ${result.dataDir}`,
      ];
      writeAndExit(`Burrow initialized.\n${lines.join('\n')}`);
      break;
    }

    case 'add': {
      const { values } = parseArgs({
        args: subArgs,
        options: {
          title: { type: 'string' },
          parent: { type: 'string' },
          body: { type: 'string', default: '' },
          at: { type: 'string' },
          width: { type: 'string' },
        },
        strict: true,
      });

      if (!values.title) {
        handleError('--title is required');
      }

      const position = values.at !== undefined ? parseInt(values.at, 10) : undefined;
      if (values.at !== undefined) {
        if (isNaN(position)) handleError('--at must be a number');
        if (position < 0) handleError('--at must be non-negative');
      }

      const data = storage.load(cwd);
      const result = tree.addCard(data, {
        title: values.title,
        parentId: values.parent || null,
        body: values.body,
        position,
      });

      if (!result) {
        handleError('Parent not found');
      }

      storage.save(cwd, data);

      const rendered = render.renderMutation('add', result.card, {
        breadcrumbs: result.breadcrumbs,
        card: result.card,
        termWidth: resolveTermWidth(values),
      });
      writeAndExit(rendered);
      break;
    }

    case 'edit': {
      const { values, positionals } = parseArgs({
        args: subArgs,
        options: {
          title: { type: 'string' },
          body: { type: 'string' },
          width: { type: 'string' },
        },
        allowPositionals: true,
        strict: true,
      });

      const id = positionals[0];
      if (!id) {
        handleError('Card ID is required');
      }

      const data = storage.load(cwd);

      const result = tree.editCard(data, id, {
        title: values.title,
        body: values.body,
      });

      if (!result) {
        handleError(`Card not found: ${id}`);
      }

      storage.save(cwd, data);

      const rendered = render.renderMutation('edit', result.card, {
        breadcrumbs: result.breadcrumbs,
        card: result.card,
        oldTitle: result.oldTitle,
        oldBody: result.oldBody,
        termWidth: resolveTermWidth(values),
      });
      writeAndExit(rendered);
      break;
    }

    case 'remove': {
      const { positionals } = parseArgs({
        args: subArgs,
        options: {
          width: { type: 'string' },
        },
        allowPositionals: true,
        strict: true,
      });

      const id = positionals[0];
      if (!id) {
        handleError('Card ID is required');
      }

      const data = storage.load(cwd);
      const result = tree.deleteCard(data, id);

      if (!result) {
        handleError(`Card not found: ${id}`);
      }

      storage.save(cwd, data);

      const rendered = render.renderMutation('remove', result, {});
      writeAndExit(rendered);
      break;
    }

    case 'move': {
      const { values, positionals } = parseArgs({
        args: subArgs,
        options: {
          to: { type: 'string' },
          parent: { type: 'string' },
          at: { type: 'string' },
          width: { type: 'string' },
        },
        allowPositionals: true,
        strict: true,
      });

      const id = positionals[0];
      if (!id) {
        handleError('Card ID is required');
      }

      // --to is primary flag, --parent is backward compat
      const rawParent = values.to !== undefined ? values.to : values.parent;

      const position = values.at !== undefined ? parseInt(values.at, 10) : undefined;
      if (values.at !== undefined) {
        if (isNaN(position)) handleError('--at must be a number');
        if (position < 0) handleError('--at must be non-negative');
      }

      const data = storage.load(cwd);

      // Determine newParentId
      let newParentId;
      if (rawParent === undefined && values.at !== undefined) {
        // Reorder in place: --at without --to means stay in current parent
        const parentResult = tree.findParent(data, id);
        if (!parentResult) {
          handleError('Card not found');
        }
        newParentId = parentResult.parent ? parentResult.parent.id : null;
      } else if (rawParent === undefined) {
        newParentId = null;
      } else if (rawParent === '' || rawParent === 'root') {
        newParentId = null;
      } else {
        newParentId = rawParent;
      }

      const result = tree.moveCard(data, id, newParentId, position);

      if (!result) {
        handleError('Move failed: card not found or would create cycle');
      }

      storage.save(cwd, data);

      // Get target parent title
      const targetParentTitle = newParentId
        ? (tree.findById(data, newParentId) || {}).title || 'unknown'
        : 'root';
      const rendered = render.renderMutation('move', result.card, {
        fromParentTitle: result.sourceParentTitle,
        toParentTitle: targetParentTitle,
      });
      writeAndExit(rendered);
      break;
    }

    case 'read': {
      const { values, positionals } = parseArgs({
        args: subArgs,
        options: {
          depth: { type: 'string' },
          full: { type: 'boolean', default: false },
          'include-archived': { type: 'boolean', default: false },
          'archived-only': { type: 'boolean', default: false },
          width: { type: 'string' },
        },
        allowPositionals: true,
        strict: true,
      });

      const id = positionals[0] || null;
      const archiveFilter = values['archived-only']
        ? 'archived-only'
        : values['include-archived']
          ? 'include-archived'
          : 'active';
      const depth = values.depth !== undefined ? parseInt(values.depth, 10) : 1;
      if (values.depth !== undefined && isNaN(depth)) {
        handleError('--depth must be a number');
      }

      const data = storage.load(cwd);

      if (id) {
        const treeResult = tree.renderTree(data, id, { depth, archiveFilter });
        if (!treeResult || treeResult.cards.length === 0) {
          handleError(`Card not found: ${id}`);
        }
        // treeResult.cards[0] is the root card with nested children already
        const cardToRender = treeResult.cards[0];
        // Merge full body from original card (renderTree only has bodyPreview)
        const fullCard = tree.findById(data, id);
        cardToRender.body = fullCard.body;
        cardToRender.title = fullCard.title;
        const rendered = render.renderCard(cardToRender, treeResult.breadcrumbs || [], {
          full: values.full,
          termWidth: resolveTermWidth(values),
          archiveFilter,
        });
        writeAndExit(rendered);
      } else {
        // Root view: synthesize root card with depth-limited children
        const treeResult = tree.renderTree(data, null, { depth, archiveFilter });
        const rootCard = {
          id: '(root)',
          title: 'burrow',
          created: data.cards[0]?.created || new Date().toISOString(),
          archived: false,
          body: '',
          children: treeResult.cards,  // already nested
        };
        const rendered = render.renderCard(rootCard, [], {
          full: values.full,
          termWidth: resolveTermWidth(values),
          archiveFilter,
        });
        writeAndExit(rendered);
      }
      break;
    }

    case 'dump': {
      const { values } = parseArgs({
        args: subArgs,
        options: {
          full: { type: 'boolean', default: true },
          'include-archived': { type: 'boolean', default: false },
          'archived-only': { type: 'boolean', default: false },
          width: { type: 'string' },
        },
        strict: true,
      });

      const archiveFilter = values['archived-only']
        ? 'archived-only'
        : values['include-archived']
          ? 'include-archived'
          : 'active';

      const data = storage.load(cwd);

      // Dump as root card with full tree depth
      const treeResult = tree.renderTree(data, null, { depth: 0, archiveFilter });
      const rootCard = {
        id: '(root)',
        title: 'burrow',
        created: data.cards[0]?.created || new Date().toISOString(),
        archived: false,
        body: '',
        children: treeResult.cards,  // already nested
      };
      const rendered = render.renderCard(rootCard, [], {
        full: values.full,
        termWidth: resolveTermWidth(values),
        archiveFilter,
      });
      writeAndExit(rendered);
      break;
    }

    case 'archive': {
      const { positionals } = parseArgs({
        args: subArgs,
        options: {
          width: { type: 'string' },
        },
        allowPositionals: true,
        strict: true,
      });

      const id = positionals[0];
      if (!id) {
        handleError('Card ID is required');
      }

      const data = storage.load(cwd);
      const result = tree.archiveCard(data, id);

      if (!result) {
        handleError(`Card not found: ${id}`);
      }

      storage.save(cwd, data);

      const rendered = render.renderMutation('archive', result, {});
      writeAndExit(rendered);
      break;
    }

    case 'unarchive': {
      const { positionals } = parseArgs({
        args: subArgs,
        options: {
          width: { type: 'string' },
        },
        allowPositionals: true,
        strict: true,
      });

      const id = positionals[0];
      if (!id) {
        handleError('Card ID is required');
      }

      const data = storage.load(cwd);
      const result = tree.unarchiveCard(data, id);

      if (!result) {
        handleError(`Card not found: ${id}`);
      }

      storage.save(cwd, data);

      const rendered = render.renderMutation('unarchive', result, {});
      writeAndExit(rendered);
      break;
    }

    case 'path': {
      const { positionals } = parseArgs({
        args: subArgs,
        options: {
          width: { type: 'string' },
        },
        allowPositionals: true,
        strict: true,
      });

      const id = positionals[0];
      if (!id) {
        handleError('Card ID is required');
      }

      const data = storage.load(cwd);
      const result = tree.getPath(data, id);

      if (!result) {
        handleError(`Card not found: ${id}`);
      }

      // Strip children to keep path output clean
      const cleanPath = result.map((card) => ({ id: card.id, title: card.title }));
      const rendered = render.renderPath(cleanPath);
      writeAndExit(rendered);
      break;
    }

    case 'find': {
      const { positionals: findPositionals } = parseArgs({
        args: subArgs,
        options: {},
        allowPositionals: true,
        strict: true,
      });

      const query = findPositionals.join(' ').trim();
      if (!query) {
        handleError('Search query is required. Usage: find <query>');
      }

      const data = storage.load(cwd);
      const matches = tree.searchCards(data, query);

      if (matches.length === 0) {
        writeAndExit(`No cards matching "${query}"`);
      } else {
        const lines = matches.map((m) => `  ${m.id}  ${m.path}`);
        writeAndExit(`Found ${matches.length} match${matches.length === 1 ? '' : 'es'}:\n${lines.join('\n')}`);
      }
      break;
    }

    default:
      handleError(
        `Unknown command: ${command}. Available: init, add, edit, remove, move, read, dump, path, find, archive, unarchive`
      );
  }
}

main().catch((err) => {
  process.stdout.write(render.renderError(err.message) + '\n');
  process.exit(1);
});
