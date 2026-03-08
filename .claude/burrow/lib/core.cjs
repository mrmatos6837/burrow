'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

/**
 * Write JSON success result to stdout and exit.
 * @param {*} result - The data payload
 */
function output(result) {
  process.stdout.write(JSON.stringify({ success: true, data: result }) + '\n');
  process.exit(0);
}

/**
 * Write JSON error result to stdout and exit with code 1.
 * @param {string} message - Error description
 * @param {string} [code="INVALID_OPERATION"] - Error code
 */
function errorOut(message, code = 'INVALID_OPERATION') {
  process.stdout.write(JSON.stringify({ success: false, error: message, code }) + '\n');
  process.exit(1);
}

/**
 * Ensure the .planning/burrow/ directory exists.
 * Does NOT create cards.json -- storage.load handles empty state.
 * @param {string} cwd - Working directory
 */
function ensureDataDir(cwd) {
  const dir = path.join(cwd, '.planning', 'burrow');
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Recursively collect all card IDs from the data tree.
 * @param {object} data - Root data object with .cards array
 * @returns {Set<string>} Set of all IDs in the tree
 */
function collectAllIds(data) {
  const ids = new Set();
  function walk(cards) {
    for (const card of cards) {
      ids.add(card.id);
      if (card.children && Array.isArray(card.children)) {
        walk(card.children);
      }
    }
  }
  walk(data.cards || []);
  return ids;
}

/**
 * Generate a unique 8-char hex ID.
 * @param {Set<string>} existingIds - Set of IDs already in use
 * @returns {string} 8-char hex string
 */
function generateId(existingIds) {
  let id;
  do {
    id = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
  } while (existingIds.has(id));
  return id;
}

module.exports = { output, errorOut, ensureDataDir, generateId, collectAllIds };
