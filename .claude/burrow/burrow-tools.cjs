#!/usr/bin/env node
'use strict';

const { parseArgs } = require('node:util');
const path = require('node:path');

const core = require('./lib/core.cjs');
const storage = require('./lib/warren.cjs');
const tree = require('./lib/mongoose.cjs');

/**
 * Shared handler for get/list/dump/children commands.
 * @param {object} data - Root data object
 * @param {object} opts - {id, depth, archiveFilter}
 */
function handleGet(data, { id, depth, archiveFilter }) {
  const result = tree.renderTree(data, id || null, { depth, archiveFilter });
  if (result === null) {
    core.errorOut(`Card not found: ${id}`, 'NOT_FOUND');
  }
  core.output(result);
}

function main() {
  const command = process.argv[2];
  const subArgs = process.argv.slice(3);
  const cwd = process.cwd();

  if (!command) {
    core.errorOut(
      'No command provided. Available: add, edit, delete, move, get, list, dump, children, path, archive, unarchive',
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
        core.errorOut('--title is required', 'INVALID_OPERATION');
      }

      const data = storage.load(cwd);
      const result = tree.addCard(data, {
        title: values.title,
        parentId: values.parent || null,
        body: values.body,
      });

      if (!result) {
        core.errorOut('Parent not found', 'NOT_FOUND');
      }

      storage.save(cwd, data);
      core.output(result);
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
        core.errorOut('Card ID is required', 'INVALID_OPERATION');
      }

      const data = storage.load(cwd);
      const result = tree.editCard(data, id, {
        title: values.title,
        body: values.body,
      });

      if (!result) {
        core.errorOut(`Card not found: ${id}`, 'NOT_FOUND');
      }

      storage.save(cwd, data);
      core.output(result);
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
        core.errorOut('Card ID is required', 'INVALID_OPERATION');
      }

      const data = storage.load(cwd);
      const result = tree.deleteCard(data, id);

      if (!result) {
        core.errorOut(`Card not found: ${id}`, 'NOT_FOUND');
      }

      storage.save(cwd, data);
      core.output(result);
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
        core.errorOut('Card ID is required', 'INVALID_OPERATION');
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
      const result = tree.moveCard(data, id, newParentId);

      if (!result) {
        core.errorOut('Move failed: card not found or would create cycle', 'INVALID_OPERATION');
      }

      storage.save(cwd, data);
      core.output(result);
      break;
    }

    case 'get': {
      const { values, positionals } = parseArgs({
        args: subArgs,
        options: {
          depth: { type: 'string' },
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
      handleGet(data, { id, depth, archiveFilter });
      break;
    }

    case 'list': {
      const data = storage.load(cwd);
      handleGet(data, { id: null, depth: 1, archiveFilter: 'active' });
      break;
    }

    case 'dump': {
      const { values } = parseArgs({
        args: subArgs,
        options: {
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
      handleGet(data, { id: null, depth: 0, archiveFilter });
      break;
    }

    case 'children': {
      const { positionals } = parseArgs({
        args: subArgs,
        allowPositionals: true,
        strict: false,
      });

      const id = positionals[0];
      if (!id) {
        core.errorOut('Card ID is required', 'INVALID_OPERATION');
      }

      const data = storage.load(cwd);
      handleGet(data, { id, depth: 1, archiveFilter: 'active' });
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
        core.errorOut('Card ID is required', 'INVALID_OPERATION');
      }

      const data = storage.load(cwd);
      const result = tree.archiveCard(data, id);

      if (!result) {
        core.errorOut(`Card not found: ${id}`, 'NOT_FOUND');
      }

      storage.save(cwd, data);
      core.output(result);
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
        core.errorOut('Card ID is required', 'INVALID_OPERATION');
      }

      const data = storage.load(cwd);
      const result = tree.unarchiveCard(data, id);

      if (!result) {
        core.errorOut(`Card not found: ${id}`, 'NOT_FOUND');
      }

      storage.save(cwd, data);
      core.output(result);
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
        core.errorOut('Card ID is required', 'INVALID_OPERATION');
      }

      const data = storage.load(cwd);
      const result = tree.getPath(data, id);

      if (!result) {
        core.errorOut(`Card not found: ${id}`, 'NOT_FOUND');
      }

      // Strip children to keep path output clean
      const cleanPath = result.map((card) => ({ id: card.id, title: card.title }));
      core.output(cleanPath);
      break;
    }

    default:
      core.errorOut(
        `Unknown command: ${command}. Available: add, edit, delete, move, get, list, dump, children, path, archive, unarchive`,
        'INVALID_OPERATION'
      );
  }
}

try {
  main();
} catch (err) {
  core.errorOut(err.message, 'STORAGE_ERROR');
}
