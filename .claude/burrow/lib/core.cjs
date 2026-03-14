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
 * Uses crypto.randomUUID() — collision probability with even 10,000 cards is negligible (~0.000001%).
 * The existingIds parameter is accepted but ignored (kept for backward compatibility).
 * @returns {string} 8-char hex string
 */
function generateId() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
}

/**
 * @deprecated collectAllIds is no longer needed for ID generation.
 * Kept for backward compatibility only.
 */
module.exports = { ensureDataDir, generateId, collectAllIds };
