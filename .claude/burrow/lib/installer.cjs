'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { atomicWriteFile } = require('./core.cjs');
const { SLASH_COMMANDS, generateSlashCommand, generateHelpCommand } = require('./commands.cjs');

// ── Sentinel markers ──────────────────────────────────────────────────────────

const SENTINEL_START = '<!-- burrow:start -->';
const SENTINEL_END = '<!-- burrow:end -->';

// ── generateSnippet(config) ───────────────────────────────────────────────────

/**
 * Build a mode-specific CLAUDE.md sentinel block based on user config.
 * Replaces the former hardcoded snippet constant.
 *
 * @param {object} config - Config object with loadMode, triggerPreset, triggerWords
 * @returns {string} Snippet content (without sentinel markers)
 */
function generateSnippet(config) {
  const { loadMode, triggerPreset, triggerWords } = config;
  const CLI = 'node .claude/burrow/burrow-tools.cjs';
  const parts = [];

  // ── NOTE: This snippet is agent-facing (loaded into context on every ───
  // ── session). Keep it concise — every token counts. Users looking for ──
  // ── usage docs should run /burrow:help. ────────────────────────────────

  // ── INTRO (constant) ──────────────────────────────────────────────────────
  parts.push(`<!-- Agent instructions for Burrow. User docs: /burrow:help or https://www.npmjs.com/package/create-burrow -->`);
  parts.push(`## Burrow — Agent Memory`);
  parts.push(``);
  parts.push(`Persistent card storage across sessions. All operations use the CLI (\`burrow\` below = \`${CLI}\`).`);

  // ── SESSION START (driven by loadMode) ────────────────────────────────────
  parts.push(``);
  if (loadMode === 'none') {
    parts.push(`**Session start:** Do not load cards automatically. Run \`burrow load\` when card context is needed — it returns cards and a list of all available commands.`);
  } else {
    parts.push(`**Session start:** Silently run \`burrow load\`. It returns a JSON envelope with card data, mode (full or index), and a list of all available commands. In index mode, fetch bodies on demand with \`burrow read <id> --full\`.`);
  }

  // ── AUTO-SAVE (driven by triggerPreset) ───────────────────────────────────
  const words = Array.isArray(triggerWords) ? triggerWords : [];
  if (triggerPreset !== 'none' && words.length > 0) {
    const quotedWords = words.map(w => `"${w}"`).join(', ');
    parts.push(``);
    parts.push(`**Auto-save:** When the user says ${quotedWords}, or similar intent to persist information — run \`burrow add --title "<summary>" --body "<details>"\` and organize under relevant parents.`);
  }

  // ── RULES (constant) ──────────────────────────────────────────────────────
  parts.push(``);
  parts.push(`**Rules:** Data is committed to git — no secrets or credentials. Never edit cards.json directly; all mutations go through the CLI.`);
  parts.push(``);

  return parts.join('\n');
}

// ── Core file paths (relative to target) ─────────────────────────────────────

/**
 * Core paths used for detection.
 * Note: .claude/commands/burrow is a directory (no extension).
 */
const CORE_PATHS = [
  '.claude/burrow/burrow-tools.cjs',
  '.claude/commands/burrow.md',
  '.claude/commands/burrow',
  '.planning/burrow/cards.json',
];

// ── Internal helpers ──────────────────────────────────────────────────────────

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyDirSync(src, dest) {
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Detect the line ending convention of existing content.
 * Returns '\r\n' if CRLF is predominant, '\n' otherwise.
 */
function detectLineEnding(content) {
  const crlfCount = (content.match(/\r\n/g) || []).length;
  const lfCount = (content.match(/(?<!\r)\n/g) || []).length;
  return crlfCount > lfCount ? '\r\n' : '\n';
}

/**
 * Convert a snippet to use the target line ending.
 */
function normaliseLineEndings(text, eol) {
  // Normalise to LF first, then convert
  const lf = text.replace(/\r\n/g, '\n');
  if (eol === '\r\n') {
    return lf.replace(/\n/g, '\r\n');
  }
  return lf;
}

/**
 * Ensure .gitignore at targetDir contains the given entry.
 * Returns 'created' | 'updated' | 'unchanged'.
 */
function ensureGitignoreEntry(targetDir, entry) {
  const gitignorePath = path.join(targetDir, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, `${entry}\n`);
    return 'created';
  }
  const content = fs.readFileSync(gitignorePath, 'utf-8');
  if (content.includes(entry)) return 'unchanged';
  const trimmed = content.replace(/\n$/, '');
  fs.writeFileSync(gitignorePath, `${trimmed}\n${entry}\n`);
  return 'updated';
}

// ── detect() ─────────────────────────────────────────────────────────────────

/**
 * Scan targetDir and determine installer mode.
 *
 * Returns:
 *   { mode: 'fresh', hasSentinel, hasLegacyClaude }
 *   { mode: 'upgrade', version: string|null, hasSentinel, hasLegacyClaude }
 *   { mode: 'repair', missing: string[], hasSentinel, hasLegacyClaude }
 */
function detect(targetDir) {
  const present = [];
  const missing = [];

  for (const rel of CORE_PATHS) {
    const full = path.join(targetDir, rel);
    if (fs.existsSync(full)) {
      present.push(rel);
    } else {
      missing.push(rel);
    }
  }

  // CLAUDE.md sentinel/legacy detection
  const claudeMdPath = path.join(targetDir, 'CLAUDE.md');
  let hasSentinel = false;
  let hasLegacyClaude = false;

  if (fs.existsSync(claudeMdPath)) {
    const content = fs.readFileSync(claudeMdPath, 'utf-8');
    hasSentinel = content.includes(SENTINEL_START);
    // Legacy = has "## Burrow" heading but no sentinel markers
    hasLegacyClaude = !hasSentinel && content.includes('## Burrow');
  }

  if (present.length === 0) {
    return { mode: 'fresh', hasSentinel, hasLegacyClaude };
  }

  if (missing.length === 0) {
    // Read version from burrow-tools.cjs or package.json if available
    let version = null;
    const versionFile = path.join(targetDir, '.claude', 'burrow', 'VERSION');
    const pkgFile = path.join(targetDir, '.claude', 'burrow', 'package.json');
    if (fs.existsSync(versionFile)) {
      version = fs.readFileSync(versionFile, 'utf-8').trim();
    } else if (fs.existsSync(pkgFile)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf-8'));
        version = pkg.version || null;
      } catch (_) {
        // ignore
      }
    }
    return { mode: 'upgrade', version, hasSentinel, hasLegacyClaude };
  }

  return { mode: 'repair', missing, hasSentinel, hasLegacyClaude };
}

// ── writeSentinelBlock() ──────────────────────────────────────────────────────

/**
 * Insert or replace a sentinel-wrapped block in claudeMdPath.
 * Creates the file if it does not exist.
 * Preserves all content outside sentinel markers.
 *
 * @param {string} claudeMdPath  - Absolute path to CLAUDE.md
 * @param {string} blockContent  - Content to wrap with sentinel markers
 */
function writeSentinelBlock(claudeMdPath, blockContent) {
  let existingContent = '';
  let eol = '\n';

  if (fs.existsSync(claudeMdPath)) {
    existingContent = fs.readFileSync(claudeMdPath, 'utf-8');
    eol = detectLineEnding(existingContent);
  }

  // Normalise block content to use file's line ending
  const block = normaliseLineEndings(blockContent, eol);
  const sentinelStart = SENTINEL_START;
  const sentinelEnd = SENTINEL_END;

  const newBlock = `${sentinelStart}${eol}${block}${sentinelEnd}`;

  if (existingContent.includes(sentinelStart)) {
    // Replace existing sentinel block (content between start and end markers)
    const startIdx = existingContent.indexOf(sentinelStart);
    const endIdx = existingContent.indexOf(sentinelEnd, startIdx);
    if (endIdx !== -1) {
      const before = existingContent.slice(0, startIdx);
      const after = existingContent.slice(endIdx + sentinelEnd.length);
      atomicWriteFile(claudeMdPath, `${before}${newBlock}${after}`);
    } else {
      // Malformed: start without end — replace from start to EOF
      const before = existingContent.slice(0, startIdx);
      atomicWriteFile(claudeMdPath, `${before}${newBlock}`);
    }
  } else {
    // Append to end
    const trimmed = existingContent.trimEnd();
    const separator = trimmed.length > 0 ? `${eol}${eol}` : '';
    atomicWriteFile(claudeMdPath, `${trimmed}${separator}${newBlock}${eol}`);
  }
}

// ── removeSentinelBlock() ─────────────────────────────────────────────────────

/**
 * Remove the sentinel-wrapped block from claudeMdPath.
 * No-op if file does not exist or no sentinels found.
 *
 * @param {string} claudeMdPath - Absolute path to CLAUDE.md
 */
function removeSentinelBlock(claudeMdPath) {
  if (!fs.existsSync(claudeMdPath)) return;

  const content = fs.readFileSync(claudeMdPath, 'utf-8');
  if (!content.includes(SENTINEL_START)) return;

  const startIdx = content.indexOf(SENTINEL_START);
  const endIdx = content.indexOf(SENTINEL_END, startIdx);

  if (endIdx === -1) {
    // Malformed — remove from start marker to end of file
    const before = content.slice(0, startIdx).trimEnd();
    atomicWriteFile(claudeMdPath, before.length > 0 ? `${before}\n` : '');
    return;
  }

  const before = content.slice(0, startIdx);
  const after = content.slice(endIdx + SENTINEL_END.length);

  // Collapse any double blank lines left over from removal
  const joined = `${before}${after}`;
  // Trim leading/trailing blank lines that were separators
  const result = joined.replace(/\n{3,}/g, '\n\n').trimEnd();
  atomicWriteFile(claudeMdPath, result.length > 0 ? `${result}\n` : '');
}

// ── performInstall() ──────────────────────────────────────────────────────────

/**
 * Perform a fresh install: copy all source files, create data dir, add .gitignore entry.
 *
 * @param {string} sourceDir  - Path to burrow repo root (where .claude/burrow exists)
 * @param {string} targetDir  - Path to target project root
 * @param {object} [opts]     - Optional flags (reserved for future use)
 * @returns {object}          - Results map: { burrowDir, commandFile, commandDir, cardsJson, gitignore }
 */
function performInstall(sourceDir, targetDir, opts = {}) {
  const results = {};

  // 1. Copy .claude/burrow/
  const srcBurrow = path.join(sourceDir, '.claude', 'burrow');
  const destBurrow = path.join(targetDir, '.claude', 'burrow');
  copyDirSync(srcBurrow, destBurrow);
  results.burrowDir = 'copied';

  // 2. Copy .claude/commands/burrow.md (the main /burrow entry point)
  ensureDir(path.join(targetDir, '.claude', 'commands'));
  const srcCommandFile = path.join(sourceDir, '.claude', 'commands', 'burrow.md');
  const destCommandFile = path.join(targetDir, '.claude', 'commands', 'burrow.md');
  fs.copyFileSync(srcCommandFile, destCommandFile);
  results.commandFile = 'copied';

  // 3. Generate .claude/commands/burrow/*.md from command registry
  const slashCount = generateSlashCommands(targetDir);
  results.commandDir = `generated (${slashCount} commands)`;

  // 4. Create .planning/burrow/ and empty cards.json
  const dataDir = path.join(targetDir, '.planning', 'burrow');
  ensureDir(dataDir);
  const cardsPath = path.join(dataDir, 'cards.json');
  if (!fs.existsSync(cardsPath)) {
    fs.writeFileSync(cardsPath, JSON.stringify({ version: 2, cards: [] }) + '\n');
    results.cardsJson = 'created';
  } else {
    results.cardsJson = 'preserved';
  }

  // 5. .gitignore entry
  results.gitignore = ensureGitignoreEntry(targetDir, '.planning/burrow/cards.json.bak');

  return results;
}

// ── performUpgrade() ──────────────────────────────────────────────────────────

/**
 * Perform an upgrade: unconditionally replace source files, preserve cards.json.
 *
 * @param {string} sourceDir  - Path to burrow repo root
 * @param {string} targetDir  - Path to target project root
 * @param {object} [opts]     - Optional flags (reserved for future use)
 * @returns {object}          - Results map
 */
function performUpgrade(sourceDir, targetDir, opts = {}) {
  const results = {};

  // 1. Replace .claude/burrow/ (unconditional)
  const srcBurrow = path.join(sourceDir, '.claude', 'burrow');
  const destBurrow = path.join(targetDir, '.claude', 'burrow');
  copyDirSync(srcBurrow, destBurrow);
  results.burrowDir = 'replaced';

  // 2. Replace .claude/commands/burrow.md
  ensureDir(path.join(targetDir, '.claude', 'commands'));
  const srcCommandFile = path.join(sourceDir, '.claude', 'commands', 'burrow.md');
  const destCommandFile = path.join(targetDir, '.claude', 'commands', 'burrow.md');
  fs.copyFileSync(srcCommandFile, destCommandFile);
  results.commandFile = 'replaced';

  // 3. Regenerate .claude/commands/burrow/*.md from command registry
  const slashCount = generateSlashCommands(targetDir);
  results.commandDir = `generated (${slashCount} commands)`;

  // 4. cards.json is NEVER touched on upgrade
  results.cardsJson = 'preserved';

  // 5. .gitignore entry (idempotent)
  results.gitignore = ensureGitignoreEntry(targetDir, '.planning/burrow/cards.json.bak');

  return results;
}

// ── performRepair() ───────────────────────────────────────────────────────────

/**
 * Perform a repair: copy only the files listed in `missingFiles`.
 * Does not touch any files that already exist at target.
 *
 * @param {string}   sourceDir    - Path to burrow repo root
 * @param {string}   targetDir    - Path to target project root
 * @param {string[]} missingFiles - Relative paths (from detect().missing)
 * @returns {object}              - Results map: { [rel]: 'copied' }
 */
function performRepair(sourceDir, targetDir, missingFiles) {
  const results = {};

  for (const rel of missingFiles) {
    const srcFull = path.join(sourceDir, rel);
    const destFull = path.join(targetDir, rel);

    if (!fs.existsSync(srcFull)) {
      results[rel] = 'source-missing';
      continue;
    }

    const stat = fs.statSync(srcFull);
    if (stat.isDirectory()) {
      copyDirSync(srcFull, destFull);
      results[rel] = 'copied-dir';
    } else {
      ensureDir(path.dirname(destFull));
      fs.copyFileSync(srcFull, destFull);
      results[rel] = 'copied';
    }
  }

  // Handle cards.json specially: if missing, create empty one
  const cardsRel = '.planning/burrow/cards.json';
  if (missingFiles.includes(cardsRel)) {
    const cardsPath = path.join(targetDir, cardsRel);
    if (!fs.existsSync(cardsPath)) {
      ensureDir(path.dirname(cardsPath));
      fs.writeFileSync(cardsPath, JSON.stringify({ version: 2, cards: [] }) + '\n');
      results[cardsRel] = 'created';
    }
  }

  return results;
}

// ── generateSlashCommands() ──────────────────────────────────────────────────

/**
 * Generate all .claude/commands/burrow/*.md files from the command registry.
 * Writes to targetDir/.claude/commands/burrow/.
 *
 * @param {string} targetDir - Target project root
 * @returns {number} Number of files written
 */
function generateSlashCommands(targetDir) {
  const commandDir = path.join(targetDir, '.claude', 'commands', 'burrow');
  ensureDir(commandDir);

  let count = 0;
  for (const cmd of SLASH_COMMANDS) {
    let content;
    if (cmd.custom) {
      content = generateHelpCommand();
    } else {
      content = generateSlashCommand(cmd);
    }
    if (content) {
      fs.writeFileSync(path.join(commandDir, `${cmd.name}.md`), content);
      count++;
    }
  }
  return count;
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  SENTINEL_START,
  SENTINEL_END,
  generateSnippet,
  generateSlashCommands,
  detect,
  performInstall,
  performUpgrade,
  performRepair,
  writeSentinelBlock,
  removeSentinelBlock,
};
