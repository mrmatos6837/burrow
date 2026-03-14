'use strict';

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  getSourceVersion,
  getInstalledVersion,
  compareSemver,
  checkForUpdate,
  UPDATE_CACHE_FILE,
} = require('../.claude/burrow/lib/version.cjs');

// ── Helpers ───────────────────────────────────────────────────────────────────

function createTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'burrow-version-test-'));
}

function removeTmpDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

/**
 * Seed a VERSION file at sourceDir/.claude/burrow/VERSION
 */
function seedSourceVersion(dir, version) {
  const vDir = path.join(dir, '.claude', 'burrow');
  fs.mkdirSync(vDir, { recursive: true });
  fs.writeFileSync(path.join(vDir, 'VERSION'), version + '\n');
}

/**
 * Seed a VERSION file at targetDir/.claude/burrow/VERSION
 */
function seedInstalledVersion(dir, version) {
  const vDir = path.join(dir, '.claude', 'burrow');
  fs.mkdirSync(vDir, { recursive: true });
  fs.writeFileSync(path.join(vDir, 'VERSION'), version + '\n');
}

// ── getSourceVersion ──────────────────────────────────────────────────────────

describe('getSourceVersion', () => {
  let tmp;
  beforeEach(() => { tmp = createTmpDir(); });
  afterEach(() => { removeTmpDir(tmp); });

  it('reads version from source VERSION file', () => {
    seedSourceVersion(tmp, '1.2.0');
    const v = getSourceVersion(tmp);
    assert.equal(v, '1.2.0');
  });

  it('returns null when VERSION file is missing', () => {
    const v = getSourceVersion(tmp);
    assert.equal(v, null);
  });

  it('trims whitespace from version string', () => {
    const vDir = path.join(tmp, '.claude', 'burrow');
    fs.mkdirSync(vDir, { recursive: true });
    fs.writeFileSync(path.join(vDir, 'VERSION'), '  1.3.0  \n');
    const v = getSourceVersion(tmp);
    assert.equal(v, '1.3.0');
  });
});

// ── getInstalledVersion ───────────────────────────────────────────────────────

describe('getInstalledVersion', () => {
  let tmp;
  beforeEach(() => { tmp = createTmpDir(); });
  afterEach(() => { removeTmpDir(tmp); });

  it('reads version from installed VERSION file', () => {
    seedInstalledVersion(tmp, '1.1.0');
    const v = getInstalledVersion(tmp);
    assert.equal(v, '1.1.0');
  });

  it('returns null when VERSION file is missing', () => {
    const v = getInstalledVersion(tmp);
    assert.equal(v, null);
  });
});

// ── compareSemver ─────────────────────────────────────────────────────────────

describe('compareSemver', () => {
  it('returns 0 when versions are equal', () => {
    assert.equal(compareSemver('1.2.0', '1.2.0'), 0);
  });

  it('returns -1 when a < b (minor)', () => {
    assert.equal(compareSemver('1.1.0', '1.2.0'), -1);
  });

  it('returns 1 when a > b (minor)', () => {
    assert.equal(compareSemver('1.3.0', '1.2.0'), 1);
  });

  it('returns -1 when a < b (patch)', () => {
    assert.equal(compareSemver('1.2.0', '1.2.1'), -1);
  });

  it('returns 1 when a > b (major)', () => {
    assert.equal(compareSemver('2.0.0', '1.9.9'), 1);
  });

  it('null is always behind any real version', () => {
    assert.equal(compareSemver(null, '1.0.0'), -1);
  });

  it('null vs null returns 0', () => {
    assert.equal(compareSemver(null, null), 0);
  });

  it('real version vs null returns 1', () => {
    assert.equal(compareSemver('1.0.0', null), 1);
  });
});

// ── checkForUpdate ────────────────────────────────────────────────────────────

describe('checkForUpdate', () => {
  let srcDir;
  let tgtDir;

  beforeEach(() => {
    srcDir = createTmpDir();
    tgtDir = createTmpDir();
  });

  afterEach(() => {
    removeTmpDir(srcDir);
    removeTmpDir(tgtDir);
  });

  it('returns { outdated: true } when installed < source', () => {
    seedSourceVersion(srcDir, '1.2.0');
    seedInstalledVersion(tgtDir, '1.1.0');
    const result = checkForUpdate(srcDir, tgtDir);
    assert.ok(result, 'should return a result object');
    assert.equal(result.outdated, true);
    assert.equal(result.sourceVersion, '1.2.0');
    assert.equal(result.installedVersion, '1.1.0');
  });

  it('returns { outdated: false } when installed == source', () => {
    seedSourceVersion(srcDir, '1.2.0');
    seedInstalledVersion(tgtDir, '1.2.0');
    const result = checkForUpdate(srcDir, tgtDir);
    assert.ok(result);
    assert.equal(result.outdated, false);
  });

  it('returns { outdated: false } when installed > source', () => {
    seedSourceVersion(srcDir, '1.1.0');
    seedInstalledVersion(tgtDir, '1.2.0');
    const result = checkForUpdate(srcDir, tgtDir);
    assert.ok(result);
    assert.equal(result.outdated, false);
  });

  it('writes cache file after checking', () => {
    seedSourceVersion(srcDir, '1.2.0');
    seedInstalledVersion(tgtDir, '1.1.0');
    checkForUpdate(srcDir, tgtDir);
    const cachePath = path.join(tgtDir, UPDATE_CACHE_FILE);
    assert.ok(fs.existsSync(cachePath), 'cache file should be written');
    const cache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    assert.ok(cache.lastCheck, 'cache should have lastCheck');
    assert.equal(cache.sourceVersion, '1.2.0');
    assert.equal(cache.installedVersion, '1.1.0');
  });

  it('returns null when cache is fresh (< 24h)', () => {
    seedSourceVersion(srcDir, '1.2.0');
    seedInstalledVersion(tgtDir, '1.1.0');
    // Seed a fresh cache
    const cachePath = path.join(tgtDir, UPDATE_CACHE_FILE);
    const cacheDir = path.dirname(cachePath);
    fs.mkdirSync(cacheDir, { recursive: true });
    const recentTimestamp = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
    fs.writeFileSync(cachePath, JSON.stringify({
      lastCheck: recentTimestamp,
      sourceVersion: '1.2.0',
      installedVersion: '1.1.0',
    }));
    const result = checkForUpdate(srcDir, tgtDir);
    assert.equal(result, null, 'should return null for fresh cache');
  });

  it('performs check when cache is stale (> 24h)', () => {
    seedSourceVersion(srcDir, '1.2.0');
    seedInstalledVersion(tgtDir, '1.1.0');
    // Seed a stale cache (25 hours ago)
    const cachePath = path.join(tgtDir, UPDATE_CACHE_FILE);
    const cacheDir = path.dirname(cachePath);
    fs.mkdirSync(cacheDir, { recursive: true });
    const staleTimestamp = new Date(Date.now() - 90000000).toISOString(); // 25 hours ago
    fs.writeFileSync(cachePath, JSON.stringify({
      lastCheck: staleTimestamp,
      sourceVersion: '1.0.0',
      installedVersion: '0.9.0',
    }));
    const result = checkForUpdate(srcDir, tgtDir);
    assert.ok(result, 'should return result when cache is stale');
    assert.equal(result.outdated, true);
  });

  it('returns { outdated: true } when installed VERSION missing', () => {
    seedSourceVersion(srcDir, '1.2.0');
    // No installed version
    const result = checkForUpdate(srcDir, tgtDir);
    assert.ok(result);
    assert.equal(result.outdated, true);
    assert.equal(result.installedVersion, null);
  });
});
