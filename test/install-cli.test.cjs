'use strict';

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// ── Helpers ───────────────────────────────────────────────────────────────────

const REPO_ROOT = path.join(__dirname, '..');
const INSTALL_SCRIPT = path.join(REPO_ROOT, 'install.cjs');

function run(args, opts = {}) {
  const cmd = `node ${INSTALL_SCRIPT} ${args}`;
  return execSync(cmd, { encoding: 'utf-8', cwd: REPO_ROOT, ...opts });
}

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'burrow-cli-test-'));
}

function removeTempDir(dir) {
  if (dir && fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('install.cjs --help', () => {
  it('prints usage text', () => {
    const output = run('--help');
    assert.ok(output.includes('Usage:'), 'should contain Usage:');
    assert.ok(output.includes('--yes'), 'should describe --yes flag');
    assert.ok(output.includes('--interactive'), 'should describe --interactive flag');
    assert.ok(output.includes('--uninstall'), 'should describe --uninstall flag');
    assert.ok(output.includes('--help'), 'should describe --help flag');
  });
});

describe('install.cjs non-interactive TTY detection', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    removeTempDir(tmpDir);
  });

  it('detects piped stdin and auto-uses defaults', () => {
    // Pipe empty stdin to simulate non-TTY (e.g. npx)
    const output = execSync(
      `echo "" | node ${INSTALL_SCRIPT} "${tmpDir}"`,
      { encoding: 'utf-8', cwd: REPO_ROOT }
    );
    assert.ok(
      output.includes('Non-interactive terminal detected'),
      'should print non-interactive message'
    );
    // Should still complete the install successfully
    assert.ok(
      fs.existsSync(path.join(tmpDir, '.claude', 'burrow', 'burrow-tools.cjs')),
      'should install files despite non-TTY'
    );
  });

  it('does not print non-interactive message with --yes', () => {
    const output = execSync(
      `echo "" | node ${INSTALL_SCRIPT} --yes "${tmpDir}"`,
      { encoding: 'utf-8', cwd: REPO_ROOT }
    );
    assert.ok(
      !output.includes('Non-interactive terminal detected'),
      'should not print non-interactive message when --yes is explicit'
    );
  });
});

describe('install.cjs --yes (fresh install)', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    removeTempDir(tmpDir);
  });

  it('creates all expected files without prompts', () => {
    run(`--yes "${tmpDir}"`);

    assert.ok(
      fs.existsSync(path.join(tmpDir, '.claude', 'burrow', 'burrow-tools.cjs')),
      'burrow-tools.cjs should exist'
    );
    assert.ok(
      fs.existsSync(path.join(tmpDir, '.claude', 'commands', 'burrow.md')),
      'commands/burrow.md should exist'
    );
    assert.ok(
      fs.existsSync(path.join(tmpDir, '.claude', 'commands', 'burrow')),
      'commands/burrow dir should exist'
    );
    assert.ok(
      fs.existsSync(path.join(tmpDir, '.planning', 'burrow', 'cards.json')),
      'cards.json should exist'
    );
    assert.ok(
      fs.existsSync(path.join(tmpDir, 'CLAUDE.md')),
      'CLAUDE.md should exist'
    );
    assert.ok(
      fs.existsSync(path.join(tmpDir, '.gitignore')),
      '.gitignore should exist'
    );
  });

  it('cards.json contains valid JSON after install', () => {
    run(`--yes "${tmpDir}"`);
    const cardsPath = path.join(tmpDir, '.planning', 'burrow', 'cards.json');
    const content = fs.readFileSync(cardsPath, 'utf-8');
    const parsed = JSON.parse(content);
    assert.equal(parsed.version, 2, 'cards.json version should be 2');
    assert.ok(Array.isArray(parsed.cards), 'cards should be an array');
  });

  it('CLAUDE.md contains sentinel markers after install', () => {
    run(`--yes "${tmpDir}"`);
    const claudeMd = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
    assert.ok(claudeMd.includes('<!-- burrow:start -->'), 'should have sentinel start');
    assert.ok(claudeMd.includes('<!-- burrow:end -->'), 'should have sentinel end');
    assert.ok(claudeMd.includes('Burrow'), 'should contain Burrow content');
  });

  it('exit code is 0 on success', () => {
    // execSync throws on non-zero exit, so if this doesn't throw, exit is 0
    assert.doesNotThrow(() => run(`--yes "${tmpDir}"`));
  });
});

describe('install.cjs --yes (upgrade)', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTempDir();
    run(`--yes "${tmpDir}"`); // initial install
  });

  afterEach(() => {
    removeTempDir(tmpDir);
  });

  it('re-running detects upgrade and completes without error', () => {
    assert.doesNotThrow(() => run(`--yes "${tmpDir}"`));
  });

  it('upgrade output mentions "preserved" for cards.json', () => {
    const output = run(`--yes "${tmpDir}"`);
    assert.ok(output.includes('preserved'), 'should preserve cards.json');
  });

  it('preserves cards.json content on upgrade', () => {
    const cardsPath = path.join(tmpDir, '.planning', 'burrow', 'cards.json');
    const customData = JSON.stringify({ version: 2, cards: [{ id: 'test-id', title: 'My Card', body: '' }] });
    fs.writeFileSync(cardsPath, customData);

    // Re-run as upgrade
    run(`--yes "${tmpDir}"`);

    const after = fs.readFileSync(cardsPath, 'utf-8');
    assert.equal(after, customData, 'cards.json should be unchanged after upgrade');
  });
});

describe('install.cjs --uninstall --yes', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTempDir();
    run(`--yes "${tmpDir}"`); // install first
  });

  afterEach(() => {
    removeTempDir(tmpDir);
  });

  it('removes all Burrow files after install', () => {
    run(`--uninstall --yes "${tmpDir}"`);

    assert.ok(
      !fs.existsSync(path.join(tmpDir, '.claude', 'burrow')),
      '.claude/burrow should not exist'
    );
    assert.ok(
      !fs.existsSync(path.join(tmpDir, '.claude', 'commands', 'burrow.md')),
      '.claude/commands/burrow.md should not exist'
    );
    assert.ok(
      !fs.existsSync(path.join(tmpDir, '.claude', 'commands', 'burrow')),
      '.claude/commands/burrow should not exist'
    );
    assert.ok(
      !fs.existsSync(path.join(tmpDir, '.planning', 'burrow')),
      '.planning/burrow should not exist'
    );
  });

  it('cleans up empty parent directories after uninstall', () => {
    // After uninstall from a clean temp dir, .claude/ and .planning/ should be gone
    run(`--uninstall --yes "${tmpDir}"`);

    assert.ok(
      !fs.existsSync(path.join(tmpDir, '.claude')),
      '.claude/ should be removed when empty'
    );
    assert.ok(
      !fs.existsSync(path.join(tmpDir, '.planning')),
      '.planning/ should be removed when empty'
    );
  });

  it('removes CLAUDE.md sentinel block but preserves other content', () => {
    const claudeMdPath = path.join(tmpDir, 'CLAUDE.md');

    // Add extra content before the sentinel block
    const extra = '# My Project\n\nSome existing content.\n\n';
    const currentContent = fs.readFileSync(claudeMdPath, 'utf-8');
    fs.writeFileSync(claudeMdPath, extra + currentContent);

    run(`--uninstall --yes "${tmpDir}"`);

    const after = fs.readFileSync(claudeMdPath, 'utf-8');
    assert.ok(!after.includes('<!-- burrow:start -->'), 'sentinel start should be removed');
    assert.ok(!after.includes('<!-- burrow:end -->'), 'sentinel end should be removed');
    assert.ok(after.includes('# My Project'), 'extra content should be preserved');
    assert.ok(after.includes('Some existing content.'), 'extra body should be preserved');
  });

  it('exit code is 0 on successful uninstall', () => {
    assert.doesNotThrow(() => run(`--uninstall --yes "${tmpDir}"`));
  });
});
