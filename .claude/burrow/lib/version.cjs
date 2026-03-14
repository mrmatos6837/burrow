'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Cache file path relative to targetDir
const UPDATE_CACHE_FILE = '.planning/burrow/.update-check';

// 24 hours in milliseconds
const CACHE_TTL_MS = 86400000;

/**
 * Read the VERSION file from sourceDir/.claude/burrow/VERSION.
 * @param {string} sourceDir - Root of the burrow source repo
 * @returns {string|null} Trimmed version string or null on missing/error
 */
function getSourceVersion(sourceDir) {
  try {
    const versionPath = path.join(sourceDir, '.claude', 'burrow', 'VERSION');
    return fs.readFileSync(versionPath, 'utf-8').trim();
  } catch (_) {
    return null;
  }
}

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
 * Check if an update is available by comparing source vs installed version.
 *
 * Uses a 24h cache stored at targetDir/.planning/burrow/.update-check to avoid
 * spamming the filesystem on every CLI invocation.
 *
 * Returns null if the cache is fresh (no check needed).
 * Returns { outdated: boolean, sourceVersion: string|null, installedVersion: string|null }
 *   after performing a check (and writing the new cache).
 *
 * Wrapped in try/catch: update checks must NEVER crash the CLI.
 *
 * @param {string} sourceDir - Root of the burrow source repo
 * @param {string} targetDir - Root of the target (installed) project
 * @returns {{ outdated: boolean, sourceVersion: string|null, installedVersion: string|null }|null}
 */
function checkForUpdate(sourceDir, targetDir) {
  try {
    const cachePath = path.join(targetDir, UPDATE_CACHE_FILE);

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

    // Perform comparison
    const sourceVersion = getSourceVersion(sourceDir);
    const installedVersion = getInstalledVersion(targetDir);
    const outdated = compareSemver(installedVersion, sourceVersion) < 0;

    // Write cache
    try {
      const cacheDir = path.dirname(cachePath);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      fs.writeFileSync(
        cachePath,
        JSON.stringify({ lastCheck: new Date().toISOString(), sourceVersion, installedVersion })
      );
    } catch (_) {
      // Cache write failure is non-fatal
    }

    return { outdated, sourceVersion, installedVersion };
  } catch (_) {
    return null;
  }
}

module.exports = {
  getSourceVersion,
  getInstalledVersion,
  compareSemver,
  checkForUpdate,
  UPDATE_CACHE_FILE,
};
