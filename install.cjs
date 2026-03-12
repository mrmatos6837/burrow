#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

// ── Paths ──────────────────────────────────────────────────────────
const BURROW_SOURCE = path.join(__dirname, '.claude', 'burrow');
const COMMANDS_DIR = path.join(__dirname, '.claude', 'commands');
const COMMAND_FILE = path.join(COMMANDS_DIR, 'burrow.md');
const COMMAND_DIR = path.join(COMMANDS_DIR, 'burrow');

// ── CLAUDE.md snippet ──────────────────────────────────────────────
const CLAUDE_MD_SNIPPET = `
## Burrow — Agent Memory

Burrow is your persistent memory. On every session start, silently read \`.planning/burrow/cards.json\` using the Read tool to load project context, tasks, and notes.

**When the user says "remember", "don't forget", "always do X", or any instruction meant to persist across sessions:**
- Store it as a Burrow card: \`node .claude/burrow/burrow-tools.cjs add --title "<summary>" --body "<details>"\`
- Organize under relevant parent cards (create parents if needed)
- Do NOT write to loose markdown files or other ad-hoc storage — Burrow is the single source of truth

**Root card body = project context.** If a root-level card has a body, read it for project description, conventions, or priorities.

**Privacy:** Burrow data is meant to be committed to git. Anything stored in cards is visible to anyone with repo access. Avoid storing secrets, credentials, or sensitive personal information.

All mutations go through the CLI — NEVER edit cards.json directly.
`.trimStart();

// ── Helpers ────────────────────────────────────────────────────────
function ok(msg) { console.log(`  \u2713 ${msg}`); }
function skip(msg) { console.log(`  \u00b7 ${msg} (already done)`); }
function fail(msg) { console.error(`  \u2717 ${msg}`); process.exit(1); }

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

// ── Install ───────────────────────────────────────────────────────

function install(projectDir) {
  console.log('\n── Burrow Install ──\n');

  // Verify we're running from the burrow repo
  if (!fs.existsSync(path.join(BURROW_SOURCE, 'burrow-tools.cjs'))) {
    fail('Cannot find burrow-tools.cjs. Run this from the burrow repo.');
  }

  const targetBurrow = path.join(projectDir, '.claude', 'burrow');
  const targetCommandFile = path.join(projectDir, '.claude', 'commands', 'burrow.md');
  const targetCommandDir = path.join(projectDir, '.claude', 'commands', 'burrow');

  // Step 1: Copy source
  if (fs.existsSync(path.join(targetBurrow, 'burrow-tools.cjs'))) {
    skip('.claude/burrow');
  } else {
    copyDirSync(BURROW_SOURCE, targetBurrow);
    ok('Copied .claude/burrow');
  }

  // Step 2: Copy commands
  ensureDir(path.join(projectDir, '.claude', 'commands'));

  if (fs.existsSync(targetCommandFile)) {
    skip('.claude/commands/burrow.md');
  } else {
    fs.copyFileSync(COMMAND_FILE, targetCommandFile);
    ok('Copied .claude/commands/burrow.md');
  }

  if (fs.existsSync(targetCommandDir)) {
    skip('.claude/commands/burrow/');
  } else {
    copyDirSync(COMMAND_DIR, targetCommandDir);
    ok('Copied .claude/commands/burrow/');
  }

  // Step 3: Create data file
  const dataDir = path.join(projectDir, '.planning', 'burrow');
  const dataFile = path.join(dataDir, 'cards.json');
  ensureDir(dataDir);
  if (fs.existsSync(dataFile)) {
    skip('cards.json');
  } else {
    fs.writeFileSync(dataFile, JSON.stringify({ version: 2, cards: [] }) + '\n');
    ok('Created .planning/burrow/cards.json');
  }

  // Step 4: CLAUDE.md
  const claudeMd = path.join(projectDir, 'CLAUDE.md');
  if (fs.existsSync(claudeMd)) {
    const content = fs.readFileSync(claudeMd, 'utf-8');
    if (content.includes('Burrow \u2014 Agent Memory')) {
      skip('CLAUDE.md already has Burrow section');
    } else {
      fs.writeFileSync(claudeMd, content.trimEnd() + '\n\n' + CLAUDE_MD_SNIPPET);
      ok('Appended Burrow section to CLAUDE.md');
    }
  } else {
    fs.writeFileSync(claudeMd, CLAUDE_MD_SNIPPET);
    ok('Created CLAUDE.md with Burrow section');
  }

  console.log('\n  Done. Say /burrow to get started.\n');
}

// ── CLI ────────────────────────────────────────────────────────────

const target = process.argv[2];
if (!target) {
  fail('Usage: node .claude/burrow/bin/init.cjs <target-project-path>');
}

install(path.resolve(target));
