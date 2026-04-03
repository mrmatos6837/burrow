#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const {
  generateSnippet,
  generateSlashCommands,
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

/**
 * Arrow-key selector for a list of options. Returns the chosen option's value.
 *
 * @param {string} label - Question label printed above the options
 * @param {{ value: string, label: string }[]} options - Selectable options
 * @param {string} [defaultValue] - Pre-selected value (defaults to first option)
 * @returns {Promise<string>} The selected option's value
 */
function select(label, options, defaultValue) {
  return new Promise((resolve) => {
    // Pause readline so we can use raw mode
    rl.pause();

    let cursor = Math.max(0, options.findIndex(o => o.value === defaultValue));

    const render = () => {
      // Move up to overwrite previous render (skip on first render)
      if (render._drawn) {
        // After previous render, cursor sits on the line after the last option.
        // Move up by options.length to reach the first option line.
        process.stdout.write(`\x1b[${options.length}A\r`);
      }
      for (let i = 0; i < options.length; i++) {
        const marker = i === cursor ? '\x1b[36m>\x1b[0m' : ' ';
        const text = i === cursor ? `\x1b[36m${options[i].label}\x1b[0m` : options[i].label;
        // Move to column 0, clear line, write option, move to next line
        process.stdout.write(`\r\x1b[2K  ${marker} ${text}`);
        if (i < options.length - 1) {
          process.stdout.write('\n');
        }
      }
      // After the last option, move down one line and clear it
      // (prevents residual text from previous prompts leaking through)
      process.stdout.write('\n\r\x1b[2K');
      render._drawn = true;
    };

    console.log(`  ${label}`);
    render();

    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();

    const onData = (buf) => {
      const key = buf.toString();

      // Ctrl+C
      if (key === '\x03') {
        stdin.setRawMode(false);
        stdin.removeListener('data', onData);
        rl.resume();
        process.exit(0);
      }

      // Enter
      if (key === '\r' || key === '\n') {
        stdin.setRawMode(false);
        stdin.removeListener('data', onData);
        rl.resume();
        resolve(options[cursor].value);
        return;
      }

      // Arrow keys (escape sequences: \x1b[A = up, \x1b[B = down)
      if (key === '\x1b[A' || key === 'k') {
        cursor = (cursor - 1 + options.length) % options.length;
        render();
      } else if (key === '\x1b[B' || key === 'j') {
        cursor = (cursor + 1) % options.length;
        render();
      }
    };

    stdin.on('data', onData);
  });
}

// ── Argument parsing ──────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  const flags = { yes: false, interactive: false, uninstall: false, help: false };
  let positional = null;

  for (const arg of args) {
    if (arg === '--yes' || arg === '-y') {
      flags.yes = true;
    } else if (arg === '--interactive') {
      flags.interactive = true;
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
  --interactive     Force interactive prompts even when stdin is not a TTY.
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
    created:   (k) => ok(`${k} (created${k === '.gitignore' ? ' — with cards.json.bak entry' : ''})`),
    updated:   (k) => ok(`${k} (updated${k === '.gitignore' ? ' — added cards.json.bak entry' : ''})`),
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

// ── Preference capture flow ──────────────────────────────────────────────────

/**
 * Interactive preference flow. Walks user through config options.
 * Returns config object with user's choices (merged over current/defaults).
 */
async function capturePreferences(currentCfg) {
  const cfg = { ...currentCfg };

  console.log('\n── Preferences ──────────────────────────────────────────────────────────\n');

  // 1. Load mode
  cfg.loadMode = await select('How should Burrow load cards at session start?', [
    { value: 'auto',  label: 'auto  — full read if small, index if large (recommended)' },
    { value: 'full',  label: 'full  — always read the entire cards.json' },
    { value: 'index', label: 'index — always load a lightweight title-only index' },
    { value: 'none',  label: 'none  — don\'t load anything automatically' },
  ], cfg.loadMode);

  // 2. Auto threshold (only relevant if auto mode)
  if (cfg.loadMode === 'auto') {
    const threshAnswer = await ask(
      `  Auto threshold (tokens before switching to index) [${cfg.autoThreshold}]: `,
      String(cfg.autoThreshold)
    );
    const parsed = parseInt(threshAnswer, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      cfg.autoThreshold = parsed;
    } else {
      warn(`Invalid value "${threshAnswer}", keeping ${cfg.autoThreshold}`);
    }
  }

  // 3. Trigger preset
  console.log('');
  cfg.triggerPreset = await select('Which trigger words should prompt Burrow to save?', [
    { value: 'broad',   label: 'broad   — "remember", "don\'t forget", "note this", etc. (recommended)' },
    { value: 'minimal', label: 'minimal — only "burrow this"' },
    { value: 'none',    label: 'none    — no automatic triggers' },
  ], cfg.triggerPreset);
  cfg.triggerWords = config.TRIGGER_PRESETS[cfg.triggerPreset] || [];

  console.log('');
  return cfg;
}

// ── Post-install message ──────────────────────────────────────────────────────

function printGettingStarted(cfg, addedClaudeMd) {
  console.log(`
── Getting Started ──────────────────────────────────────────────────────

  Burrow is now installed. Here are a few ways to get started:

  1. In your Claude session, type /burrow to open the card manager.

  2. Add a card from the command line:
       node .claude/burrow/burrow-tools.cjs add --title "My first card" \\
         --body "A note about my project"

  3. List all cards:
       node .claude/burrow/burrow-tools.cjs list`);

  if (addedClaudeMd) {
    console.log(`
── What Burrow will do on each Claude session ──────────────────────────
`);
    // Load behavior
    if (cfg.loadMode === 'none') {
      console.log('  - Cards are not loaded automatically. Claude reads them on demand.');
    } else {
      console.log('  - Claude will silently run `burrow load` at session start.');
      if (cfg.loadMode === 'auto') {
        console.log('    (loads full tree or index depending on file size)');
      } else {
        console.log(`    (mode: ${cfg.loadMode})`);
      }
    }

    // Trigger behavior
    if (cfg.triggerPreset === 'broad') {
      console.log('  - When you say "remember", "don\'t forget", etc., Claude will');
      console.log('    automatically save a Burrow card.');
    } else if (cfg.triggerPreset === 'minimal') {
      console.log('  - When you say "burrow this", Claude will save a Burrow card.');
    } else if (cfg.triggerPreset === 'none') {
      console.log('  - No automatic triggers — Claude only saves cards when you');
      console.log('    explicitly use /burrow.');
    }

    console.log(`
  To change these behaviors:
    node .claude/burrow/burrow-tools.cjs config set loadMode <full|index|none|auto>
    node .claude/burrow/burrow-tools.cjs config set triggerPreset <broad|minimal|none>`);
  }

  console.log(`
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

  // Capture preferences interactively, or use defaults
  let cfg = { ...config.DEFAULTS };
  if (!yes) {
    cfg = await capturePreferences(cfg);
  } else {
    console.log('  Using default preferences:');
    console.log(`    loadMode: ${cfg.loadMode}`);
    console.log(`    triggerPreset: ${cfg.triggerPreset}`);
  }

  const results = performInstall(sourceDir, targetDir);
  printInstallResults(results);

  // Save user preferences to config.json
  config.save(targetDir, cfg);
  ok('config.json (saved)');

  if (addClaudeMd) {
    writeSentinelBlock(claudeMdPath, generateSnippet(cfg));
    ok('CLAUDE.md (burrow block added — controls how Claude loads your cards)');
  } else {
    skip('CLAUDE.md (skipped — no agent behavior changes)');
  }

  printGettingStarted(cfg, addClaudeMd);
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

  // Load existing config
  let cfg;
  try {
    cfg = config.load(targetDir);
  } catch (_) {
    cfg = { ...config.DEFAULTS };
  }

  // Offer to update preferences
  if (!yes) {
    const configAnswer = await ask('  Update preferences? [y/N] ', 'n');
    if (configAnswer.toLowerCase() === 'y') {
      cfg = await capturePreferences(cfg);
      config.save(targetDir, cfg);
      ok('config.json (updated)');
    }
  }

  const results = performUpgrade(sourceDir, targetDir);
  printInstallResults(results);

  // Handle CLAUDE.md sentinel
  if (detection.hasSentinel) {
    writeSentinelBlock(claudeMdPath, generateSnippet(cfg));
    ok('CLAUDE.md (sentinel block updated to match current config)');
  } else if (detection.hasLegacyClaude) {
    if (!yes) {
      const legacyAnswer = await ask('  CLAUDE.md has a legacy Burrow section. Replace with updated version? [Y/n] ', 'y');
      if (legacyAnswer.toLowerCase() === 'n') {
        skip('CLAUDE.md (legacy section kept as-is)');
      } else {
        writeSentinelBlock(claudeMdPath, generateSnippet(cfg));
        warn('CLAUDE.md legacy Burrow section replaced with sentinel block');
      }
    } else {
      writeSentinelBlock(claudeMdPath, generateSnippet(cfg));
      warn('CLAUDE.md legacy Burrow section replaced with sentinel block');
    }
  } else {
    skip('CLAUDE.md (no Burrow section found — not modified)');
  }

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

  // Regenerate slash commands if the commands directory was missing
  if (missing.includes('.claude/commands/burrow')) {
    generateSlashCommands(targetDir);
    ok('.claude/commands/burrow/ (slash commands regenerated)');
  }

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

  // Auto-detect non-interactive stdin (e.g. npx piping, CI, AI agents)
  if (!flags.yes && !flags.interactive && !process.stdin.isTTY) {
    flags.yes = true;
    console.log('  Non-interactive terminal detected, using defaults. Pass --interactive to override.');
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
