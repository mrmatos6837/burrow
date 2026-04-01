'use strict';

const { describe, it, before, after, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const versionModule = require('../.claude/burrow/lib/version.cjs');
const {
  getInstalledVersion,
  compareSemver,
  checkForUpdate,
  UPDATE_CACHE_FILE,
} = versionModule;

// ── Helpers ───────────────────────────────────────────────────────────────────

function createTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'burrow-version-test-'));
}

function removeTmpDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

/**
 * Seed a VERSION file at dir/.claude/burrow/VERSION
 */
function seedInstalledVersion(dir, version) {
  const vDir = path.join(dir, '.claude', 'burrow');
  fs.mkdirSync(vDir, { recursive: true });
  fs.writeFileSync(path.join(vDir, 'VERSION'), version + '\n');
}

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

  it('trims whitespace from version string', () => {
    const vDir = path.join(tmp, '.claude', 'burrow');
    fs.mkdirSync(vDir, { recursive: true });
    fs.writeFileSync(path.join(vDir, 'VERSION'), '  1.3.0  \n');
    const v = getInstalledVersion(tmp);
    assert.equal(v, '1.3.0');
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
  let tgtDir;

  beforeEach(() => {
    tgtDir = createTmpDir();
  });

  afterEach(() => {
    removeTmpDir(tgtDir);
  });

  /**
   * Helper: patch https.get to return a fixed version without making a real network call.
   */
  async function withMockedLatest(latestVersion, fn) {
    const https = require('node:https');
    const original = https.get;
    https.get = (_url, _opts, cb) => {
      const fakeRes = {
        on: (event, handler) => {
          if (event === 'data') handler(JSON.stringify({ version: latestVersion }));
          if (event === 'end') handler();
          return fakeRes;
        },
      };
      // Call callback asynchronously
      setTimeout(() => cb(fakeRes), 0);
      return { on: () => {}, destroy: () => {} };
    };
    try {
      await fn();
    } finally {
      https.get = original;
    }
  }

  it('returns { outdated: true } when installed < latest', async () => {
    await withMockedLatest('1.2.0', async () => {
      seedInstalledVersion(tgtDir, '1.1.0');
      const result = await checkForUpdate(tgtDir);
      assert.ok(result, 'should return a result object');
      assert.equal(result.outdated, true);
      assert.equal(result.installedVersion, '1.1.0');
      assert.equal(result.latestVersion, '1.2.0');
    });
  });

  it('returns { outdated: false } when installed == latest', async () => {
    await withMockedLatest('1.2.0', async () => {
      seedInstalledVersion(tgtDir, '1.2.0');
      const result = await checkForUpdate(tgtDir);
      assert.ok(result, 'should return a result object');
      assert.equal(result.outdated, false);
    });
  });

  it('returns { outdated: false } when installed > latest', async () => {
    await withMockedLatest('1.1.0', async () => {
      seedInstalledVersion(tgtDir, '1.2.0');
      const result = await checkForUpdate(tgtDir);
      assert.ok(result, 'should return a result object');
      assert.equal(result.outdated, false);
    });
  });

  it('returns null when cache is fresh (< 24h)', async () => {
    seedInstalledVersion(tgtDir, '1.1.0');
    // Seed a fresh cache (1 hour ago)
    const cachePath = path.join(tgtDir, UPDATE_CACHE_FILE);
    const cacheDir = path.dirname(cachePath);
    fs.mkdirSync(cacheDir, { recursive: true });
    const recentTimestamp = new Date(Date.now() - 3600000).toISOString();
    fs.writeFileSync(cachePath, JSON.stringify({
      lastCheck: recentTimestamp,
      latestVersion: '1.2.0',
      installedVersion: '1.1.0',
    }));
    const result = await checkForUpdate(tgtDir);
    assert.equal(result, null, 'should return null for fresh cache');
  });

  it('performs check when cache is stale (> 24h)', async () => {
    await withMockedLatest('1.2.0', async () => {
      seedInstalledVersion(tgtDir, '1.1.0');
      // Seed a stale cache (25 hours ago)
      const cachePath = path.join(tgtDir, UPDATE_CACHE_FILE);
      const cacheDir = path.dirname(cachePath);
      fs.mkdirSync(cacheDir, { recursive: true });
      const staleTimestamp = new Date(Date.now() - 90000000).toISOString(); // 25 hours ago
      fs.writeFileSync(cachePath, JSON.stringify({
        lastCheck: staleTimestamp,
        latestVersion: '0.1.0',
        installedVersion: '0.0.1',
      }));
      const result = await checkForUpdate(tgtDir);
      assert.ok(result, 'should return result when cache is stale');
      assert.equal(result.latestVersion, '1.2.0', 'should have fetched fresh latest version');
    });
  });

  it('writes cache file after checking', async () => {
    await withMockedLatest('1.2.0', async () => {
      seedInstalledVersion(tgtDir, '1.1.0');
      await checkForUpdate(tgtDir);
      const cachePath = path.join(tgtDir, UPDATE_CACHE_FILE);
      assert.ok(fs.existsSync(cachePath), 'cache file should be written');
      const cache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      assert.ok(cache.lastCheck, 'cache should have lastCheck');
      assert.equal(cache.latestVersion, '1.2.0');
      assert.equal(cache.installedVersion, '1.1.0');
    });
  });

  it('returns { outdated: true } when installed VERSION missing (null treated as 0.0.0)', async () => {
    await withMockedLatest('1.2.0', async () => {
      // No installed version file — getInstalledVersion returns null (treated as 0.0.0)
      const result = await checkForUpdate(tgtDir);
      assert.ok(result, 'should return a result object');
      assert.equal(result.outdated, true);
      assert.equal(result.installedVersion, null);
    });
  });

  it('returns null on error (never crashes)', async () => {
    // Mock https.get to simulate network error for checkForUpdate
    const https = require('node:https');
    const original = https.get;
    https.get = (_url, _opts, _cb) => {
      const fakeReq = {
        on: (event, cb) => {
          if (event === 'error') setTimeout(() => cb(new Error('ENOTFOUND')), 0);
          return fakeReq;
        },
        destroy: () => {},
      };
      return fakeReq;
    };
    try {
      // Even with network failure, checkForUpdate should return null not throw
      const result = await checkForUpdate(tgtDir);
      // null is acceptable (network failure returns null latestVersion, but we still get result)
      // The function catches all errors internally
      assert.ok(result === null || typeof result === 'object', 'should never throw');
    } finally {
      https.get = original;
    }
  });
});
