'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const BACKUP_EXT = '.bak';
const TMP_EXT = '.tmp';

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

/**
 * Atomic JSON write: backup existing file, write to tmp, rename to target.
 * @param {string} filePath - Absolute path to target JSON file
 * @param {object} data - Data to serialize
 */
function atomicWriteJSON(filePath, data) {
  const backupPath = filePath + BACKUP_EXT;
  const tmpPath = filePath + TMP_EXT;
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, backupPath);
  }
  const content = JSON.stringify(data, null, 2) + '\n';
  fs.writeFileSync(tmpPath, content, 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

module.exports = { ensureDataDir, generateId, atomicWriteJSON };
