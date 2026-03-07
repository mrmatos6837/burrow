'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { load, save } = require('../lib/warren.cjs');

describe('storage', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'burrow-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('load', () => {
    it('returns default structure when file is missing', () => {
      const data = load(tmpDir);
      assert.deepStrictEqual(data, {
        version: 1,
        ordering: 'custom',
        items: [],
      });
    });

    it('reads existing items.json correctly', () => {
      const existing = {
        version: 1,
        ordering: 'alpha-asc',
        items: [{ id: 'aabbccdd', title: 'test', position: 0, children: { ordering: 'custom', items: [] } }],
      };
      const dir = path.join(tmpDir, '.planning', 'burrow');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'items.json'), JSON.stringify(existing, null, 2) + '\n');

      const data = load(tmpDir);
      assert.deepStrictEqual(data, existing);
    });
  });

  describe('save', () => {
    it('creates items.json with correct content', () => {
      const data = { version: 1, ordering: 'custom', items: [] };
      save(tmpDir, data);

      const filePath = path.join(tmpDir, '.planning', 'burrow', 'items.json');
      assert.ok(fs.existsSync(filePath), 'items.json should exist');

      const content = fs.readFileSync(filePath, 'utf-8');
      assert.deepStrictEqual(JSON.parse(content), data);
      assert.ok(content.endsWith('\n'), 'file should end with newline');
    });

    it('creates .bak backup of previous file before writing', () => {
      const original = { version: 1, ordering: 'custom', items: [{ id: '11111111', title: 'original' }] };
      const updated = { version: 1, ordering: 'custom', items: [{ id: '11111111', title: 'updated' }] };

      save(tmpDir, original);
      save(tmpDir, updated);

      const bakPath = path.join(tmpDir, '.planning', 'burrow', 'items.json.bak');
      assert.ok(fs.existsSync(bakPath), 'backup file should exist');

      const bakContent = JSON.parse(fs.readFileSync(bakPath, 'utf-8'));
      assert.deepStrictEqual(bakContent, original, 'backup should contain original data');

      const currentContent = JSON.parse(
        fs.readFileSync(path.join(tmpDir, '.planning', 'burrow', 'items.json'), 'utf-8')
      );
      assert.deepStrictEqual(currentContent, updated, 'current file should contain updated data');
    });

    it('uses atomic write (.tmp does not remain after save)', () => {
      const data = { version: 1, ordering: 'custom', items: [] };
      save(tmpDir, data);

      const tmpPath = path.join(tmpDir, '.planning', 'burrow', 'items.json.tmp');
      assert.ok(!fs.existsSync(tmpPath), '.tmp file should not remain after save');
    });
  });
});
