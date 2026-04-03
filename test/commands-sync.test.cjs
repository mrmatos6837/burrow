'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const {
  COMMANDS,
  CLI_COMMANDS,
  SLASH_COMMANDS,
  generateSlashCommand,
  generateHelpCommand,
  generateUpdateCommand,
  commandsForEnvelope,
} = require('../.claude/burrow/lib/commands.cjs');

const { generateSlashCommands } = require('../.claude/burrow/lib/installer.cjs');

// ── Registry integrity ───────────────────────────────────────────────────────

describe('commands.cjs registry integrity', () => {
  it('every command has required fields', () => {
    for (const cmd of COMMANDS) {
      assert.ok(cmd.name, `command missing name: ${JSON.stringify(cmd)}`);
      assert.ok(cmd.desc, `${cmd.name}: missing desc`);
      assert.ok(typeof cmd.usage === 'string', `${cmd.name}: missing usage`);
      assert.ok(typeof cmd.argHint === 'string', `${cmd.name}: missing argHint`);
    }
  });

  it('no duplicate command names', () => {
    const names = COMMANDS.map(c => c.name);
    const unique = new Set(names);
    assert.equal(names.length, unique.size, `duplicates found: ${names.filter((n, i) => names.indexOf(n) !== i)}`);
  });

  it('CLI_COMMANDS excludes slash-only commands', () => {
    const cliNames = CLI_COMMANDS.map(c => c.name);
    assert.ok(!cliNames.includes('help'), 'help should not be in CLI_COMMANDS');
    assert.ok(!cliNames.includes('update'), 'update should not be in CLI_COMMANDS');
    assert.ok(cliNames.includes('load'), 'load should be in CLI_COMMANDS');
    assert.ok(cliNames.includes('add'), 'add should be in CLI_COMMANDS');
  });

  it('SLASH_COMMANDS excludes non-slash commands', () => {
    const slashNames = SLASH_COMMANDS.map(c => c.name);
    assert.ok(!slashNames.includes('load'), 'load should not be in SLASH_COMMANDS');
    assert.ok(slashNames.includes('add'), 'add should be in SLASH_COMMANDS');
    assert.ok(slashNames.includes('help'), 'help should be in SLASH_COMMANDS');
  });
});

// ── CLI sync ─────────────────────────────────────────────────────────────────

describe('CLI switch cases match registry', () => {
  it('every CLI_COMMAND has a case in burrow-tools.cjs', () => {
    const toolsSrc = fs.readFileSync(
      path.join(__dirname, '..', '.claude', 'burrow', 'burrow-tools.cjs'),
      'utf-8'
    );

    for (const cmd of CLI_COMMANDS) {
      const pattern = `case '${cmd.name}'`;
      assert.ok(
        toolsSrc.includes(pattern),
        `burrow-tools.cjs missing case for "${cmd.name}" — add it to the switch statement`
      );
    }
  });

  it('every case in burrow-tools.cjs has a CLI_COMMAND entry', () => {
    const toolsSrc = fs.readFileSync(
      path.join(__dirname, '..', '.claude', 'burrow', 'burrow-tools.cjs'),
      'utf-8'
    );

    const caseRegex = /case '(\w+)':/g;
    const cliNames = new Set(CLI_COMMANDS.map(c => c.name));
    let match;

    while ((match = caseRegex.exec(toolsSrc)) !== null) {
      assert.ok(
        cliNames.has(match[1]),
        `burrow-tools.cjs has case "${match[1]}" but it's not in CLI_COMMANDS — add it to commands.cjs`
      );
    }
  });
});

// ── Workflow command reference sync ──────────────────────────────────────────

describe('workflow command reference matches registry', () => {
  it('every CLI command appears in the workflow command table', () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, '..', '.claude', 'burrow', 'workflows', 'burrow.md'),
      'utf-8'
    );

    for (const cmd of CLI_COMMANDS) {
      assert.ok(
        workflow.includes(`| ${cmd.name} `),
        `workflow command table missing "${cmd.name}" — update the table in workflows/burrow.md`
      );
    }
  });

  it('every command in the workflow table has a CLI_COMMAND entry', () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, '..', '.claude', 'burrow', 'workflows', 'burrow.md'),
      'utf-8'
    );

    // Extract command names from table rows (skip header and separator)
    const tableRowRegex = /^\| (\w+) \|/gm;
    const cliNames = new Set(CLI_COMMANDS.map(c => c.name));
    let match;

    while ((match = tableRowRegex.exec(workflow)) !== null) {
      if (match[1] === 'Command') continue; // skip header
      assert.ok(
        cliNames.has(match[1]),
        `workflow table has "${match[1]}" but it's not in CLI_COMMANDS — remove it or add it to commands.cjs`
      );
    }
  });
});

// ── Slash command generation ─────────────────────────────────────────────────

describe('generated slash commands', () => {
  it('standard slash commands produce valid frontmatter and point to CLI', () => {
    const standardCmds = SLASH_COMMANDS.filter(c => !c.custom);
    assert.ok(standardCmds.length > 0, 'should have at least one standard command');

    for (const cmd of standardCmds) {
      const content = generateSlashCommand(cmd);
      assert.ok(content, `${cmd.name}: generateSlashCommand returned null`);
      assert.ok(content.startsWith('---'), `${cmd.name}: should start with frontmatter`);
      assert.ok(content.includes(`name: burrow:${cmd.name}`), `${cmd.name}: should have correct name`);
      assert.ok(content.includes(`description: ${cmd.desc}`), `${cmd.name}: should have correct description`);
      assert.ok(content.includes('allowed-tools:'), `${cmd.name}: should have allowed-tools`);
      assert.ok(content.includes('$ARGUMENTS'), `${cmd.name}: should include $ARGUMENTS placeholder`);
    }
  });

  it('no standard slash command points to a non-existent CLI command', () => {
    const cliNames = new Set(CLI_COMMANDS.map(c => c.name));
    const standardCmds = SLASH_COMMANDS.filter(c => !c.custom);

    for (const cmd of standardCmds) {
      assert.ok(
        cliNames.has(cmd.name),
        `"${cmd.name}" uses standard template (points to burrow-tools.cjs ${cmd.name}) but is not a CLI command — mark it custom: true and add a dedicated generator`
      );
    }
  });

  it('every custom slash command has a working generator', () => {
    const customCmds = SLASH_COMMANDS.filter(c => c.custom);
    const generators = { help: generateHelpCommand, update: generateUpdateCommand };

    for (const cmd of customCmds) {
      const gen = generators[cmd.name];
      assert.ok(gen, `custom command "${cmd.name}" has no generator — add one to commands.cjs and register it here`);
      const content = gen();
      assert.ok(content, `${cmd.name}: generator returned null/empty`);
      assert.ok(content.includes(`name: burrow:${cmd.name}`), `${cmd.name}: should have correct name in frontmatter`);
    }
  });

  it('generateHelpCommand includes all slash commands in the table', () => {
    const help = generateHelpCommand();
    for (const cmd of SLASH_COMMANDS) {
      if (cmd.name === 'help') {
        assert.ok(help.includes('/burrow:help'), 'help table should include help itself');
      } else {
        assert.ok(
          help.includes(`/burrow:${cmd.name}`),
          `help table missing /burrow:${cmd.name}`
        );
      }
    }
  });

  it('generateSlashCommands writes correct number of files', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'burrow-slash-test-'));
    try {
      const count = generateSlashCommands(tmpDir);
      assert.equal(count, SLASH_COMMANDS.length, 'should generate one file per slash command');

      const files = fs.readdirSync(path.join(tmpDir, '.claude', 'commands', 'burrow'));
      assert.equal(files.length, SLASH_COMMANDS.length, 'directory should have correct number of files');

      for (const cmd of SLASH_COMMANDS) {
        assert.ok(
          files.includes(`${cmd.name}.md`),
          `missing generated file: ${cmd.name}.md`
        );
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('every generated file contains valid frontmatter', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'burrow-slash-validate-'));
    try {
      generateSlashCommands(tmpDir);
      const dir = path.join(tmpDir, '.claude', 'commands', 'burrow');

      for (const cmd of SLASH_COMMANDS) {
        const content = fs.readFileSync(path.join(dir, `${cmd.name}.md`), 'utf-8');
        assert.ok(content.startsWith('---'), `${cmd.name}.md: should start with frontmatter`);
        assert.ok(content.includes(`name: burrow:${cmd.name}`), `${cmd.name}.md: wrong name in frontmatter`);
        // Non-help commands should point to either CLI or npx, not be empty
        if (cmd.name !== 'help') {
          assert.ok(
            content.includes('Run:') || content.includes('run'),
            `${cmd.name}.md: should contain a Run instruction`
          );
        }
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ── Load envelope sync ───────────────────────────────────────────────────────

describe('load envelope commands match registry', () => {
  it('commandsForEnvelope returns all CLI commands', () => {
    const envelope = commandsForEnvelope();
    const envelopeNames = envelope.map(c => c.name);
    const cliNames = CLI_COMMANDS.map(c => c.name);

    assert.deepEqual(envelopeNames, cliNames, 'envelope commands should match CLI_COMMANDS');
  });

  it('envelope commands only have agent-facing fields (no internal metadata)', () => {
    const envelope = commandsForEnvelope();
    for (const cmd of envelope) {
      const keys = Object.keys(cmd);
      assert.deepEqual(keys.sort(), ['desc', 'name', 'usage'], `${cmd.name}: should only have name, usage, desc`);
    }
  });
});
