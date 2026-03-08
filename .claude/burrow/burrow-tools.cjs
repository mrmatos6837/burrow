#!/usr/bin/env node
'use strict';

const { parseArgs } = require('node:util');
const path = require('node:path');

const core = require('./lib/core.cjs');
const storage = require('./lib/warren.cjs');
const tree = require('./lib/mongoose.cjs');
const render = require('./lib/render.cjs');

// --- Global --json flag ---
const jsonMode = process.argv.includes('--json');
// Filter --json from argv so parseArgs doesn't choke on it
const filteredArgv = process.argv.filter((a) => a !== '--json');

/**
 * Handle error output: JSON when --json, human-readable otherwise.
 * @param {string} message - Error description
 * @param {string} code - Error code
 */
function handleError(message, code) {
  if (jsonMode) {
    core.errorOut(message, code);
  } else {
    process.stdout.write(render.renderError(message) + '\n');
    process.exit(1);
  }
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

function main() {
  const command = filteredArgv[2];
  const subArgs = filteredArgv.slice(3);
  const cwd = process.cwd();

  if (!command) {
    handleError(
      'No command provided. Available: add, edit, delete, move, get, dump, path, archive, unarchive',
      'INVALID_OPERATION'
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
        },
        strict: false,
      });

      if (!values.title) {
        handleError('--title is required', 'INVALID_OPERATION');
      }

      const data = storage.load(cwd);
      const result = tree.addCard(data, {
        title: values.title,
        parentId: values.parent || null,
        body: values.body,
      });

      if (!result) {
        handleError('Parent not found', 'NOT_FOUND');
      }

      storage.save(cwd, data);

      if (jsonMode) {
        core.output(result);
      } else {
        const breadcrumbs = getBreadcrumbs(data, result.id);
        const rendered = render.renderMutation('add', result, {
          breadcrumbs,
          card: result,
          termWidth: process.stdout.columns || 80,
        });
        writeAndExit(rendered);
      }
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
        handleError('Card ID is required', 'INVALID_OPERATION');
      }

      const data = storage.load(cwd);

      // Capture old values before editing
      const cardBefore = tree.findById(data, id);
      if (!cardBefore) {
        handleError(`Card not found: ${id}`, 'NOT_FOUND');
      }
      const oldTitle = cardBefore.title;
      const oldBody = cardBefore.body;

      const result = tree.editCard(data, id, {
        title: values.title,
        body: values.body,
      });

      if (!result) {
        handleError(`Card not found: ${id}`, 'NOT_FOUND');
      }

      storage.save(cwd, data);

      if (jsonMode) {
        core.output(result);
      } else {
        const breadcrumbs = getBreadcrumbs(data, id);
        const rendered = render.renderMutation('edit', result, {
          breadcrumbs,
          card: result,
          oldTitle,
          oldBody,
          termWidth: process.stdout.columns || 80,
        });
        writeAndExit(rendered);
      }
      break;
    }

    case 'delete': {
      const { positionals } = parseArgs({
        args: subArgs,
        allowPositionals: true,
        strict: false,
      });

      const id = positionals[0];
      if (!id) {
        handleError('Card ID is required', 'INVALID_OPERATION');
      }

      const data = storage.load(cwd);
      const result = tree.deleteCard(data, id);

      if (!result) {
        handleError(`Card not found: ${id}`, 'NOT_FOUND');
      }

      storage.save(cwd, data);

      if (jsonMode) {
        core.output(result);
      } else {
        const rendered = render.renderMutation('delete', result, {});
        writeAndExit(rendered);
      }
      break;
    }

    case 'move': {
      const { values, positionals } = parseArgs({
        args: subArgs,
        options: {
          parent: { type: 'string' },
        },
        allowPositionals: true,
        strict: false,
      });

      const id = positionals[0];
      if (!id) {
        handleError('Card ID is required', 'INVALID_OPERATION');
      }

      // --parent "" or --parent "root" means move to root (null)
      let newParentId;
      if (values.parent === undefined) {
        newParentId = null;
      } else if (values.parent === '' || values.parent === 'root') {
        newParentId = null;
      } else {
        newParentId = values.parent;
      }

      const data = storage.load(cwd);

      // Capture source parent title BEFORE moving
      const sourceResult = tree.findParent(data, id);
      const sourceParentTitle = sourceResult && sourceResult.parent
        ? sourceResult.parent.title
        : 'root';

      const result = tree.moveCard(data, id, newParentId);

      if (!result) {
        handleError('Move failed: card not found or would create cycle', 'INVALID_OPERATION');
      }

      storage.save(cwd, data);

      if (jsonMode) {
        core.output(result);
      } else {
        // Get target parent title
        const targetParentTitle = newParentId
          ? (tree.findById(data, newParentId) || {}).title || 'unknown'
          : 'root';
        const rendered = render.renderMutation('move', result, {
          fromParentTitle: sourceParentTitle,
          toParentTitle: targetParentTitle,
        });
        writeAndExit(rendered);
      }
      break;
    }

    case 'get': {
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

      if (jsonMode) {
        const result = tree.renderTree(data, id, { depth, archiveFilter });
        if (result === null) {
          core.errorOut(`Card not found: ${id}`, 'NOT_FOUND');
        }
        core.output(result);
      } else {
        // Pretty-print path
        if (id) {
          const card = tree.findById(data, id);
          if (!card) {
            handleError(`Card not found: ${id}`, 'NOT_FOUND');
          }
          const breadcrumbs = getBreadcrumbs(data, id);

          // For depth > 1 or depth 0, get subtree children from renderTree
          const treeResult = tree.renderTree(data, id, { depth, archiveFilter });
          if (treeResult && treeResult.cards.length > 1) {
            // Build children from flat array (depth >= 1 entries are children)
            const childCards = treeResult.cards.filter((c) => c.depth === 1);
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
          // Root view: synthesize root card
          const rootCard = {
            id: '(root)',
            title: 'burrow',
            created: data.cards[0]?.created || new Date().toISOString(),
            archived: false,
            body: '',
            children: data.cards,
          };
          const rendered = render.renderCard(rootCard, [], {
            full: values.full,
            termWidth: process.stdout.columns || 80,
            archiveFilter,
          });
          writeAndExit(rendered);
        }
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

      if (jsonMode) {
        const result = tree.renderTree(data, null, { depth: 0, archiveFilter });
        if (result === null) {
          core.errorOut('Unexpected error', 'STORAGE_ERROR');
        }
        core.output(result);
      } else {
        // Dump as root card with full tree depth
        const rootCard = {
          id: '(root)',
          title: 'burrow',
          created: data.cards[0]?.created || new Date().toISOString(),
          archived: false,
          body: '',
          children: data.cards,
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

    case 'archive': {
      const { positionals } = parseArgs({
        args: subArgs,
        allowPositionals: true,
        strict: false,
      });

      const id = positionals[0];
      if (!id) {
        handleError('Card ID is required', 'INVALID_OPERATION');
      }

      const data = storage.load(cwd);
      const result = tree.archiveCard(data, id);

      if (!result) {
        handleError(`Card not found: ${id}`, 'NOT_FOUND');
      }

      storage.save(cwd, data);

      if (jsonMode) {
        core.output(result);
      } else {
        const rendered = render.renderMutation('archive', result, {});
        writeAndExit(rendered);
      }
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
        handleError('Card ID is required', 'INVALID_OPERATION');
      }

      const data = storage.load(cwd);
      const result = tree.unarchiveCard(data, id);

      if (!result) {
        handleError(`Card not found: ${id}`, 'NOT_FOUND');
      }

      storage.save(cwd, data);

      if (jsonMode) {
        core.output(result);
      } else {
        const rendered = render.renderMutation('unarchive', result, {});
        writeAndExit(rendered);
      }
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
        handleError('Card ID is required', 'INVALID_OPERATION');
      }

      const data = storage.load(cwd);
      const result = tree.getPath(data, id);

      if (!result) {
        handleError(`Card not found: ${id}`, 'NOT_FOUND');
      }

      // Strip children to keep path output clean
      const cleanPath = result.map((card) => ({ id: card.id, title: card.title }));

      if (jsonMode) {
        core.output(cleanPath);
      } else {
        const rendered = render.renderPath(cleanPath);
        writeAndExit(rendered);
      }
      break;
    }

    default:
      handleError(
        `Unknown command: ${command}. Available: add, edit, delete, move, get, dump, path, archive, unarchive`,
        'INVALID_OPERATION'
      );
  }
}

try {
  main();
} catch (err) {
  if (jsonMode) {
    core.errorOut(err.message, 'STORAGE_ERROR');
  } else {
    process.stdout.write(render.renderError(err.message) + '\n');
    process.exit(1);
  }
}
