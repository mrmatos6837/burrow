#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// ── Paths ──────────────────────────────────────────────────────────
const BURROW_SOURCE = path.resolve(__dirname, '..');
const COMMANDS_SOURCE = path.resolve(__dirname, '..', '..', 'commands', 'burrow');
const GLOBAL_CLAUDE = path.join(os.homedir(), '.claude');
const GLOBAL_BURROW = path.join(GLOBAL_CLAUDE, 'burrow');
const GLOBAL_COMMANDS = path.join(GLOBAL_CLAUDE, 'commands', 'burrow');

// ── CLAUDE.md snippet ──────────────────────────────────────────────
const CLAUDE_MD_SNIPPET = `
## Burrow — Agent Memory

Burrow is your persistent memory. On every session start, silently read \`.planning/burrow/cards.json\` using the Read tool to load project context, tasks, and notes.

**When the user says "remember", "don't forget", "always do X", or any instruction meant to persist across sessions:**
- Store it as a Burrow card: \`node .claude/burrow/burrow-tools.cjs add --title "<summary>" --body "<details>"\`
- Organize under relevant parent cards (create parents if needed)
- Do NOT write to loose markdown files or other ad-hoc storage — Burrow is the single source of truth

**Root card body = project context.** If a root-level card has a body, read it for project description, conventions, or priorities.

**Safeguards:**
- NEVER run remove, archive, move, or edit without explicit user consent
- Read-only operations (read, dump) are always safe
- All mutations go through the CLI: \`node .claude/burrow/burrow-tools.cjs <command>\`
- NEVER edit cards.json directly
`.trimStart();

// ── Helpers ────────────────────────────────────────────────────────
function ok(msg) { console.log(`  \u2713 ${msg}`); }
function skip(msg) { console.log(`  \u00b7 ${msg} (already done)`); }
function fail(msg) { console.error(`  \u2717 ${msg}`); process.exit(1); }

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function ensureSymlink(target, linkPath, label) {
  if (fs.existsSync(linkPath)) {
    try {
      const existing = fs.readlinkSync(linkPath);
      if (existing === target) { skip(label); return; }
      fs.unlinkSync(linkPath);
    } catch {
      // exists but not a symlink — don't clobber
      skip(label);
      return;
    }
  }
  fs.symlinkSync(target, linkPath, 'dir');
  ok(`${label} → ${target}`);
}

// ── Single command: init ───────────────────────────────────────────

function init(projectDir) {
  console.log('\n── Burrow Init ──\n');

  // Verify source repo
  if (!fs.existsSync(path.join(BURROW_SOURCE, 'burrow-tools.cjs'))) {
    fail('Cannot find burrow-tools.cjs. Run this from the burrow repo.');
  }
  if (!fs.existsSync(COMMANDS_SOURCE)) {
    fail('Cannot find commands/burrow/. Run this from the burrow repo.');
  }

  // Step 1: Global symlinks (idempotent)
  ensureDir(path.join(GLOBAL_CLAUDE, 'commands'));
  ensureSymlink(BURROW_SOURCE, GLOBAL_BURROW, '~/.claude/burrow');
  ensureSymlink(COMMANDS_SOURCE, GLOBAL_COMMANDS, '~/.claude/commands/burrow');

  // Step 2: Project data
  const dataDir = path.join(projectDir, '.planning', 'burrow');
  const dataFile = path.join(dataDir, 'cards.json');
  ensureDir(dataDir);
  if (fs.existsSync(dataFile)) {
    skip('cards.json');
  } else {
    fs.writeFileSync(dataFile, JSON.stringify({ version: 2, cards: [] }) + '\n');
    ok('Created .planning/burrow/cards.json');
  }

  // Step 3: CLAUDE.md
  const claudeMd = path.join(projectDir, 'CLAUDE.md');
  if (fs.existsSync(claudeMd)) {
    const content = fs.readFileSync(claudeMd, 'utf-8');
    if (content.includes('Burrow \u2014 Agent Memory')) {
      skip('CLAUDE.md already has Burrow section');
    } else {
      fs.writeFileSync(claudeMd, content.trimEnd() + '\n\n' + CLAUDE_MD_SNIPPET);
      ok('Appended Burrow memory section to CLAUDE.md');
    }
  } else {
    fs.writeFileSync(claudeMd, CLAUDE_MD_SNIPPET);
    ok('Created CLAUDE.md with Burrow memory section');
  }

  console.log('\n  Done. Say /burrow to get started.\n');
}

// ── CLI ────────────────────────────────────────────────────────────

init(process.argv[2] || process.cwd());
