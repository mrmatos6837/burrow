#!/usr/bin/env node
'use strict';

const { parseArgs } = require('node:util');
const path = require('node:path');

const core = require('./lib/core.cjs');
const storage = require('./lib/warren.cjs');
const tree = require('./lib/mongoose.cjs');

function main() {
  const command = process.argv[2];
  const subArgs = process.argv.slice(3);
  const cwd = process.cwd();

  if (!command) {
    core.errorOut(
      'No command provided. Available: add, edit, delete, move, get, children, list, path',
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
          notes: { type: 'string', default: '' },
          position: { type: 'string' },
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
        notes: values.notes,
        position: values.position != null ? parseInt(values.position, 10) : undefined,
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
          notes: { type: 'string' },
          ordering: { type: 'string' },
        },
        allowPositionals: true,
        strict: false,
      });

      const id = positionals[0];
      if (!id) {
        core.errorOut('Card ID is required', 'INVALID_OPERATION');
      }

      if (values.ordering && !['custom', 'alpha-asc', 'alpha-desc'].includes(values.ordering)) {
        core.errorOut(
          'Invalid ordering. Must be one of: custom, alpha-asc, alpha-desc',
          'INVALID_OPERATION'
        );
      }

      const data = storage.load(cwd);
      const result = tree.editCard(data, id, {
        title: values.title,
        notes: values.notes,
        ordering: values.ordering,
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
          position: { type: 'string' },
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
      const result = tree.moveCard(
        data,
        id,
        newParentId,
        values.position != null ? parseInt(values.position, 10) : undefined
      );

      if (!result) {
        core.errorOut('Move failed: card not found or would create cycle', 'INVALID_OPERATION');
      }

      storage.save(cwd, data);
      core.output(result);
      break;
    }

    case 'get': {
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
      const result = tree.findById(data, id);

      if (!result) {
        core.errorOut(`Card not found: ${id}`, 'NOT_FOUND');
      }

      core.output(result);
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
      const result = tree.getChildren(data, id);
      core.output(result);
      break;
    }

    case 'list': {
      const { positionals } = parseArgs({
        args: subArgs,
        allowPositionals: true,
        strict: false,
      });

      const parentId = positionals[0] || null;
      const data = storage.load(cwd);
      const result = tree.listCards(data, parentId);
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
        `Unknown command: ${command}. Available: add, edit, delete, move, get, children, list, path`,
        'INVALID_OPERATION'
      );
  }
}

try {
  main();
} catch (err) {
  core.errorOut(err.message, 'STORAGE_ERROR');
}
