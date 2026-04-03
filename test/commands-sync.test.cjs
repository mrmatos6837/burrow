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

// ── Slash command generation ─────────────────────────────────────────────────

describe('generated slash commands', () => {
  it('generateSlashCommand produces valid frontmatter for each non-custom command', () => {
    for (const cmd of SLASH_COMMANDS) {
      if (cmd.custom) continue;
      const content = generateSlashCommand(cmd);
      assert.ok(content, `${cmd.name}: generateSlashCommand returned null`);
      assert.ok(content.startsWith('---'), `${cmd.name}: should start with frontmatter`);
      assert.ok(content.includes(`name: burrow:${cmd.name}`), `${cmd.name}: should have correct name`);
      assert.ok(content.includes(`description: ${cmd.desc}`), `${cmd.name}: should have correct description`);
      assert.ok(content.includes('allowed-tools:'), `${cmd.name}: should have allowed-tools`);
      assert.ok(content.includes('$ARGUMENTS'), `${cmd.name}: should include $ARGUMENTS placeholder`);
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
