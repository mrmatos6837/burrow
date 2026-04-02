'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ensureDataDir, atomicWriteJSON } = require('./core.cjs');

const CONFIG_FILE = 'config.json';

const DEFAULTS = {
  loadMode: 'auto',
  autoThreshold: 4000,
};

const CONFIG_SCHEMA = {
  loadMode: {
    type: 'string',
    values: ['full', 'index', 'none', 'auto'],
  },
  autoThreshold: {
    type: 'number',
    validate: (v) => Number.isInteger(v) && v > 0,
    validateMsg: 'must be a positive integer',
  },
};

function configPath(cwd) {
  return path.join(cwd, '.planning', 'burrow', CONFIG_FILE);
}

/**
 * Load config from .planning/burrow/config.json, merging defaults for missing keys.
 * Throws a descriptive error if config.json is missing.
 * @param {string} cwd - Working directory
 * @returns {object} Config object
 */
function load(cwd) {
  const filePath = configPath(cwd);
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error('No config.json found. Run npx create-burrow to set up.');
    }
    throw err;
  }
  const parsed = JSON.parse(raw);
  // Merge defaults for any missing keys (forward compat)
  return { ...DEFAULTS, ...parsed };
}

/**
 * Save config object to .planning/burrow/config.json atomically.
 * @param {string} cwd - Working directory
 * @param {object} configObj - Config data to save
 */
function save(cwd, configObj) {
  ensureDataDir(cwd);
  const filePath = configPath(cwd);
  atomicWriteJSON(filePath, configObj);
}

/**
 * Get a single config value by key.
 * @param {string} cwd - Working directory
 * @param {string} key - Config key
 * @returns {*} Raw value
 */
function get(cwd, key) {
  validateKey(key);
  const cfg = load(cwd);
  return cfg[key];
}

/**
 * Set a config value, validate it, and persist to config.json.
 * @param {string} cwd - Working directory
 * @param {string} key - Config key
 * @param {string} rawValue - Value as string (will be coerced if needed)
 * @returns {object} Updated config object
 */
function set(cwd, key, rawValue) {
  validateKey(key);
  const schema = CONFIG_SCHEMA[key];
  let value = rawValue;

  if (schema.type === 'number') {
    value = parseInt(rawValue, 10);
    if (isNaN(value)) {
      throw new Error(`Invalid value '${rawValue}' for ${key}. Value ${schema.validateMsg}.`);
    }
  }

  if (schema.values && !schema.values.includes(value)) {
    throw new Error(`Invalid value '${rawValue}' for ${key}. Valid values: ${schema.values.join(', ')}`);
  }
  if (schema.validate && !schema.validate(value)) {
    throw new Error(`Invalid value '${rawValue}' for ${key}. Value ${schema.validateMsg}.`);
  }

  const cfg = load(cwd);
  cfg[key] = value;
  save(cwd, cfg);
  return cfg;
}

/**
 * Return all current config values (with defaults for missing keys).
 * @param {string} cwd - Working directory
 * @returns {object} Config object
 */
function list(cwd) {
  return load(cwd);
}

/**
 * Validate that a key is in the schema.
 * @param {string} key
 */
function validateKey(key) {
  const validKeys = Object.keys(CONFIG_SCHEMA);
  if (!validKeys.includes(key)) {
    throw new Error(`Unknown config key '${key}'. Valid keys: ${validKeys.join(', ')}`);
  }
}

module.exports = { load, save, get, set, list, configPath, CONFIG_SCHEMA, DEFAULTS };
