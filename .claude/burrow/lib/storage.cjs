'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ensureDataDir } = require('./core.cjs');

const DATA_FILE = 'items.json';
const BACKUP_EXT = '.bak';
const TMP_EXT = '.tmp';

/**
 * Resolve the path to items.json within the given working directory.
 * @param {string} cwd
 * @returns {string}
 */
function dataPath(cwd) {
  return path.join(cwd, '.planning', 'burrow', DATA_FILE);
}

/**
 * Load the burrow data from items.json.
 * Returns default empty structure if the file does not exist.
 * @param {string} cwd - Working directory
 * @returns {object} Parsed data
 */
function load(cwd) {
  const filePath = dataPath(cwd);
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return { version: 1, ordering: 'custom', items: [] };
    }
    throw err;
  }
}

/**
 * Save the burrow data to items.json with atomic write and backup.
 * 1. Ensure data directory exists
 * 2. If items.json exists, copy to items.json.bak
 * 3. Write to items.json.tmp
 * 4. Rename tmp to items.json
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

module.exports = { load, save };
