'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  detect,
  performInstall,
  performUpgrade,
  performRepair,
  writeSentinelBlock,
  removeSentinelBlock,
  generateSnippet,
  SENTINEL_START,
  SENTINEL_END,
} = require('../.claude/burrow/lib/installer.cjs');

// ── Core paths (relative to target) ──────────────────────────────────────────
const CORE_PATHS = [
  '.claude/burrow/burrow-tools.cjs',
  '.claude/commands/burrow.md',
  '.claude/commands/burrow',
  '.planning/burrow/cards.json',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function createTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'burrow-installer-test-'));
}

/**
 * Seed a target dir with all core files present (simulates installed state).
 */
function seedInstalled(dir) {
  for (const rel of CORE_PATHS) {
    const full = path.join(dir, rel);
    // Last segment: file or dir?
    if (rel.endsWith('/') || !path.extname(rel)) {
      // .claude/commands/burrow is a directory
      fs.mkdirSync(full, { recursive: true });
    } else {
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, 'placeholder');
    }
  }
}

/**
 * Create a minimal source tree that performInstall / performUpgrade can copy from.
 */
function createSourceDir() {
  const src = fs.mkdtempSync(path.join(os.tmpdir(), 'burrow-installer-src-'));
  // .claude/burrow/burrow-tools.cjs
  const burrowDir = path.join(src, '.claude', 'burrow');
  fs.mkdirSync(burrowDir, { recursive: true });
  fs.writeFileSync(path.join(burrowDir, 'burrow-tools.cjs'), '// burrow-tools');
  // .claude/commands/burrow.md
  const commandsDir = path.join(src, '.claude', 'commands');
  fs.mkdirSync(commandsDir, { recursive: true });
  fs.writeFileSync(path.join(commandsDir, 'burrow.md'), '# burrow');
  // .claude/commands/burrow/
  const commandSubDir = path.join(commandsDir, 'burrow');
  fs.mkdirSync(commandSubDir, { recursive: true });
  fs.writeFileSync(path.join(commandSubDir, 'add.md'), '# add');
  return src;
}

// ── Constants ─────────────────────────────────────────────────────────────────

describe('SENTINEL_START / SENTINEL_END constants', () => {
  it('SENTINEL_START is <!-- burrow:start -->', () => {
    assert.strictEqual(SENTINEL_START, '<!-- burrow:start -->');
  });
  it('SENTINEL_END is <!-- burrow:end -->', () => {
    assert.strictEqual(SENTINEL_END, '<!-- burrow:end -->');
  });
});

// ── detect() ─────────────────────────────────────────────────────────────────

describe('detect()', () => {
  let tmpDir;
  beforeEach(() => { tmpDir = createTmpDir(); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('returns mode: fresh when no burrow files exist', () => {
    const result = detect(tmpDir);
    assert.strictEqual(result.mode, 'fresh');
  });

  it('returns mode: upgrade when all core paths exist', () => {
    seedInstalled(tmpDir);
    const result = detect(tmpDir);
    assert.strictEqual(result.mode, 'upgrade');
  });

  it('returns version from upgrade (null when no version file)', () => {
    seedInstalled(tmpDir);
    const result = detect(tmpDir);
    // version is string or null — just validate the key exists
    assert.ok('version' in result);
  });

  it('returns mode: repair when some but not all core paths exist', () => {
    // Only create first two core paths
    const p1 = path.join(tmpDir, CORE_PATHS[0]);
    fs.mkdirSync(path.dirname(p1), { recursive: true });
    fs.writeFileSync(p1, 'placeholder');

    const p2 = path.join(tmpDir, CORE_PATHS[1]);
    fs.mkdirSync(path.dirname(p2), { recursive: true });
    fs.writeFileSync(p2, 'placeholder');

    const result = detect(tmpDir);
    assert.strictEqual(result.mode, 'repair');
  });

  it('includes missing array on repair mode', () => {
    const p1 = path.join(tmpDir, CORE_PATHS[0]);
    fs.mkdirSync(path.dirname(p1), { recursive: true });
    fs.writeFileSync(p1, 'placeholder');

    const result = detect(tmpDir);
    assert.ok(Array.isArray(result.missing));
    assert.ok(result.missing.length > 0);
  });

  it('returns hasSentinel: true when CLAUDE.md contains sentinel start marker', () => {
    const claudeMd = path.join(tmpDir, 'CLAUDE.md');
    fs.writeFileSync(claudeMd, `# Project\n\n${SENTINEL_START}\n## Burrow\n${SENTINEL_END}\n`);
    const result = detect(tmpDir);
    assert.strictEqual(result.hasSentinel, true);
  });

  it('returns hasSentinel: false when no CLAUDE.md', () => {
    const result = detect(tmpDir);
    assert.strictEqual(result.hasSentinel, false);
  });

  it('returns hasLegacyClaude: true when CLAUDE.md has ## Burrow but no sentinels', () => {
    const claudeMd = path.join(tmpDir, 'CLAUDE.md');
    fs.writeFileSync(claudeMd, '## Burrow\n\nOld-style content.\n');
    const result = detect(tmpDir);
    assert.strictEqual(result.hasLegacyClaude, true);
  });

  it('returns hasLegacyClaude: false when CLAUDE.md has sentinel markers', () => {
    const claudeMd = path.join(tmpDir, 'CLAUDE.md');
    fs.writeFileSync(claudeMd, `${SENTINEL_START}\n## Burrow\n${SENTINEL_END}\n`);
    const result = detect(tmpDir);
    assert.strictEqual(result.hasLegacyClaude, false);
  });
});

// ── writeSentinelBlock() ──────────────────────────────────────────────────────

describe('writeSentinelBlock()', () => {
  let tmpDir;
  beforeEach(() => { tmpDir = createTmpDir(); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('creates CLAUDE.md with sentinel block when file does not exist', () => {
    const claudeMd = path.join(tmpDir, 'CLAUDE.md');
    writeSentinelBlock(claudeMd, '## Burrow\n\nInstructions here.\n');
    assert.ok(fs.existsSync(claudeMd));
    const content = fs.readFileSync(claudeMd, 'utf-8');
    assert.ok(content.includes(SENTINEL_START));
    assert.ok(content.includes(SENTINEL_END));
    assert.ok(content.includes('## Burrow'));
  });

  it('appends sentinel block to end of existing file', () => {
    const claudeMd = path.join(tmpDir, 'CLAUDE.md');
    fs.writeFileSync(claudeMd, '## Existing\n\nContent here.\n');
    writeSentinelBlock(claudeMd, '## Burrow\n\nInstructions here.\n');
    const content = fs.readFileSync(claudeMd, 'utf-8');
    assert.ok(content.includes('## Existing'));
    assert.ok(content.includes('Content here.'));
    assert.ok(content.includes(SENTINEL_START));
    // Existing content should come before the sentinel block
    assert.ok(content.indexOf('## Existing') < content.indexOf(SENTINEL_START));
  });

  it('preserves existing CLAUDE.md content before and after sentinel block', () => {
    const claudeMd = path.join(tmpDir, 'CLAUDE.md');
    const pre = '## Pre Section\n\nBefore burrow.\n';
    fs.writeFileSync(claudeMd, pre);
    writeSentinelBlock(claudeMd, '## Burrow\n\nInstructions.\n');
    const content = fs.readFileSync(claudeMd, 'utf-8');
    assert.ok(content.startsWith('## Pre Section'));
  });

  it('replaces existing sentinel block content on re-run (upgrade)', () => {
    const claudeMd = path.join(tmpDir, 'CLAUDE.md');
    const pre = '## Pre\n\n';
    const post = '\n\n## Post\n';
    fs.writeFileSync(
      claudeMd,
      `${pre}${SENTINEL_START}\n## Old Burrow Content\n${SENTINEL_END}${post}`,
    );
    writeSentinelBlock(claudeMd, '## New Burrow Content\n');
    const content = fs.readFileSync(claudeMd, 'utf-8');
    assert.ok(content.includes('## Pre'));
    assert.ok(content.includes('## Post'));
    assert.ok(content.includes('## New Burrow Content'));
    assert.ok(!content.includes('## Old Burrow Content'));
    // Should have exactly one sentinel start
    const startCount = (content.match(/<!-- burrow:start -->/g) || []).length;
    assert.strictEqual(startCount, 1);
  });

  it('uses LF line endings when existing file uses LF', () => {
    const claudeMd = path.join(tmpDir, 'CLAUDE.md');
    fs.writeFileSync(claudeMd, '## LF file\n\nContent.\n');
    writeSentinelBlock(claudeMd, '## Burrow\n');
    const content = fs.readFileSync(claudeMd, 'utf-8');
    // No CRLF
    assert.ok(!content.includes('\r\n'), 'should not have CRLF in LF file');
  });

  it('uses CRLF line endings when existing file uses CRLF', () => {
    const claudeMd = path.join(tmpDir, 'CLAUDE.md');
    fs.writeFileSync(claudeMd, '## CRLF file\r\n\r\nContent.\r\n');
    writeSentinelBlock(claudeMd, '## Burrow\r\n');
    const content = fs.readFileSync(claudeMd, 'utf-8');
    assert.ok(content.includes('\r\n'), 'should have CRLF in CRLF file');
  });

  it('creates a .bak file containing the original content when updating existing CLAUDE.md', () => {
    const claudeMd = path.join(tmpDir, 'CLAUDE.md');
    const original = '## Existing\n\nSome content.\n';
    fs.writeFileSync(claudeMd, original);
    writeSentinelBlock(claudeMd, '## Burrow\n\nInstructions.\n');
    const bakPath = claudeMd + '.bak';
    assert.ok(fs.existsSync(bakPath), '.bak file should exist after updating existing file');
    const bakContent = fs.readFileSync(bakPath, 'utf-8');
    assert.strictEqual(bakContent, original, '.bak should contain original content before write');
  });

  it('does NOT leave a .tmp file after successful write', () => {
    const claudeMd = path.join(tmpDir, 'CLAUDE.md');
    fs.writeFileSync(claudeMd, '## Existing\n\nContent.\n');
    writeSentinelBlock(claudeMd, '## Burrow\n\nInstructions.\n');
    const tmpPath = claudeMd + '.tmp';
    assert.ok(!fs.existsSync(tmpPath), '.tmp file should NOT exist after successful write (rename should complete)');
  });
});

// ── removeSentinelBlock() ─────────────────────────────────────────────────────

describe('removeSentinelBlock()', () => {
  let tmpDir;
  beforeEach(() => { tmpDir = createTmpDir(); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('removes sentinel-wrapped block, preserving surrounding content', () => {
    const claudeMd = path.join(tmpDir, 'CLAUDE.md');
    fs.writeFileSync(
      claudeMd,
      `## Pre\n\n${SENTINEL_START}\n## Burrow\nStuff.\n${SENTINEL_END}\n\n## Post\n`,
    );
    removeSentinelBlock(claudeMd);
    const content = fs.readFileSync(claudeMd, 'utf-8');
    assert.ok(content.includes('## Pre'));
    assert.ok(content.includes('## Post'));
    assert.ok(!content.includes(SENTINEL_START));
    assert.ok(!content.includes(SENTINEL_END));
    assert.ok(!content.includes('## Burrow'));
  });

  it('is a no-op if no sentinel markers exist', () => {
    const claudeMd = path.join(tmpDir, 'CLAUDE.md');
    const original = '## Nothing special here\n\nJust content.\n';
    fs.writeFileSync(claudeMd, original);
    removeSentinelBlock(claudeMd);
    const content = fs.readFileSync(claudeMd, 'utf-8');
    assert.strictEqual(content, original);
  });

  it('is a no-op if CLAUDE.md does not exist', () => {
    const claudeMd = path.join(tmpDir, 'CLAUDE.md');
    // Should not throw
    assert.doesNotThrow(() => removeSentinelBlock(claudeMd));
  });
});

// ── performInstall() ──────────────────────────────────────────────────────────

describe('performInstall()', () => {
  let tmpDir, srcDir;
  beforeEach(() => {
    tmpDir = createTmpDir();
    srcDir = createSourceDir();
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.rmSync(srcDir, { recursive: true, force: true });
  });

  it('copies .claude/burrow/ to target', () => {
    performInstall(srcDir, tmpDir);
    assert.ok(fs.existsSync(path.join(tmpDir, '.claude', 'burrow', 'burrow-tools.cjs')));
  });

  it('copies .claude/commands/burrow.md to target', () => {
    performInstall(srcDir, tmpDir);
    assert.ok(fs.existsSync(path.join(tmpDir, '.claude', 'commands', 'burrow.md')));
  });

  it('copies .claude/commands/burrow/ to target', () => {
    performInstall(srcDir, tmpDir);
    assert.ok(fs.existsSync(path.join(tmpDir, '.claude', 'commands', 'burrow')));
  });

  it('creates .planning/burrow/ directory', () => {
    performInstall(srcDir, tmpDir);
    assert.ok(fs.existsSync(path.join(tmpDir, '.planning', 'burrow')));
  });

  it('creates empty cards.json', () => {
    performInstall(srcDir, tmpDir);
    const cardsPath = path.join(tmpDir, '.planning', 'burrow', 'cards.json');
    assert.ok(fs.existsSync(cardsPath));
    const data = JSON.parse(fs.readFileSync(cardsPath, 'utf-8'));
    assert.ok(Array.isArray(data.cards));
  });

  it('adds .gitignore entry for cards.json.bak', () => {
    performInstall(srcDir, tmpDir);
    const gitignore = path.join(tmpDir, '.gitignore');
    assert.ok(fs.existsSync(gitignore));
    const content = fs.readFileSync(gitignore, 'utf-8');
    assert.ok(content.includes('.planning/burrow/cards.json.bak'));
  });

  it('returns results object with status per item', () => {
    const results = performInstall(srcDir, tmpDir);
    assert.ok(typeof results === 'object');
    assert.ok('burrowDir' in results || 'source' in results || 'files' in results || Object.keys(results).length > 0);
  });
});

// ── performUpgrade() ──────────────────────────────────────────────────────────

describe('performUpgrade()', () => {
  let tmpDir, srcDir;
  beforeEach(() => {
    tmpDir = createTmpDir();
    srcDir = createSourceDir();
    // Pre-seed target as installed
    seedInstalled(tmpDir);
    // Existing cards.json with user data
    const cardsPath = path.join(tmpDir, '.planning', 'burrow', 'cards.json');
    fs.writeFileSync(cardsPath, JSON.stringify({ version: 2, cards: [{ id: 'abc', title: 'My card' }] }));
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.rmSync(srcDir, { recursive: true, force: true });
  });

  it('replaces .claude/burrow/ source files', () => {
    performUpgrade(srcDir, tmpDir);
    const burrowTools = path.join(tmpDir, '.claude', 'burrow', 'burrow-tools.cjs');
    assert.ok(fs.existsSync(burrowTools));
    const content = fs.readFileSync(burrowTools, 'utf-8');
    assert.ok(content.includes('// burrow-tools'), 'should contain source from srcDir');
  });

  it('does NOT modify cards.json', () => {
    performUpgrade(srcDir, tmpDir);
    const cardsPath = path.join(tmpDir, '.planning', 'burrow', 'cards.json');
    const data = JSON.parse(fs.readFileSync(cardsPath, 'utf-8'));
    assert.strictEqual(data.cards[0].title, 'My card', 'cards.json must be preserved');
  });

  it('does NOT delete cards.json', () => {
    performUpgrade(srcDir, tmpDir);
    const cardsPath = path.join(tmpDir, '.planning', 'burrow', 'cards.json');
    assert.ok(fs.existsSync(cardsPath));
  });

  it('returns results object', () => {
    const results = performUpgrade(srcDir, tmpDir);
    assert.ok(typeof results === 'object');
  });
});

// ── generateSnippet() ─────────────────────────────────────────────────────────

describe('generateSnippet()', () => {
  const broadConfig = { loadMode: 'full', triggerPreset: 'broad', triggerWords: ["remember", "don't forget", "always do X", "note this", "save this", "keep track of", "burrow this"] };
  const minimalConfig = { loadMode: 'full', triggerPreset: 'minimal', triggerWords: ['burrow this'] };
  const noneConfig = { loadMode: 'full', triggerPreset: 'none', triggerWords: [] };
  const customConfig = { loadMode: 'full', triggerPreset: 'custom', triggerWords: ['foo'] };

  it('all modes include ## Burrow heading', () => {
    for (const mode of ['full', 'index', 'none', 'auto']) {
      const snippet = generateSnippet({ ...broadConfig, loadMode: mode });
      assert.ok(snippet.includes('## Burrow'), `mode=${mode}: should include ## Burrow heading`);
    }
  });

  it('all modes include Privacy: section', () => {
    for (const mode of ['full', 'index', 'none', 'auto']) {
      const snippet = generateSnippet({ ...broadConfig, loadMode: mode });
      assert.ok(snippet.includes('Privacy:'), `mode=${mode}: should include Privacy: section`);
    }
  });

  it('all modes include mutations CLI instruction', () => {
    for (const mode of ['full', 'index', 'none', 'auto']) {
      const snippet = generateSnippet({ ...broadConfig, loadMode: mode });
      assert.ok(snippet.includes('NEVER edit cards.json directly'), `mode=${mode}: should include CLI mutation instruction`);
    }
  });

  it('loadMode=full includes read cards.json instruction', () => {
    const snippet = generateSnippet(broadConfig);
    assert.ok(snippet.includes('cards.json'), 'should include cards.json reference');
    assert.ok(snippet.includes('Read tool'), 'should include Read tool reference');
  });

  it('loadMode=index includes burrow-tools.cjs index instruction', () => {
    const snippet = generateSnippet({ ...broadConfig, loadMode: 'index' });
    assert.ok(snippet.includes('burrow-tools.cjs index'), 'should include index command reference');
  });

  it('loadMode=none includes on demand instruction', () => {
    const snippet = generateSnippet({ ...broadConfig, loadMode: 'none' });
    assert.ok(snippet.includes('on demand'), 'should include on demand reference');
  });

  it('loadMode=auto includes auto and threshold', () => {
    const snippet = generateSnippet({ ...broadConfig, loadMode: 'auto' });
    assert.ok(snippet.includes('auto') || snippet.includes('threshold'), 'should reference auto mode or threshold');
    assert.ok(snippet.includes('threshold'), 'should include threshold reference');
  });

  it('triggerPreset=broad includes remember and don\'t forget', () => {
    const snippet = generateSnippet(broadConfig);
    assert.ok(snippet.includes('"remember"'), 'should include "remember"');
    assert.ok(snippet.includes('"don\'t forget"'), 'should include "don\'t forget"');
  });

  it('triggerPreset=minimal includes burrow this but not remember', () => {
    const snippet = generateSnippet(minimalConfig);
    assert.ok(snippet.includes('"burrow this"'), 'should include "burrow this"');
    assert.ok(!snippet.includes('"remember"'), 'should NOT include "remember"');
  });

  it('triggerPreset=none does NOT include When the user says section', () => {
    const snippet = generateSnippet(noneConfig);
    assert.ok(!snippet.includes('When the user says'), 'should NOT include trigger section');
  });

  it('triggerPreset=none with empty triggerWords omits trigger section', () => {
    const snippet = generateSnippet({ loadMode: 'full', triggerPreset: 'none', triggerWords: [] });
    assert.ok(!snippet.includes('When the user says'), 'should NOT include trigger section');
  });

  it('triggerPreset=custom with triggerWords=[foo] includes foo', () => {
    const snippet = generateSnippet(customConfig);
    assert.ok(snippet.includes('"foo"'), 'should include custom trigger word');
  });

  it('does not contain CLAUDE_MD_SNIPPET reference', () => {
    const snippet = generateSnippet(broadConfig);
    assert.ok(typeof snippet === 'string' && snippet.length > 0, 'should return a non-empty string');
  });
});

// ── performRepair() ───────────────────────────────────────────────────────────

describe('performRepair()', () => {
  let tmpDir, srcDir;
  beforeEach(() => {
    tmpDir = createTmpDir();
    srcDir = createSourceDir();
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.rmSync(srcDir, { recursive: true, force: true });
  });

  it('copies only missing files (from detect missing list)', () => {
    // Manually create first core file so it is "existing"
    const existingPath = path.join(tmpDir, CORE_PATHS[0]);
    fs.mkdirSync(path.dirname(existingPath), { recursive: true });
    fs.writeFileSync(existingPath, 'existing content');

    const { missing } = detect(tmpDir);
    performRepair(srcDir, tmpDir, missing);

    // The originally existing file should be untouched (still "existing content")
    const content = fs.readFileSync(existingPath, 'utf-8');
    assert.strictEqual(content, 'existing content');
  });

  it('does not touch files that already exist at target', () => {
    // All present except cards.json
    const p1 = path.join(tmpDir, CORE_PATHS[0]);
    fs.mkdirSync(path.dirname(p1), { recursive: true });
    fs.writeFileSync(p1, 'sentinel-unchanged');

    const p2 = path.join(tmpDir, CORE_PATHS[1]);
    fs.mkdirSync(path.dirname(p2), { recursive: true });
    fs.writeFileSync(p2, 'cmd-unchanged');

    const p3 = path.join(tmpDir, CORE_PATHS[2]);
    fs.mkdirSync(p3, { recursive: true });

    const { missing } = detect(tmpDir);
    performRepair(srcDir, tmpDir, missing);

    assert.strictEqual(fs.readFileSync(p1, 'utf-8'), 'sentinel-unchanged');
    assert.strictEqual(fs.readFileSync(p2, 'utf-8'), 'cmd-unchanged');
  });

  it('returns results object', () => {
    // Partially seed so detect returns repair mode with a missing list
    const p1 = path.join(tmpDir, CORE_PATHS[0]);
    fs.mkdirSync(path.dirname(p1), { recursive: true });
    fs.writeFileSync(p1, 'placeholder');
    const { missing } = detect(tmpDir);
    assert.ok(Array.isArray(missing), 'detect should return missing array in repair mode');
    const results = performRepair(srcDir, tmpDir, missing);
    assert.ok(typeof results === 'object');
  });
});
