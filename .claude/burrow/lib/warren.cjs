'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ensureDataDir, atomicWriteJSON } = require('./core.cjs');

const DATA_FILE = 'cards.json';

/**
 * Resolve the path to cards.json within the given working directory.
 * @param {string} cwd
 * @returns {string}
 */
function dataPath(cwd) {
  return path.join(cwd, '.planning', 'burrow', DATA_FILE);
}

/**
 * Recursively migrate a single card from v1 to v2 format.
 * - Renames notes -> body
 * - Deletes position
 * - Flattens children from {ordering, cards/items: []} to plain []
 * @param {object} card
 */
function migrateCard(card) {
  // Rename notes -> body
  if (card.notes !== undefined) {
    card.body = card.notes;
    delete card.notes;
  }
  if (card.body === undefined) {
    card.body = '';
  }

  // Delete position
  delete card.position;

  // Flatten children
  if (card.children && !Array.isArray(card.children)) {
    // v1 children: {ordering, cards: [...]} or {ordering, items: [...]}
    const childArray = card.children.cards || card.children.items || [];
    card.children = childArray;
  }
  if (!card.children) {
    card.children = [];
  }

  // Recurse into children
  for (const child of card.children) {
    migrateCard(child);
  }
}

/**
 * Migrate data from v1 to v2 format. Idempotent on v2 data.
 * - Root: items -> cards, delete ordering
 * - Cards: notes -> body, delete position, flatten children
 * - Set version: 2
 * @param {object} data
 * @returns {object} Migrated data (mutated in place)
 */
function migrate(data) {
  if (data.version >= 2) return data;

  // Root: items -> cards
  if (data.items && !data.cards) {
    data.cards = data.items;
    delete data.items;
  }

  // Delete root ordering
  delete data.ordering;

  // Migrate each card
  if (data.cards) {
    for (const card of data.cards) {
      migrateCard(card);
    }
  } else {
    data.cards = [];
  }

  data.version = 2;
  return data;
}

/**
 * Validate the schema of parsed cards.json data.
 * Throws a human-readable Error if the data is structurally invalid.
 * @param {*} data - Parsed JSON value
 */
function validateSchema(data) {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Burrow: invalid cards.json — expected a JSON object, got ' + (data === null ? 'null' : Array.isArray(data) ? 'array' : typeof data));
  }

  // Support v1 (items) and v2 (cards) root arrays
  const rootArray = data.cards !== undefined ? data.cards : data.items;

  if (rootArray === undefined) {
    throw new Error("Burrow: invalid cards.json — missing 'cards' array");
  }

  if (!Array.isArray(rootArray)) {
    throw new Error("Burrow: invalid cards.json — expected 'cards' to be an array, got " + typeof rootArray);
  }

  // Spot-check: first element must have a string id (if present)
  if (rootArray.length > 0 && typeof rootArray[0].id !== 'string') {
    throw new Error("Burrow: invalid cards.json — expected card 'id' to be a string, got " + typeof rootArray[0].id);
  }
}

/**
 * Load the burrow data from cards.json.
 * Returns default empty v2 structure if the file does not exist.
 * Automatically migrates v1 data to v2 format.
 * @param {string} cwd - Working directory
 * @returns {object} Parsed data in v2 format
 */
function load(cwd) {
  const filePath = dataPath(cwd);
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    validateSchema(data);
    // Skip migrate() entirely for already-v2 data (PERF-09)
    if (data.version < 2) {
      return migrate(data);
    }
    return data;
  } catch (err) {
    if (err.code === 'ENOENT') {
      return { version: 2, cards: [] };
    }
    throw err;
  }
}

/**
 * Save the burrow data to cards.json with atomic write and backup.
 * 1. Ensure data directory exists
 * 2. If cards.json exists, copy to cards.json.bak
 * 3. Write to cards.json.tmp
 * 4. Rename tmp to cards.json
 * @param {string} cwd - Working directory
 * @param {object} data - Data to save
 */
function save(cwd, data) {
  ensureDataDir(cwd);
  const filePath = dataPath(cwd);
  atomicWriteJSON(filePath, data);
}

module.exports = { load, save, migrate, dataPath };
