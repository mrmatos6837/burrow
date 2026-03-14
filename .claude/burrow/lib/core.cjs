'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

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
 * Generate a unique 8-char hex ID.
 * Uses crypto.randomUUID() — collision probability with even 10,000 cards is negligible (~0.000001%).
 * @returns {string} 8-char hex string
 */
function generateId() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
}

module.exports = { ensureDataDir, generateId };
