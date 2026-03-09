#!/usr/bin/env node
'use strict';

const { parseArgs } = require('node:util');
const path = require('node:path');

const core = require('./lib/core.cjs');
const storage = require('./lib/warren.cjs');
const tree = require('./lib/mongoose.cjs');
const render = require('./lib/render.cjs');

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
 * @param {string} rendered - Formatted string
 */
function writeAndExit(rendered) {
  process.stdout.write(rendered + '\n');
  process.exit(0);
}

/**
 * Build breadcrumbs array for a card from getPath result.
 * @param {object} data - Root data object
 * @param {string} id - Card ID
 * @returns {Array<{id, title}>} Ancestor breadcrumbs (not including the card itself)
 */
function getBreadcrumbs(data, id) {
  const pathResult = tree.getPath(data, id);
  if (!pathResult) return [];
  // Strip the last element (the card itself), map to {id, title}
  return pathResult.slice(0, -1).map((c) => ({ id: c.id, title: c.title }));
}

/**
 * Reconstruct a nested tree from the flat renderTree output.
 * Takes flat cards (each with a depth property) and nests deeper cards
 * as children of their parent at depth N-1.
 * @param {Array} flatCards - Flat array from renderTree
 * @param {number} [baseDepth=1] - The depth level that counts as "root" (1 for card view, 0 for root view)
 * @returns {Array} Top-level cards with nested children
 */
function nestFlatCards(flatCards, baseDepth) {
  if (!flatCards || flatCards.length === 0) return [];
  const base = baseDepth !== undefined ? baseDepth : 1;
  const stack = [];
  const roots = [];

  for (const entry of flatCards) {
    const card = { ...entry, children: [] };
    const d = card.depth - base; // normalize to 0-based

    if (d === 0) {
      roots.push(card);
      stack.length = 1;
      stack[0] = card;
    } else {
      const parentIdx = d - 1;
      if (parentIdx >= 0 && stack[parentIdx]) {
        stack[parentIdx].children.push(card);
      }
      stack.length = d + 1;
      stack[d] = card;
    }
  }

  return roots;
}

function main() {
  const command = process.argv[2];
  const subArgs = process.argv.slice(3);
  const cwd = process.cwd();

  if (!command) {
    handleError(
      'No command provided. Available: add, edit, remove, move, read, dump, path, find, archive, unarchive'
    );
  }

  core.ensureDataDir(cwd);

  switch (command) {
    case 'add': {
      const { values } = parseArgs({
        args: subArgs,
        options: {
          title: { type: 'string' },
          parent: { type: 'string' },
          body: { type: 'string', default: '' },
          at: { type: 'string' },
        },
        strict: false,
      });

      if (!values.title) {
        handleError('--title is required');
      }

      const position = values.at !== undefined ? parseInt(values.at, 10) : undefined;

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

      const breadcrumbs = getBreadcrumbs(data, result.id);
      const rendered = render.renderMutation('add', result, {
        breadcrumbs,
        card: result,
        termWidth: process.stdout.columns || 80,
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
        },
        allowPositionals: true,
        strict: false,
      });

      const id = positionals[0];
      if (!id) {
        handleError('Card ID is required');
      }

      const data = storage.load(cwd);

      // Capture old values before editing
      const cardBefore = tree.findById(data, id);
      if (!cardBefore) {
        handleError(`Card not found: ${id}`);
      }
      const oldTitle = cardBefore.title;
      const oldBody = cardBefore.body;

      const result = tree.editCard(data, id, {
        title: values.title,
        body: values.body,
      });

      if (!result) {
        handleError(`Card not found: ${id}`);
      }

      storage.save(cwd, data);

      const breadcrumbs = getBreadcrumbs(data, id);
      const rendered = render.renderMutation('edit', result, {
        breadcrumbs,
        card: result,
        oldTitle,
        oldBody,
        termWidth: process.stdout.columns || 80,
      });
      writeAndExit(rendered);
      break;
    }

    case 'remove': {
      const { positionals } = parseArgs({
        args: subArgs,
        allowPositionals: true,
        strict: false,
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

      // Capture source parent title BEFORE moving
      const sourceResult = tree.findParent(data, id);
      const sourceParentTitle = sourceResult && sourceResult.parent
        ? sourceResult.parent.title
        : 'root';

      const result = tree.moveCard(data, id, newParentId, position);

      if (!result) {
        handleError('Move failed: card not found or would create cycle');
      }

      storage.save(cwd, data);

      // Get target parent title
      const targetParentTitle = newParentId
        ? (tree.findById(data, newParentId) || {}).title || 'unknown'
        : 'root';
      const rendered = render.renderMutation('move', result, {
        fromParentTitle: sourceParentTitle,
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
        },
        allowPositionals: true,
        strict: false,
      });

      const id = positionals[0] || null;
      const archiveFilter = values['archived-only']
        ? 'archived-only'
        : values['include-archived']
          ? 'include-archived'
          : 'active';
      const depth = values.depth !== undefined ? parseInt(values.depth, 10) : 1;

      const data = storage.load(cwd);

      if (id) {
        const card = tree.findById(data, id);
        if (!card) {
          handleError(`Card not found: ${id}`);
        }
        const breadcrumbs = getBreadcrumbs(data, id);

        // For depth > 1 or depth 0, get subtree children from renderTree
        const treeResult = tree.renderTree(data, id, { depth, archiveFilter });
        if (treeResult && treeResult.cards.length > 1) {
          // Reconstruct nested tree from flat renderTree output
          const childCards = nestFlatCards(treeResult.cards.filter((c) => c.depth >= 1));
          // Attach rendered children to card for display
          const cardCopy = { ...card, children: childCards };
          const rendered = render.renderCard(cardCopy, breadcrumbs, {
            full: values.full,
            termWidth: process.stdout.columns || 80,
            archiveFilter,
          });
          writeAndExit(rendered);
        } else {
          const rendered = render.renderCard(card, breadcrumbs, {
            full: values.full,
            termWidth: process.stdout.columns || 80,
            archiveFilter,
          });
          writeAndExit(rendered);
        }
      } else {
        // Root view: synthesize root card with depth-limited children
        const treeResult = tree.renderTree(data, null, { depth, archiveFilter });
        const prunedChildren = nestFlatCards(treeResult.cards, 0);
        const rootCard = {
          id: '(root)',
          title: 'burrow',
          created: data.cards[0]?.created || new Date().toISOString(),
          archived: false,
          body: '',
          children: prunedChildren,
        };
        const rendered = render.renderCard(rootCard, [], {
          full: values.full,
          termWidth: process.stdout.columns || 80,
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
          full: { type: 'boolean', default: false },
          'include-archived': { type: 'boolean', default: false },
          'archived-only': { type: 'boolean', default: false },
        },
        strict: false,
      });

      const archiveFilter = values['archived-only']
        ? 'archived-only'
        : values['include-archived']
          ? 'include-archived'
          : 'active';

      const data = storage.load(cwd);

      // Dump as root card with full tree depth
      const treeResult = tree.renderTree(data, null, { depth: 0, archiveFilter });
      const prunedChildren = nestFlatCards(treeResult.cards, 0);
      const rootCard = {
        id: '(root)',
        title: 'burrow',
        created: data.cards[0]?.created || new Date().toISOString(),
        archived: false,
        body: '',
        children: prunedChildren,
      };
      const rendered = render.renderCard(rootCard, [], {
        full: values.full,
        termWidth: process.stdout.columns || 80,
        archiveFilter,
      });
      writeAndExit(rendered);
      break;
    }

    case 'archive': {
      const { positionals } = parseArgs({
        args: subArgs,
        allowPositionals: true,
        strict: false,
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
        allowPositionals: true,
        strict: false,
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
        allowPositionals: true,
        strict: false,
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
      const query = subArgs.join(' ').trim().toLowerCase();
      if (!query) {
        handleError('Search query is required. Usage: find <query>');
      }

      const data = storage.load(cwd);

      // Recursive fuzzy search across all cards
      function searchCards(cards, ancestors) {
        let results = [];
        for (const card of cards) {
          if (card.archived) continue;
          const titleLower = (card.title || '').toLowerCase();
          const crumbs = [...ancestors, { id: card.id, title: card.title }];
          if (titleLower.includes(query)) {
            results.push({
              id: card.id,
              title: card.title,
              path: crumbs.map((c) => c.title).join(' › '),
            });
          }
          if (card.children && card.children.length) {
            results = results.concat(searchCards(card.children, crumbs));
          }
        }
        return results;
      }

      const matches = searchCards(data.cards, []);

      if (matches.length === 0) {
        writeAndExit(`No cards matching "${subArgs.join(' ')}"`);
      } else {
        const lines = matches.map((m) => `  ${m.id}  ${m.path}`);
        writeAndExit(`Found ${matches.length} match${matches.length === 1 ? '' : 'es'}:\n${lines.join('\n')}`);
      }
      break;
    }

    default:
      handleError(
        `Unknown command: ${command}. Available: add, edit, remove, move, read, dump, path, find, archive, unarchive`
      );
  }
}

try {
  main();
} catch (err) {
  process.stdout.write(render.renderError(err.message) + '\n');
  process.exit(1);
}
