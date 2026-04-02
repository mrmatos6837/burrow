'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Will be required after implementation exists
let config;
try {
  config = require('../.claude/burrow/lib/config.cjs');
} catch (_) {
  config = null;
}

const CONFIG_PATH = (...parts) => path.join(...parts, '.planning', 'burrow', 'config.json');

function writeConfig(tmpDir, data) {
  const dir = path.join(tmpDir, '.planning', 'burrow');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH(tmpDir), JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

describe('config library', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'burrow-config-test-'));
    // Re-require so module cache doesn't interfere
    config = require('../.claude/burrow/lib/config.cjs');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('DEFAULTS and CONFIG_SCHEMA', () => {
    it('DEFAULTS has loadMode=auto and autoThreshold=4000', () => {
      assert.equal(config.DEFAULTS.loadMode, 'auto');
      assert.equal(config.DEFAULTS.autoThreshold, 4000);
    });

    it('CONFIG_SCHEMA has loadMode and autoThreshold entries', () => {
      assert.ok(config.CONFIG_SCHEMA.loadMode, 'loadMode should exist in schema');
      assert.ok(config.CONFIG_SCHEMA.autoThreshold, 'autoThreshold should exist in schema');
    });

    it('CONFIG_SCHEMA loadMode has valid values array', () => {
      assert.deepStrictEqual(config.CONFIG_SCHEMA.loadMode.values, ['full', 'index', 'none', 'auto']);
    });

    it('DEFAULTS has triggerPreset=broad', () => {
      assert.equal(config.DEFAULTS.triggerPreset, 'broad');
    });

    it('DEFAULTS has triggerWords as array', () => {
      assert.ok(Array.isArray(config.DEFAULTS.triggerWords), 'triggerWords should be an array');
      assert.ok(config.DEFAULTS.triggerWords.length > 0, 'triggerWords should not be empty');
    });

    it('CONFIG_SCHEMA has triggerPreset with valid values', () => {
      assert.ok(config.CONFIG_SCHEMA.triggerPreset, 'triggerPreset should exist in schema');
      assert.deepStrictEqual(config.CONFIG_SCHEMA.triggerPreset.values, ['broad', 'minimal', 'none', 'custom']);
    });

    it('CONFIG_SCHEMA has triggerWords with type array', () => {
      assert.ok(config.CONFIG_SCHEMA.triggerWords, 'triggerWords should exist in schema');
      assert.equal(config.CONFIG_SCHEMA.triggerWords.type, 'array');
    });
  });

  describe('load', () => {
    it('throws helpful error when config.json missing', () => {
      assert.throws(
        () => config.load(tmpDir),
        (err) => {
          assert.ok(err instanceof Error);
          assert.ok(
            err.message.includes('No config.json found'),
            `Expected "No config.json found" in message, got: ${err.message}`
          );
          return true;
        }
      );
    });

    it('loads and returns config when file exists', () => {
      writeConfig(tmpDir, { loadMode: 'full', autoThreshold: 4000 });
      const result = config.load(tmpDir);
      assert.equal(result.loadMode, 'full');
      assert.equal(result.autoThreshold, 4000);
    });

    it('merges missing keys with defaults', () => {
      writeConfig(tmpDir, { loadMode: 'index' });
      const result = config.load(tmpDir);
      assert.equal(result.loadMode, 'index');
      assert.equal(result.autoThreshold, 4000, 'missing key should get default value');
    });
  });

  describe('save', () => {
    it('writes config.json atomically', () => {
      const data = { loadMode: 'auto', autoThreshold: 4000 };
      config.save(tmpDir, data);
      assert.ok(fs.existsSync(CONFIG_PATH(tmpDir)), 'config.json should exist');
      const written = JSON.parse(fs.readFileSync(CONFIG_PATH(tmpDir), 'utf-8'));
      assert.deepStrictEqual(written, data);
    });

    it('creates .bak backup before overwriting', () => {
      const first = { loadMode: 'auto', autoThreshold: 4000 };
      const second = { loadMode: 'index', autoThreshold: 4000 };
      config.save(tmpDir, first);
      config.save(tmpDir, second);
      const bakPath = CONFIG_PATH(tmpDir) + '.bak';
      assert.ok(fs.existsSync(bakPath), '.bak should exist after second save');
      const bak = JSON.parse(fs.readFileSync(bakPath, 'utf-8'));
      assert.deepStrictEqual(bak, first, 'backup should contain original data');
    });

    it('.tmp file does not remain after save', () => {
      config.save(tmpDir, { loadMode: 'auto', autoThreshold: 4000 });
      const tmpPath = CONFIG_PATH(tmpDir) + '.tmp';
      assert.ok(!fs.existsSync(tmpPath), '.tmp should not remain after save');
    });
  });

  describe('get', () => {
    it('returns raw value for known key', () => {
      writeConfig(tmpDir, { loadMode: 'index', autoThreshold: 4000 });
      const value = config.get(tmpDir, 'loadMode');
      assert.equal(value, 'index');
    });

    it('returns number for autoThreshold', () => {
      writeConfig(tmpDir, { loadMode: 'auto', autoThreshold: 8000 });
      const value = config.get(tmpDir, 'autoThreshold');
      assert.equal(value, 8000);
      assert.equal(typeof value, 'number');
    });

    it('throws on unknown key', () => {
      writeConfig(tmpDir, { loadMode: 'auto', autoThreshold: 4000 });
      assert.throws(
        () => config.get(tmpDir, 'badKey'),
        (err) => {
          assert.ok(err.message.includes('Unknown config key'), `got: ${err.message}`);
          return true;
        }
      );
    });
  });

  describe('set', () => {
    it('sets and persists valid loadMode value', () => {
      writeConfig(tmpDir, { loadMode: 'auto', autoThreshold: 4000 });
      config.set(tmpDir, 'loadMode', 'index');
      const updated = config.load(tmpDir);
      assert.equal(updated.loadMode, 'index');
    });

    it('returns updated config after set', () => {
      writeConfig(tmpDir, { loadMode: 'auto', autoThreshold: 4000 });
      const result = config.set(tmpDir, 'loadMode', 'full');
      assert.equal(result.loadMode, 'full');
    });

    it('converts autoThreshold string to number', () => {
      writeConfig(tmpDir, { loadMode: 'auto', autoThreshold: 4000 });
      config.set(tmpDir, 'autoThreshold', '8000');
      const updated = config.load(tmpDir);
      assert.equal(updated.autoThreshold, 8000);
      assert.equal(typeof updated.autoThreshold, 'number');
    });

    it('throws on unknown key', () => {
      writeConfig(tmpDir, { loadMode: 'auto', autoThreshold: 4000 });
      assert.throws(
        () => config.set(tmpDir, 'badKey', 'val'),
        (err) => {
          assert.ok(err.message.includes('Unknown config key'), `got: ${err.message}`);
          assert.ok(err.message.includes('badKey'), `got: ${err.message}`);
          return true;
        }
      );
    });

    it('throws on invalid loadMode value', () => {
      writeConfig(tmpDir, { loadMode: 'auto', autoThreshold: 4000 });
      assert.throws(
        () => config.set(tmpDir, 'loadMode', 'invalid'),
        (err) => {
          assert.ok(err.message.includes('Invalid value'), `got: ${err.message}`);
          assert.ok(err.message.includes('invalid'), `got: ${err.message}`);
          return true;
        }
      );
    });

    it('throws on negative autoThreshold', () => {
      writeConfig(tmpDir, { loadMode: 'auto', autoThreshold: 4000 });
      assert.throws(
        () => config.set(tmpDir, 'autoThreshold', '-1'),
        (err) => {
          assert.ok(err.message.includes('Invalid value'), `got: ${err.message}`);
          return true;
        }
      );
    });

    it('throws on non-numeric autoThreshold', () => {
      writeConfig(tmpDir, { loadMode: 'auto', autoThreshold: 4000 });
      assert.throws(
        () => config.set(tmpDir, 'autoThreshold', 'notanumber'),
        (err) => {
          assert.ok(err.message.includes('Invalid value'), `got: ${err.message}`);
          return true;
        }
      );
    });
  });

  describe('list', () => {
    it('returns full config object', () => {
      writeConfig(tmpDir, { loadMode: 'auto', autoThreshold: 4000 });
      const result = config.list(tmpDir);
      assert.ok('loadMode' in result, 'loadMode should be in result');
      assert.ok('autoThreshold' in result, 'autoThreshold should be in result');
    });

    it('list returns merged defaults for missing keys', () => {
      writeConfig(tmpDir, { loadMode: 'none' });
      const result = config.list(tmpDir);
      assert.equal(result.loadMode, 'none');
      assert.equal(result.autoThreshold, 4000);
    });
  });

  describe('triggerPreset and triggerWords', () => {
    it('set triggerPreset to minimal persists and get returns minimal', () => {
      writeConfig(tmpDir, { loadMode: 'auto', autoThreshold: 4000 });
      config.set(tmpDir, 'triggerPreset', 'minimal');
      const value = config.get(tmpDir, 'triggerPreset');
      assert.equal(value, 'minimal');
    });

    it('set triggerPreset to invalid throws with valid values listed', () => {
      writeConfig(tmpDir, { loadMode: 'auto', autoThreshold: 4000 });
      assert.throws(
        () => config.set(tmpDir, 'triggerPreset', 'invalid'),
        (err) => {
          assert.ok(err.message.includes('Invalid value'), `got: ${err.message}`);
          assert.ok(err.message.includes('broad'), `got: ${err.message}`);
          return true;
        }
      );
    });

    it('set triggerWords with valid JSON array persists', () => {
      writeConfig(tmpDir, { loadMode: 'auto', autoThreshold: 4000, triggerPreset: 'custom' });
      config.set(tmpDir, 'triggerWords', '["burrow this"]');
      const value = config.get(tmpDir, 'triggerWords');
      assert.deepStrictEqual(value, ['burrow this']);
    });

    it('set triggerWords with non-JSON throws descriptive error', () => {
      writeConfig(tmpDir, { loadMode: 'auto', autoThreshold: 4000 });
      assert.throws(
        () => config.set(tmpDir, 'triggerWords', 'not-json'),
        (err) => {
          assert.ok(err instanceof Error, 'should throw Error');
          assert.ok(err.message.length > 0, 'error message should not be empty');
          return true;
        }
      );
    });

    it('load with triggerPreset=broad returns broad trigger words', () => {
      writeConfig(tmpDir, { loadMode: 'auto', autoThreshold: 4000, triggerPreset: 'broad' });
      const cfg = config.load(tmpDir);
      assert.ok(Array.isArray(cfg.triggerWords), 'triggerWords should be an array');
      assert.ok(cfg.triggerWords.includes('remember'), 'broad preset should include "remember"');
    });

    it('load with triggerPreset=minimal returns only "burrow this"', () => {
      writeConfig(tmpDir, { loadMode: 'auto', autoThreshold: 4000, triggerPreset: 'minimal' });
      const cfg = config.load(tmpDir);
      assert.deepStrictEqual(cfg.triggerWords, ['burrow this']);
    });

    it('load with triggerPreset=none returns empty array', () => {
      writeConfig(tmpDir, { loadMode: 'auto', autoThreshold: 4000, triggerPreset: 'none' });
      const cfg = config.load(tmpDir);
      assert.deepStrictEqual(cfg.triggerWords, []);
    });

    it('load with triggerPreset=custom returns stored triggerWords', () => {
      writeConfig(tmpDir, { loadMode: 'auto', autoThreshold: 4000, triggerPreset: 'custom', triggerWords: ['foo', 'bar'] });
      const cfg = config.load(tmpDir);
      assert.deepStrictEqual(cfg.triggerWords, ['foo', 'bar']);
    });
  });
});
