'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ensureDataDir } = require('./core.cjs');

const DATA_FILE = 'cards.json';
const BACKUP_EXT = '.bak';
const TMP_EXT = '.tmp';

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
    return migrate(data);
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
  const backupPath = filePath + BACKUP_EXT;
  const tmpPath = filePath + TMP_EXT;

  // Backup existing file
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, backupPath);
  }

  // Atomic write: tmp then rename
  const content = JSON.stringify(data, null, 2) + '\n';
  fs.writeFileSync(tmpPath, content, 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

module.exports = { load, save, migrate };
