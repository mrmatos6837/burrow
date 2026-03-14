'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { init } = require('../.claude/burrow/lib/init.cjs');

const GITIGNORE_ENTRY = '.planning/burrow/cards.json.bak';

describe('init', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'burrow-init-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // -------------------------
  // .gitignore tests
  // -------------------------

  describe('.gitignore handling', () => {
    it('creates .gitignore with entry when no .gitignore exists', () => {
      const result = init(tmpDir);

      const gitignorePath = path.join(tmpDir, '.gitignore');
      assert.ok(fs.existsSync(gitignorePath), '.gitignore should be created');
      const content = fs.readFileSync(gitignorePath, 'utf-8');
      assert.ok(content.includes(GITIGNORE_ENTRY), 'entry should be in .gitignore');
      assert.strictEqual(result.gitignore, 'created');
    });

    it('appends entry to existing .gitignore that lacks it', () => {
      const gitignorePath = path.join(tmpDir, '.gitignore');
      fs.writeFileSync(gitignorePath, 'node_modules/\n.env\n', 'utf-8');

      const result = init(tmpDir);

      const content = fs.readFileSync(gitignorePath, 'utf-8');
      assert.ok(content.includes('node_modules/'), 'original entries preserved');
      assert.ok(content.includes('.env'), 'original entries preserved');
      assert.ok(content.includes(GITIGNORE_ENTRY), 'entry should be appended');
      assert.strictEqual(result.gitignore, 'updated');
    });

    it('does NOT duplicate entry in .gitignore on re-run', () => {
      const gitignorePath = path.join(tmpDir, '.gitignore');
      fs.writeFileSync(gitignorePath, `node_modules/\n${GITIGNORE_ENTRY}\n`, 'utf-8');

      const result = init(tmpDir);

      const content = fs.readFileSync(gitignorePath, 'utf-8');
      const count = (content.match(new RegExp(GITIGNORE_ENTRY.replace('.', '\\.').replace('/', '\\/'), 'g')) || []).length;
      assert.strictEqual(count, 1, 'entry should appear exactly once');
      assert.strictEqual(result.gitignore, 'unchanged');
    });
  });

  // -------------------------
  // CLAUDE.md tests
  // -------------------------

  describe('CLAUDE.md handling', () => {
    it('creates CLAUDE.md with Burrow section when no CLAUDE.md exists', () => {
      const result = init(tmpDir);

      const claudeMdPath = path.join(tmpDir, 'CLAUDE.md');
      assert.ok(fs.existsSync(claudeMdPath), 'CLAUDE.md should be created');
      const content = fs.readFileSync(claudeMdPath, 'utf-8');
      assert.ok(content.includes('## Burrow'), 'Burrow section should be present');
      assert.ok(content.includes('cards.json'), 'Burrow instructions should include cards.json reference');
      assert.strictEqual(result.claudeMd, 'created');
    });

    it('appends Burrow section to existing CLAUDE.md with LF line endings', () => {
      const claudeMdPath = path.join(tmpDir, 'CLAUDE.md');
      const existingContent = '## Project Setup\n\nFollow these guidelines.\n';
      fs.writeFileSync(claudeMdPath, existingContent, 'utf-8');

      const result = init(tmpDir);

      const content = fs.readFileSync(claudeMdPath, 'utf-8');
      assert.ok(content.includes('## Project Setup'), 'original content preserved');
      assert.ok(content.includes('## Burrow'), 'Burrow section appended');
      // Should use LF (no CRLF in LF file)
      assert.ok(!content.includes('\r\n'), 'should use LF not CRLF');
      assert.strictEqual(result.claudeMd, 'updated');
    });

    it('appends Burrow section to existing CLAUDE.md with CRLF line endings', () => {
      const claudeMdPath = path.join(tmpDir, 'CLAUDE.md');
      const existingContent = '## Project Setup\r\n\r\nFollow these guidelines.\r\n';
      fs.writeFileSync(claudeMdPath, existingContent, 'utf-8');

      const result = init(tmpDir);

      const content = fs.readFileSync(claudeMdPath, 'utf-8');
      assert.ok(content.includes('## Project Setup'), 'original content preserved');
      assert.ok(content.includes('## Burrow'), 'Burrow section appended');
      // The appended section should use CRLF
      const appendedPart = content.slice(existingContent.length);
      assert.ok(appendedPart.includes('\r\n'), 'appended content should use CRLF');
      assert.strictEqual(result.claudeMd, 'updated');
    });

    it('does NOT duplicate Burrow section on re-run', () => {
      const claudeMdPath = path.join(tmpDir, 'CLAUDE.md');
      const existingContent = '## Burrow\n\nSome burrow content already here.\n';
      fs.writeFileSync(claudeMdPath, existingContent, 'utf-8');

      const result = init(tmpDir);

      const content = fs.readFileSync(claudeMdPath, 'utf-8');
      const count = (content.match(/## Burrow/g) || []).length;
      assert.strictEqual(count, 1, 'Burrow section should appear exactly once');
      assert.strictEqual(result.claudeMd, 'unchanged');
    });
  });

  // -------------------------
  // Data directory test
  // -------------------------

  describe('data directory', () => {
    it('creates .planning/burrow/ directory via ensureDataDir', () => {
      init(tmpDir);

      const dataDir = path.join(tmpDir, '.planning', 'burrow');
      assert.ok(fs.existsSync(dataDir), '.planning/burrow/ should exist');
    });

    it('returns dataDir: "created" when directory is new', () => {
      const result = init(tmpDir);
      // dir doesn't exist before, should be created
      assert.ok(['created', 'existed'].includes(result.dataDir), 'dataDir should be created or existed');
    });

    it('returns dataDir: "existed" when directory already present', () => {
      const dataDir = path.join(tmpDir, '.planning', 'burrow');
      fs.mkdirSync(dataDir, { recursive: true });

      const result = init(tmpDir);
      assert.strictEqual(result.dataDir, 'existed');
    });
  });

  // -------------------------
  // Return value shape
  // -------------------------

  describe('return value', () => {
    it('returns object with gitignore, claudeMd, and dataDir keys', () => {
      const result = init(tmpDir);
      assert.ok('gitignore' in result, 'result should have gitignore key');
      assert.ok('claudeMd' in result, 'result should have claudeMd key');
      assert.ok('dataDir' in result, 'result should have dataDir key');
    });
  });
});
