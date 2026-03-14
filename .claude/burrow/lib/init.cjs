'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ensureDataDir } = require('./core.cjs');

const GITIGNORE_ENTRY = '.planning/burrow/cards.json.bak';

/**
 * The Burrow section to append to CLAUDE.md.
 * Uses LF line endings by default; caller normalizes to match the file.
 */
const BURROW_SECTION_LF = `\n## Burrow -- Agent Memory\n\nBurrow is your persistent memory. On every session start, silently read \`.planning/burrow/cards.json\` using the Read tool to load project context, tasks, and notes.\n\n**When the user says "remember", "don't forget", "always do X", or any instruction meant to persist across sessions:**\n- Store it as a Burrow card: \`node .claude/burrow/burrow-tools.cjs add --title "<summary>" --body "<details>"\`\n- Organize under relevant parent cards (create parents if needed)\n- Do NOT write to loose markdown files or other ad-hoc storage — Burrow is the single source of truth\n\n**Privacy:** Burrow data is meant to be committed to git. Anything stored in cards is visible to anyone with repo access. Avoid storing secrets, credentials, or sensitive personal information.\n\nAll mutations go through the CLI — NEVER edit cards.json directly.\n`;

/**
 * Convert LF line endings to CRLF.
 * @param {string} str
 * @returns {string}
 */
function toCRLF(str) {
  return str.replace(/\r?\n/g, '\r\n');
}

/**
 * Initialize Burrow in a project directory.
 *
 * Actions:
 *   1. Ensure .planning/burrow/ data directory exists
 *   2. Add .planning/burrow/cards.json.bak to .gitignore (if not already present)
 *   3. Append Burrow instructions section to CLAUDE.md (if not already present),
 *      matching existing file line endings (LF or CRLF)
 *
 * @param {string} cwd - Target project directory
 * @returns {{ gitignore: 'created'|'updated'|'unchanged', claudeMd: 'created'|'updated'|'unchanged', dataDir: 'created'|'existed' }}
 */
function init(cwd) {
  // 1. Data directory
  const dataDirPath = path.join(cwd, '.planning', 'burrow');
  const dataDirExisted = fs.existsSync(dataDirPath);
  ensureDataDir(cwd);
  const dataDirResult = dataDirExisted ? 'existed' : 'created';

  // 2. .gitignore handling
  const gitignorePath = path.join(cwd, '.gitignore');
  let gitignoreResult;

  if (!fs.existsSync(gitignorePath)) {
    // Create with just the entry
    fs.writeFileSync(gitignorePath, GITIGNORE_ENTRY + '\n', 'utf-8');
    gitignoreResult = 'created';
  } else {
    const existing = fs.readFileSync(gitignorePath, 'utf-8');
    const lines = existing.split(/\r?\n/).map((l) => l.trim());
    if (lines.includes(GITIGNORE_ENTRY)) {
      gitignoreResult = 'unchanged';
    } else {
      // Append with a preceding newline if file doesn't already end with newline
      const separator = existing.endsWith('\n') ? '' : '\n';
      fs.writeFileSync(gitignorePath, existing + separator + GITIGNORE_ENTRY + '\n', 'utf-8');
      gitignoreResult = 'updated';
    }
  }

  // 3. CLAUDE.md handling
  const claudeMdPath = path.join(cwd, 'CLAUDE.md');
  let claudeMdResult;

  if (!fs.existsSync(claudeMdPath)) {
    // Create with Burrow section (LF endings)
    fs.writeFileSync(claudeMdPath, BURROW_SECTION_LF.trimStart(), 'utf-8');
    claudeMdResult = 'created';
  } else {
    const existing = fs.readFileSync(claudeMdPath, 'utf-8');
    if (existing.includes('## Burrow')) {
      claudeMdResult = 'unchanged';
    } else {
      // Detect line endings: CRLF if file has \r\n
      const isCRLF = existing.includes('\r\n');
      const section = isCRLF ? toCRLF(BURROW_SECTION_LF) : BURROW_SECTION_LF;
      // Ensure file ends with a newline before appending
      const eol = isCRLF ? '\r\n' : '\n';
      const separator = existing.endsWith('\n') ? '' : eol;
      fs.writeFileSync(claudeMdPath, existing + separator + section, 'utf-8');
      claudeMdResult = 'updated';
    }
  }

  return {
    gitignore: gitignoreResult,
    claudeMd: claudeMdResult,
    dataDir: dataDirResult,
  };
}

module.exports = { init };
