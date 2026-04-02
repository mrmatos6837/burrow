'use strict';

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Will be required after implementation exists
let loader;
let config;
try {
  loader = require('../.claude/burrow/lib/loader.cjs');
} catch (_) {
  loader = null;
}
try {
  config = require('../.claude/burrow/lib/config.cjs');
} catch (_) {
  config = null;
}

const CARDS_PATH = (...parts) => path.join(...parts, '.planning', 'burrow', 'cards.json');
const CONFIG_PATH = (...parts) => path.join(...parts, '.planning', 'burrow', 'config.json');

function writeBurrowDir(tmpDir) {
  const dir = path.join(tmpDir, '.planning', 'burrow');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeCards(tmpDir, cards) {
  const dir = path.join(tmpDir, '.planning', 'burrow');
  fs.mkdirSync(dir, { recursive: true });
  const data = { version: 2, cards };
  fs.writeFileSync(CARDS_PATH(tmpDir), JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function writeConfig(tmpDir, cfg) {
  const dir = path.join(tmpDir, '.planning', 'burrow');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH(tmpDir), JSON.stringify(cfg, null, 2) + '\n', 'utf-8');
}

const SAMPLE_CARDS = [
  {
    id: 'aaa11111',
    title: 'Root card 1',
    created: '2026-01-01T00:00:00Z',
    archived: false,
    body: 'Root body',
    children: [
      {
        id: 'bbb22222',
        title: 'Child card 1',
        created: '2026-01-02T00:00:00Z',
        archived: false,
        body: '',
        children: [],
      },
    ],
  },
  {
    id: 'ccc33333',
    title: 'Root card 2',
    created: '2026-01-03T00:00:00Z',
    archived: false,
    body: '',
    children: [],
  },
];

// Config schema tests
describe('config — indexDepth schema', () => {
  beforeEach(() => {
    config = require('../.claude/burrow/lib/config.cjs');
  });

  it('CONFIG_SCHEMA contains indexDepth', () => {
    assert.ok(config.CONFIG_SCHEMA.indexDepth, 'indexDepth should exist in CONFIG_SCHEMA');
  });

  it('CONFIG_SCHEMA.indexDepth type is number', () => {
    assert.equal(config.CONFIG_SCHEMA.indexDepth.type, 'number');
  });

  it('CONFIG_SCHEMA.indexDepth.validate rejects -1', () => {
    assert.equal(config.CONFIG_SCHEMA.indexDepth.validate(-1), false);
  });

  it('CONFIG_SCHEMA.indexDepth.validate accepts 0', () => {
    assert.equal(config.CONFIG_SCHEMA.indexDepth.validate(0), true);
  });

  it('CONFIG_SCHEMA.indexDepth.validate accepts positive integers', () => {
    assert.equal(config.CONFIG_SCHEMA.indexDepth.validate(3), true);
    assert.equal(config.CONFIG_SCHEMA.indexDepth.validate(100), true);
  });

  it('CONFIG_SCHEMA.indexDepth.validate rejects non-integers', () => {
    assert.equal(config.CONFIG_SCHEMA.indexDepth.validate(1.5), false);
  });

  it('DEFAULTS has indexDepth: 0', () => {
    assert.equal(config.DEFAULTS.indexDepth, 0);
  });
});

// Loader tests
describe('loader.load()', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'burrow-loader-test-'));
    loader = require('../.claude/burrow/lib/loader.cjs');
    config = require('../.claude/burrow/lib/config.cjs');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loadMode=full returns correct envelope shape', () => {
    writeCards(tmpDir, SAMPLE_CARDS);
    writeConfig(tmpDir, { loadMode: 'full' });

    const envelope = loader.load(tmpDir);

    assert.equal(envelope.mode, 'full');
    assert.ok(typeof envelope.cardCount === 'number', 'cardCount should be a number');
    assert.ok(envelope.data, 'data should be present');
    assert.ok(Array.isArray(envelope.data.cards), 'data.cards should be an array');
    assert.equal(envelope.data.version, 2);
  });

  it('loadMode=full returns all cards in data', () => {
    writeCards(tmpDir, SAMPLE_CARDS);
    writeConfig(tmpDir, { loadMode: 'full' });

    const envelope = loader.load(tmpDir);

    assert.equal(envelope.data.cards.length, 2);
    // Full mode includes body
    assert.equal(envelope.data.cards[0].body, 'Root body');
  });

  it('loadMode=full cardCount includes nested cards', () => {
    writeCards(tmpDir, SAMPLE_CARDS);
    writeConfig(tmpDir, { loadMode: 'full' });

    const envelope = loader.load(tmpDir);

    // 2 root + 1 child = 3 total
    assert.equal(envelope.cardCount, 3);
  });

  it('loadMode=index returns correct envelope shape', () => {
    writeCards(tmpDir, SAMPLE_CARDS);
    writeConfig(tmpDir, { loadMode: 'index' });

    const envelope = loader.load(tmpDir);

    assert.equal(envelope.mode, 'index');
    assert.ok(typeof envelope.cardCount === 'number', 'cardCount should be a number');
    assert.ok(envelope.data, 'data should be present');
    assert.ok(Array.isArray(envelope.data.cards), 'data.cards should be an array');
  });

  it('loadMode=index returns buildIndex output (no body)', () => {
    writeCards(tmpDir, SAMPLE_CARDS);
    writeConfig(tmpDir, { loadMode: 'index' });

    const envelope = loader.load(tmpDir);

    // Index mode strips body
    const firstCard = envelope.data.cards[0];
    assert.ok(!('body' in firstCard), 'index mode cards should not have body field');
    assert.ok('hasBody' in firstCard, 'index mode cards should have hasBody');
    assert.ok('childCount' in firstCard, 'index mode cards should have childCount');
  });

  it('loadMode=index with indexDepth=1 limits depth', () => {
    writeCards(tmpDir, SAMPLE_CARDS);
    writeConfig(tmpDir, { loadMode: 'index', indexDepth: 1 });

    const envelope = loader.load(tmpDir);

    assert.equal(envelope.mode, 'index');
    // With depth=1, children arrays should be empty
    const firstCard = envelope.data.cards[0];
    assert.equal(firstCard.children.length, 0, 'children should be empty at depth 1');
  });

  it('loadMode=none returns correct envelope shape', () => {
    writeCards(tmpDir, SAMPLE_CARDS);
    writeConfig(tmpDir, { loadMode: 'none' });

    const envelope = loader.load(tmpDir);

    assert.equal(envelope.mode, 'none');
    assert.ok(typeof envelope.cardCount === 'number', 'cardCount should be a number');
    assert.ok(!('data' in envelope), 'none mode should not have data property');
  });

  it('loadMode=none cardCount is accurate', () => {
    writeCards(tmpDir, SAMPLE_CARDS);
    writeConfig(tmpDir, { loadMode: 'none' });

    const envelope = loader.load(tmpDir);

    assert.equal(envelope.cardCount, 3);
  });

  it('loadMode=auto with small file resolves to full', () => {
    // Small cards.json (well under any threshold)
    writeCards(tmpDir, [{ id: 'tiny1111', title: 'tiny', created: '2026-01-01T00:00:00Z', archived: false, body: '', children: [] }]);
    // Set a large threshold so small file triggers full
    writeConfig(tmpDir, { loadMode: 'auto', autoThreshold: 9999999 });

    const envelope = loader.load(tmpDir);

    assert.equal(envelope.mode, 'full');
    assert.ok(envelope.data, 'full mode should have data');
  });

  it('loadMode=auto with large file resolves to index', () => {
    // Create a big cards.json by writing lots of cards
    const bigCards = [];
    for (let i = 0; i < 500; i++) {
      bigCards.push({
        id: `card${i.toString().padStart(4, '0')}`,
        title: `Card number ${i} with a somewhat long title for size`,
        created: '2026-01-01T00:00:00Z',
        archived: false,
        body: 'This is a longer body text that takes up more space in the JSON file and pushes the size over the threshold',
        children: [],
      });
    }
    writeCards(tmpDir, bigCards);
    // Set a tiny threshold so even a small file triggers index
    writeConfig(tmpDir, { loadMode: 'auto', autoThreshold: 1 });

    const envelope = loader.load(tmpDir);

    assert.equal(envelope.mode, 'index');
    assert.ok(envelope.data, 'index mode should have data');
  });

  it('auto mode uses fileSizeBytes / 4 for token estimation', () => {
    // Write a specific-sized cards.json
    writeCards(tmpDir, SAMPLE_CARDS);
    // Get actual file size
    const filePath = CARDS_PATH(tmpDir);
    const stat = fs.statSync(filePath);
    const estimatedTokens = Math.floor(stat.size / 4);

    // Set autoThreshold just above estimated tokens → should be full
    writeConfig(tmpDir, { loadMode: 'auto', autoThreshold: estimatedTokens + 1 });
    const envelopeFull = loader.load(tmpDir);
    assert.equal(envelopeFull.mode, 'full', 'just under threshold should be full');

    // Set autoThreshold equal to estimated tokens → should be index (not < threshold)
    writeConfig(tmpDir, { loadMode: 'auto', autoThreshold: estimatedTokens });
    const envelopeIndex = loader.load(tmpDir);
    assert.equal(envelopeIndex.mode, 'index', 'at threshold should be index');
  });

  it('handles empty cards.json (no cards)', () => {
    writeCards(tmpDir, []);
    writeConfig(tmpDir, { loadMode: 'full' });

    const envelope = loader.load(tmpDir);

    assert.equal(envelope.mode, 'full');
    assert.equal(envelope.cardCount, 0);
    assert.deepEqual(envelope.data.cards, []);
  });

  it('handles missing cards.json (returns empty)', () => {
    writeBurrowDir(tmpDir);
    writeConfig(tmpDir, { loadMode: 'full' });

    // warren.load returns empty v2 if file not found
    const envelope = loader.load(tmpDir);

    assert.equal(envelope.mode, 'full');
    assert.equal(envelope.cardCount, 0);
  });
});
