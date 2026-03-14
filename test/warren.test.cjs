'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { load, save } = require('../.claude/burrow/lib/warren.cjs');

describe('storage', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'burrow-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('load', () => {
    it('returns v2 default structure when file is missing', () => {
      const data = load(tmpDir);
      assert.deepStrictEqual(data, {
        version: 2,
        cards: [],
      });
    });

    it('reads existing v2 cards.json correctly', () => {
      const existing = {
        version: 2,
        cards: [{ id: 'aabbccdd', title: 'test', created: '2026-01-01T00:00:00.000Z', archived: false, body: '', children: [] }],
      };
      const dir = path.join(tmpDir, '.planning', 'burrow');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'cards.json'), JSON.stringify(existing, null, 2) + '\n');

      const data = load(tmpDir);
      assert.deepStrictEqual(data, existing);
    });

    it('migrates v1 data to v2 on load', () => {
      const v1Data = {
        version: 1,
        ordering: 'custom',
        cards: [
          {
            id: 'aabbccdd',
            title: 'Card A',
            position: 0,
            created: '2026-01-01T00:00:00.000Z',
            archived: false,
            notes: 'some notes',
            children: {
              ordering: 'custom',
              cards: [
                {
                  id: 'eeff0011',
                  title: 'Child',
                  position: 0,
                  created: '2026-01-01T01:00:00.000Z',
                  archived: false,
                  notes: '',
                  children: { ordering: 'custom', cards: [] },
                },
              ],
            },
          },
        ],
      };
      const dir = path.join(tmpDir, '.planning', 'burrow');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'cards.json'), JSON.stringify(v1Data, null, 2) + '\n');

      const data = load(tmpDir);
      assert.equal(data.version, 2);
      assert.equal(data.ordering, undefined);
      assert.equal(data.cards[0].body, 'some notes');
      assert.equal(data.cards[0].notes, undefined);
      assert.equal(data.cards[0].position, undefined);
      assert.ok(Array.isArray(data.cards[0].children));
      assert.equal(data.cards[0].children[0].body, '');
      assert.equal(data.cards[0].children[0].position, undefined);
      assert.ok(Array.isArray(data.cards[0].children[0].children));
    });

    it('migration is idempotent on v2 data', () => {
      const v2Data = {
        version: 2,
        cards: [
          {
            id: 'aabbccdd',
            title: 'Card A',
            created: '2026-01-01T00:00:00.000Z',
            archived: false,
            body: 'my body',
            children: [],
          },
        ],
      };
      const dir = path.join(tmpDir, '.planning', 'burrow');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'cards.json'), JSON.stringify(v2Data, null, 2) + '\n');

      const data = load(tmpDir);
      assert.deepStrictEqual(data, v2Data);
    });

    it('migration handles items key at root', () => {
      const v1Data = {
        version: 1,
        ordering: 'custom',
        items: [
          {
            id: 'aabbccdd',
            title: 'Card A',
            position: 0,
            created: '2026-01-01T00:00:00.000Z',
            archived: false,
            notes: '',
            children: { ordering: 'custom', items: [] },
          },
        ],
      };
      const dir = path.join(tmpDir, '.planning', 'burrow');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'cards.json'), JSON.stringify(v1Data, null, 2) + '\n');

      const data = load(tmpDir);
      assert.equal(data.version, 2);
      assert.ok(Array.isArray(data.cards));
      assert.equal(data.cards.length, 1);
      assert.equal(data.items, undefined);
    });

    it('migration handles empty children', () => {
      const v1Data = {
        version: 1,
        ordering: 'custom',
        cards: [
          {
            id: 'aabbccdd',
            title: 'Card A',
            position: 0,
            created: '2026-01-01T00:00:00.000Z',
            archived: false,
            notes: '',
            children: { ordering: 'custom', cards: [] },
          },
        ],
      };
      const dir = path.join(tmpDir, '.planning', 'burrow');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'cards.json'), JSON.stringify(v1Data, null, 2) + '\n');

      const data = load(tmpDir);
      assert.ok(Array.isArray(data.cards[0].children));
      assert.equal(data.cards[0].children.length, 0);
    });

    it('schema validation: throws on cards being a non-array string', () => {
      const dir = path.join(tmpDir, '.planning', 'burrow');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'cards.json'), JSON.stringify({ cards: 'not-an-array' }) + '\n');
      assert.throws(() => load(tmpDir), (err) => {
        assert.ok(err instanceof Error);
        assert.ok(/invalid|schema/i.test(err.message), `Expected 'invalid' or 'schema' in message, got: ${err.message}`);
        return true;
      });
    });

    it('schema validation: throws when cards key is missing (only version present)', () => {
      const dir = path.join(tmpDir, '.planning', 'burrow');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'cards.json'), JSON.stringify({ version: 2 }) + '\n');
      assert.throws(() => load(tmpDir), (err) => {
        assert.ok(err instanceof Error);
        assert.ok(/invalid|schema/i.test(err.message), `Expected error message to mention invalid/schema, got: ${err.message}`);
        return true;
      });
    });

    it('schema validation: throws when parsed value is null', () => {
      const dir = path.join(tmpDir, '.planning', 'burrow');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'cards.json'), 'null\n');
      assert.throws(() => load(tmpDir), (err) => {
        assert.ok(err instanceof Error);
        assert.ok(/invalid|schema/i.test(err.message), `Expected error message to mention invalid/schema, got: ${err.message}`);
        return true;
      });
    });

    it('schema validation: throws when card id is not a string', () => {
      const dir = path.join(tmpDir, '.planning', 'burrow');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'cards.json'), JSON.stringify({ version: 2, cards: [{ id: 123 }] }) + '\n');
      assert.throws(() => load(tmpDir), (err) => {
        assert.ok(err instanceof Error);
        assert.ok(/invalid|schema/i.test(err.message), `Expected error message to mention invalid/schema, got: ${err.message}`);
        return true;
      });
    });

    it('schema validation: valid v2 data loads successfully without throwing', () => {
      const dir = path.join(tmpDir, '.planning', 'burrow');
      fs.mkdirSync(dir, { recursive: true });
      const v2Data = { version: 2, cards: [{ id: 'aabbccdd', title: 'test', created: '2026-01-01T00:00:00.000Z', archived: false, body: '', children: [] }] };
      fs.writeFileSync(path.join(dir, 'cards.json'), JSON.stringify(v2Data) + '\n');
      assert.doesNotThrow(() => load(tmpDir));
    });

    it('migrate not called for v2 data (PERF-09): valid v2 loads unchanged', () => {
      const dir = path.join(tmpDir, '.planning', 'burrow');
      fs.mkdirSync(dir, { recursive: true });
      const v2Data = { version: 2, cards: [] };
      fs.writeFileSync(path.join(dir, 'cards.json'), JSON.stringify(v2Data) + '\n');
      const data = load(tmpDir);
      assert.deepStrictEqual(data, v2Data);
    });
  });

  describe('save', () => {
    it('creates cards.json with correct content', () => {
      const data = { version: 2, cards: [] };
      save(tmpDir, data);

      const filePath = path.join(tmpDir, '.planning', 'burrow', 'cards.json');
      assert.ok(fs.existsSync(filePath), 'cards.json should exist');

      const content = fs.readFileSync(filePath, 'utf-8');
      assert.deepStrictEqual(JSON.parse(content), data);
      assert.ok(content.endsWith('\n'), 'file should end with newline');
    });

    it('creates .bak backup of previous file before writing', () => {
      const original = { version: 2, cards: [{ id: '11111111', title: 'original' }] };
      const updated = { version: 2, cards: [{ id: '11111111', title: 'updated' }] };

      save(tmpDir, original);
      save(tmpDir, updated);

      const bakPath = path.join(tmpDir, '.planning', 'burrow', 'cards.json.bak');
      assert.ok(fs.existsSync(bakPath), 'backup file should exist');

      const bakContent = JSON.parse(fs.readFileSync(bakPath, 'utf-8'));
      assert.deepStrictEqual(bakContent, original, 'backup should contain original data');

      const currentContent = JSON.parse(
        fs.readFileSync(path.join(tmpDir, '.planning', 'burrow', 'cards.json'), 'utf-8')
      );
      assert.deepStrictEqual(currentContent, updated, 'current file should contain updated data');
    });

    it('uses atomic write (.tmp does not remain after save)', () => {
      const data = { version: 2, cards: [] };
      save(tmpDir, data);

      const tmpPath = path.join(tmpDir, '.planning', 'burrow', 'cards.json.tmp');
      assert.ok(!fs.existsSync(tmpPath), '.tmp file should not remain after save');
    });
  });
});
