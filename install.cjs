#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const {
  generateSnippet,
  detect,
  performInstall,
  performUpgrade,
  performRepair,
  writeSentinelBlock,
  removeSentinelBlock,
} = require('./.claude/burrow/lib/installer.cjs');

const config = require('./.claude/burrow/lib/config.cjs');

// ── Output helpers ────────────────────────────────────────────────────────────

function ok(msg)   { console.log(`  \u2713 ${msg}`); }
function skip(msg) { console.log(`  \u00b7 ${msg}`); }
function fail(msg) { console.error(`  \u2717 ${msg}`); }
function warn(msg) { console.log(`  ! ${msg}`); }

// ── readline helpers ──────────────────────────────────────────────────────────

let rl = null;

function createInterface() {
  rl = readline.createInterface({ input: process.stdin, output: process.stdout });
}

function closeInterface() {
  if (rl) { rl.close(); rl = null; }
}

/**
 * Prompt the user and return their answer (resolves to defaultAnswer on empty input).
 */
function ask(question, defaultAnswer = '') {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      const trimmed = answer.trim();
      resolve(trimmed === '' ? defaultAnswer : trimmed);
    });
  });
}

// ── Argument parsing ──────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  const flags = { yes: false, uninstall: false, help: false };
  let positional = null;

  for (const arg of args) {
    if (arg === '--yes' || arg === '-y') {
      flags.yes = true;
    } else if (arg === '--uninstall') {
      flags.uninstall = true;
    } else if (arg === '--help' || arg === '-h') {
      flags.help = true;
    } else if (!arg.startsWith('-')) {
      positional = arg;
    }
  }

  return { flags, positional };
}

// ── Usage ─────────────────────────────────────────────────────────────────────

function printUsage() {
  console.log(`
Usage: npx create-burrow [target-dir] [options]

  Installs (or manages) Burrow in the target project directory.

Arguments:
  target-dir        Path to the target project root (default: current directory)

Options:
  --yes, -y         Non-interactive mode. Accept all defaults, skip prompts.
  --uninstall       Remove all Burrow files from the target project.
  --help, -h        Print this help message and exit.

Modes (auto-detected):
  fresh install     No Burrow files found — installs everything fresh.
  upgrade           All Burrow files present — replaces source files, preserves data.
  repair            Some Burrow files missing — restores only missing files.
  uninstall         Removes .claude/burrow/, .claude/commands/burrow*, .planning/burrow/, and the CLAUDE.md sentinel block.

Examples:
  npx create-burrow                   Interactive install in current directory
  npx create-burrow /path/to/project  Interactive install in specified directory
  npx create-burrow --yes             Non-interactive install with all defaults
  npx create-burrow --uninstall       Interactive uninstall (requires confirmation)
  npx create-burrow --uninstall --yes Non-interactive uninstall
`);
}

// ── Checklist output helpers ──────────────────────────────────────────────────

function printInstallResults(results) {
  const statusMap = {
    copied:    (k) => ok(`${k}`),
    replaced:  (k) => ok(`${k} (replaced)`),
    preserved: (k) => skip(`${k} (preserved)`),
    created:   (k) => ok(`${k} (created)`),
    updated:   (k) => ok(`${k} (updated)`),
    unchanged: (k) => skip(`${k} (unchanged)`),
    'copied-dir': (k) => ok(`${k}`),
    'source-missing': (k) => fail(`${k} (source missing)`),
  };

  const labelMap = {
    burrowDir:  '.claude/burrow/',
    commandFile: '.claude/commands/burrow.md',
    commandDir: '.claude/commands/burrow/',
    cardsJson:  '.planning/burrow/cards.json',
    gitignore:  '.gitignore',
  };

  for (const [key, status] of Object.entries(results)) {
    const label = labelMap[key] || key;
    const printer = statusMap[status];
    if (printer) {
      printer(label);
    } else {
      ok(`${label} (${status})`);
    }
  }
}

// ── Post-install message ──────────────────────────────────────────────────────

function printGettingStarted() {
  console.log(`
── Getting Started ──────────────────────────────────────────────────────

  Burrow is now installed. Here are a few ways to get started:

  1. In your Claude session, type /burrow to open the card manager.

  2. Add a card from the command line:
       node .claude/burrow/burrow-tools.cjs add --title "My first card" \\
         --body "A note about my project"

  3. List all cards:
       node .claude/burrow/burrow-tools.cjs list

  4. CLAUDE.md has been updated with Burrow agent instructions so Claude
     will automatically load your cards on every session start.

─────────────────────────────────────────────────────────────────────────
`);
}

// ── Uninstall helpers ─────────────────────────────────────────────────────────

/**
 * Remove a directory recursively, silently skipping if it doesn't exist.
 */
function removeDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    return true;
  }
  return false;
}

/**
 * Remove a file, silently skipping if it doesn't exist.
 */
function removeFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath);
    return true;
  }
  return false;
}

/**
 * Remove a directory if it exists and is empty.
 */
function removeIfEmpty(dir) {
  if (!fs.existsSync(dir)) return false;
  try {
    const entries = fs.readdirSync(dir);
    if (entries.length === 0) {
      fs.rmdirSync(dir);
      return true;
    }
  } catch (_) {
    // ignore
  }
  return false;
}

// ── Install flow ──────────────────────────────────────────────────────────────

async function runInstall({ sourceDir, targetDir, yes, detection }) {
  const claudeMdPath = path.join(targetDir, 'CLAUDE.md');

  // Ask for Claude.md opt-in
  let addClaudeMd = true;
  if (!yes) {
    const claudeAnswer = await ask(
      '  Add Burrow instructions to CLAUDE.md? [Y/n] ',
      'y'
    );
    addClaudeMd = claudeAnswer.toLowerCase() !== 'n';
  }

  const results = performInstall(sourceDir, targetDir);
  printInstallResults(results);

  if (addClaudeMd) {
    let cfg;
    try {
      cfg = config.load(targetDir);
    } catch (_) {
      cfg = { ...config.DEFAULTS };
    }
    writeSentinelBlock(claudeMdPath, generateSnippet(cfg));
    ok('CLAUDE.md (burrow block added)');
  } else {
    skip('CLAUDE.md (skipped)');
  }

  printGettingStarted();
}

// ── Upgrade flow ──────────────────────────────────────────────────────────────

async function runUpgrade({ sourceDir, targetDir, yes, detection }) {
  const claudeMdPath = path.join(targetDir, 'CLAUDE.md');
  const { version } = detection;

  console.log('\n  Detected existing Burrow installation.');

  // Read our own version for the "old -> new" display
  const sourceVersionFile = path.join(sourceDir, '.claude', 'burrow', 'VERSION');
  const sourcePkgFile = path.join(sourceDir, '.claude', 'burrow', 'package.json');
  let newVersion = null;
  if (fs.existsSync(sourceVersionFile)) {
    newVersion = fs.readFileSync(sourceVersionFile, 'utf-8').trim();
  } else if (fs.existsSync(sourcePkgFile)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(sourcePkgFile, 'utf-8'));
      newVersion = pkg.version || null;
    } catch (_) {
      // ignore
    }
  }

  if (version || newVersion) {
    const fromStr = version || '(unknown)';
    const toStr   = newVersion || '(unknown)';
    console.log(`  Upgrading Burrow: v${fromStr} -> v${toStr}`);
  }

  if (!yes) {
    const answer = await ask('  Proceed with upgrade? [Y/n] ', 'y');
    if (answer.toLowerCase() === 'n') {
      console.log('\n  Upgrade cancelled.\n');
      return;
    }
  }

  const results = performUpgrade(sourceDir, targetDir);
  printInstallResults(results);

  // Handle CLAUDE.md sentinel
  if (detection.hasSentinel) {
    let cfg;
    try {
      cfg = config.load(targetDir);
    } catch (_) {
      cfg = { ...config.DEFAULTS };
    }
    writeSentinelBlock(claudeMdPath, generateSnippet(cfg));
    ok('CLAUDE.md (sentinel block updated)');
  } else if (detection.hasLegacyClaude) {
    // Wrap legacy ## Burrow section in sentinels
    let cfg;
    try {
      cfg = config.load(targetDir);
    } catch (_) {
      cfg = { ...config.DEFAULTS };
    }
    writeSentinelBlock(claudeMdPath, generateSnippet(cfg));
    warn('CLAUDE.md had legacy Burrow section — replaced with sentinel block');
  }
  // else: no action (user opted out previously)

  console.log('\n  Upgrade complete.\n');
}

// ── Repair flow ───────────────────────────────────────────────────────────────

async function runRepair({ sourceDir, targetDir, yes, detection }) {
  const { missing } = detection;

  console.log(`\n  Detected partial Burrow installation, ${missing.length} file(s) missing:`);
  for (const f of missing) {
    console.log(`    - ${f}`);
  }

  if (!yes) {
    const answer = await ask('  Proceed with repair? [Y/n] ', 'y');
    if (answer.toLowerCase() === 'n') {
      console.log('\n  Repair cancelled.\n');
      return;
    }
  }

  const results = performRepair(sourceDir, targetDir, missing);
  printInstallResults(results);

  console.log('\n  Repair complete.\n');
}

// ── Uninstall flow ────────────────────────────────────────────────────────────

async function runUninstall({ targetDir, yes }) {
  const burrowDir    = path.join(targetDir, '.claude', 'burrow');
  const commandFile  = path.join(targetDir, '.claude', 'commands', 'burrow.md');
  const commandDir   = path.join(targetDir, '.claude', 'commands', 'burrow');
  const dataDir      = path.join(targetDir, '.planning', 'burrow');
  const claudeMdPath = path.join(targetDir, 'CLAUDE.md');
  const claudeDir    = path.join(targetDir, '.claude');
  const commandsDir  = path.join(targetDir, '.claude', 'commands');
  const planningDir  = path.join(targetDir, '.planning');

  console.log('\n  The following will be removed:');
  if (fs.existsSync(burrowDir))   console.log(`    - .claude/burrow/`);
  if (fs.existsSync(commandFile)) console.log(`    - .claude/commands/burrow.md`);
  if (fs.existsSync(commandDir))  console.log(`    - .claude/commands/burrow/`);
  if (fs.existsSync(dataDir))     console.log(`    - .planning/burrow/`);
  if (fs.existsSync(claudeMdPath)) {
    const content = fs.readFileSync(claudeMdPath, 'utf-8');
    if (content.includes('<!-- burrow:start -->')) {
      console.log(`    - CLAUDE.md sentinel block`);
    }
  }
  console.log('');

  if (!yes) {
    const answer = await ask('  Proceed with uninstall? [y/N] ', 'n');
    if (answer.toLowerCase() !== 'y') {
      console.log('\n  Uninstall cancelled.\n');
      return;
    }
  }

  // Remove files/dirs
  if (removeDir(burrowDir))   ok('.claude/burrow/ removed');
  else                        skip('.claude/burrow/ (not found)');

  if (removeFile(commandFile)) ok('.claude/commands/burrow.md removed');
  else                         skip('.claude/commands/burrow.md (not found)');

  if (removeDir(commandDir))  ok('.claude/commands/burrow/ removed');
  else                        skip('.claude/commands/burrow/ (not found)');

  if (removeDir(dataDir))     ok('.planning/burrow/ removed');
  else                        skip('.planning/burrow/ (not found)');

  // Remove sentinel block from CLAUDE.md
  if (fs.existsSync(claudeMdPath)) {
    const before = fs.readFileSync(claudeMdPath, 'utf-8');
    if (before.includes('<!-- burrow:start -->')) {
      removeSentinelBlock(claudeMdPath);
      ok('CLAUDE.md sentinel block removed');
    }
  }

  // Clean up empty parent dirs
  if (removeIfEmpty(commandsDir)) ok('.claude/commands/ removed (was empty)');
  if (removeIfEmpty(claudeDir))   ok('.claude/ removed (was empty)');
  if (removeIfEmpty(planningDir)) ok('.planning/ removed (was empty)');

  console.log('\n  Uninstall complete.\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { flags, positional } = parseArgs(process.argv);

  if (flags.help) {
    printUsage();
    process.exit(0);
  }

  const sourceDir = __dirname;
  const targetDir = positional ? path.resolve(positional) : process.cwd();

  // Verify source is valid
  const burrowToolsPath = path.join(sourceDir, '.claude', 'burrow', 'burrow-tools.cjs');
  if (!fs.existsSync(burrowToolsPath)) {
    console.error(`  \u2717 Cannot find .claude/burrow/burrow-tools.cjs in ${sourceDir}`);
    console.error('  Package may be incomplete — try: npm cache clean --force && npx create-burrow');
    process.exit(1);
  }

  if (flags.uninstall) {
    console.log('\n── Burrow Uninstall ─────────────────────────────────────────────────────\n');
    if (!flags.yes) createInterface();
    await runUninstall({ targetDir, yes: flags.yes });
    closeInterface();
    return;
  }

  // Detect mode
  const detection = detect(targetDir);

  console.log('\n── Burrow Install ───────────────────────────────────────────────────────\n');

  if (!flags.yes) createInterface();

  if (detection.mode === 'fresh') {
    // Optionally ask for target path
    let resolvedTarget = targetDir;
    if (!flags.yes) {
      const pathAnswer = await ask(
        `  Install directory [${targetDir}]: `,
        targetDir
      );
      resolvedTarget = path.resolve(pathAnswer);
    }

    await runInstall({ sourceDir, targetDir: resolvedTarget, yes: flags.yes, detection });
  } else if (detection.mode === 'upgrade') {
    await runUpgrade({ sourceDir, targetDir, yes: flags.yes, detection });
  } else if (detection.mode === 'repair') {
    await runRepair({ sourceDir, targetDir, yes: flags.yes, detection });
  }

  closeInterface();
}

main().catch((err) => {
  console.error(`  \u2717 Fatal error: ${err.message}`);
  closeInterface();
  process.exit(1);
});
