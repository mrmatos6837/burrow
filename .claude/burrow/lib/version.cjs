'use strict';

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

// Cache file path relative to targetDir
const UPDATE_CACHE_FILE = '.planning/burrow/.update-check';

// 24 hours in milliseconds
const CACHE_TTL_MS = 86400000;

/**
 * Read the VERSION file from targetDir/.claude/burrow/VERSION.
 * @param {string} targetDir - Root of the target (installed) project
 * @returns {string|null} Trimmed version string or null on missing/error
 */
function getInstalledVersion(targetDir) {
  try {
    const versionPath = path.join(targetDir, '.claude', 'burrow', 'VERSION');
    return fs.readFileSync(versionPath, 'utf-8').trim();
  } catch (_) {
    return null;
  }
}

/**
 * Compare two semver strings numerically.
 * null is treated as "0.0.0" (always behind any real version).
 *
 * @param {string|null} a
 * @param {string|null} b
 * @returns {-1|0|1} -1 if a < b, 0 if a == b, 1 if a > b
 */
function compareSemver(a, b) {
  const parse = (v) => (v ? v.split('.').map((n) => parseInt(n, 10) || 0) : [0, 0, 0]);
  const [aMaj, aMin, aPatch] = parse(a);
  const [bMaj, bMin, bPatch] = parse(b);

  if (aMaj !== bMaj) return aMaj < bMaj ? -1 : 1;
  if (aMin !== bMin) return aMin < bMin ? -1 : 1;
  if (aPatch !== bPatch) return aPatch < bPatch ? -1 : 1;
  return 0;
}

/**
 * Fetch the latest version of the create-burrow package from the npm registry.
 * Returns null on network error or parse failure — never throws.
 *
 * @returns {Promise<string|null>}
 */
function fetchLatestVersion() {
  return new Promise((resolve) => {
    const req = https.get('https://registry.npmjs.org/create-burrow/latest', {
      headers: { 'Accept': 'application/json' },
      timeout: 5000,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const pkg = JSON.parse(data);
          resolve(pkg.version || null);
        } catch (_) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

/**
 * Check if an update is available by comparing the installed version against
 * the latest version published on npm.
 *
 * Uses a 24h cache stored at cwd/.planning/burrow/.update-check to avoid
 * hitting the registry on every CLI invocation.
 *
 * Returns null if:
 *   - The cache is fresh (< 24h old)
 *   - Any error occurs (network failure, file I/O, etc.)
 *
 * Returns { outdated: boolean, latestVersion: string|null, installedVersion: string|null }
 *   after performing a fresh check.
 *
 * @param {string} cwd - Root of the target (installed) project
 * @returns {Promise<{ outdated: boolean, latestVersion: string|null, installedVersion: string|null }|null>}
 */
async function checkForUpdate(cwd) {
  try {
    const cachePath = path.join(cwd, UPDATE_CACHE_FILE);

    // Check if cache is fresh
    if (fs.existsSync(cachePath)) {
      try {
        const cache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
        if (cache.lastCheck && Date.now() - Date.parse(cache.lastCheck) < CACHE_TTL_MS) {
          return null; // Cache is still valid — skip check
        }
      } catch (_) {
        // Corrupt cache — proceed with fresh check
      }
    }

    const latestVersion = await fetchLatestVersion();
    const installedVersion = getInstalledVersion(cwd);
    const outdated = compareSemver(installedVersion, latestVersion) < 0;

    // Write cache
    try {
      const cacheDir = path.dirname(cachePath);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      fs.writeFileSync(
        cachePath,
        JSON.stringify({ lastCheck: new Date().toISOString(), latestVersion, installedVersion })
      );
    } catch (_) {
      // Cache write failure is non-fatal
    }

    return { outdated, latestVersion, installedVersion };
  } catch (_) {
    return null;
  }
}

module.exports = {
  getInstalledVersion,
  compareSemver,
  checkForUpdate,
  UPDATE_CACHE_FILE,
};
