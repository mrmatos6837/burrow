'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const CLI_PATH = path.resolve(__dirname, '..', 'burrow-tools.cjs');

/**
 * Run a CLI command with --json flag and return the parsed JSON response.
 * @param {string[]} args - CLI arguments
 * @param {string} cwd - Working directory
 * @returns {object} Parsed JSON response
 */
function runJson(args, cwd) {
  // Prepend --json to get structured output
  const fullArgs = [args[0], '--json', ...args.slice(1)];
  try {
    const stdout = execFileSync('node', [CLI_PATH, ...fullArgs], {
      cwd,
      encoding: 'utf-8',
      env: { ...process.env },
    });
    return JSON.parse(stdout.trim());
  } catch (err) {
    // Exit code 1: error output on stdout
    if (err.stdout) {
      return JSON.parse(err.stdout.trim());
    }
    throw err;
  }
}

/**
 * Run a CLI command and return the raw stdout string (no JSON parsing).
 * @param {string[]} args - CLI arguments
 * @param {string} cwd - Working directory
 * @returns {string} Raw stdout
 */
function runRaw(args, cwd) {
  try {
    return execFileSync('node', [CLI_PATH, ...args], {
      cwd,
      encoding: 'utf-8',
      env: { ...process.env },
    });
  } catch (err) {
    if (err.stdout) {
      return err.stdout;
    }
    throw err;
  }
}

/**
 * Create a fresh temp directory for test isolation.
 * @returns {string} Path to temp directory
 */
function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'burrow-cli-'));
}

/**
 * Remove a temp directory.
 * @param {string} dir
 */
function removeTmpDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe('add', () => {
  let tmpDir;
  before(() => { tmpDir = makeTmpDir(); });
  after(() => { removeTmpDir(tmpDir); });

  it('adds card at root with v2 schema', () => {
    const res = runJson(['add', '--title', 'Root Card'], tmpDir);
    assert.equal(res.success, true);
    assert.equal(res.data.title, 'Root Card');
    assert.match(res.data.id, /^[0-9a-f]{8}$/);
    assert.equal(res.data.body, '');
    assert.deepEqual(res.data.children, []);
    assert.ok(res.data.created);
    assert.equal(res.data.position, undefined);
    assert.equal(res.data.notes, undefined);
  });

  it('adds card as child', () => {
    const parent = runJson(['add', '--title', 'Parent'], tmpDir);
    const child = runJson(['add', '--title', 'Child', '--parent', parent.data.id], tmpDir);
    assert.equal(child.success, true);
    assert.equal(child.data.title, 'Child');

    // Verify child is under parent via get (render array)
    const got = runJson(['get', parent.data.id], tmpDir);
    assert.equal(got.success, true);
    const childEntries = got.data.cards.filter((c) => c.depth === 1);
    assert.equal(childEntries.length, 1);
    assert.equal(childEntries[0].id, child.data.id);
  });

  it('adds card with --body', () => {
    const res = runJson(['add', '--title', 'WithBody', '--body', 'Hello world'], tmpDir);
    assert.equal(res.success, true);
    assert.equal(res.data.body, 'Hello world');
  });
});

describe('edit', () => {
  let tmpDir;
  before(() => { tmpDir = makeTmpDir(); });
  after(() => { removeTmpDir(tmpDir); });

  it('edits title', () => {
    const added = runJson(['add', '--title', 'Original'], tmpDir);
    const edited = runJson(['edit', added.data.id, '--title', 'New Title'], tmpDir);
    assert.equal(edited.success, true);
    assert.equal(edited.data.title, 'New Title');
  });

  it('edits body', () => {
    const added = runJson(['add', '--title', 'BodyCard'], tmpDir);
    const edited = runJson(['edit', added.data.id, '--body', 'Updated body'], tmpDir);
    assert.equal(edited.success, true);
    assert.equal(edited.data.body, 'Updated body');
  });
});

describe('delete', () => {
  let tmpDir;
  before(() => { tmpDir = makeTmpDir(); });
  after(() => { removeTmpDir(tmpDir); });

  it('deletes card', () => {
    const added = runJson(['add', '--title', 'ToDelete'], tmpDir);
    const del = runJson(['delete', added.data.id], tmpDir);
    assert.equal(del.success, true);
    assert.equal(del.data.id, added.data.id);

    // Verify it is gone via get
    const list = runJson(['get'], tmpDir);
    const ids = list.data.cards.map((c) => c.id);
    assert.ok(!ids.includes(added.data.id));
  });

  it('reports descendant count', () => {
    const dir = makeTmpDir();
    try {
      const parent = runJson(['add', '--title', 'Parent'], dir);
      runJson(['add', '--title', 'Child1', '--parent', parent.data.id], dir);
      runJson(['add', '--title', 'Child2', '--parent', parent.data.id], dir);
      const del = runJson(['delete', parent.data.id], dir);
      assert.equal(del.data.descendantCount, 2);
    } finally {
      removeTmpDir(dir);
    }
  });
});

describe('move', () => {
  let tmpDir;
  before(() => { tmpDir = makeTmpDir(); });
  after(() => { removeTmpDir(tmpDir); });

  it('moves card to different parent', () => {
    const a = runJson(['add', '--title', 'A'], tmpDir);
    const b = runJson(['add', '--title', 'B'], tmpDir);
    const moved = runJson(['move', a.data.id, '--parent', b.data.id], tmpDir);
    assert.equal(moved.success, true);

    // Verify A is now child of B via get (render array)
    const got = runJson(['get', b.data.id], tmpDir);
    const childIds = got.data.cards.filter((c) => c.depth === 1).map((c) => c.id);
    assert.ok(childIds.includes(a.data.id));
  });

  it('moves card to root', () => {
    const dir = makeTmpDir();
    try {
      const parent = runJson(['add', '--title', 'Parent'], dir);
      const child = runJson(['add', '--title', 'Child', '--parent', parent.data.id], dir);
      const moved = runJson(['move', child.data.id, '--parent', ''], dir);
      assert.equal(moved.success, true);

      // Verify child is now at root via get
      const list = runJson(['get'], dir);
      const rootIds = list.data.cards.map((c) => c.id);
      assert.ok(rootIds.includes(child.data.id));
    } finally {
      removeTmpDir(dir);
    }
  });

  it('rejects cycle', () => {
    const dir = makeTmpDir();
    try {
      const a = runJson(['add', '--title', 'A'], dir);
      const b = runJson(['add', '--title', 'B', '--parent', a.data.id], dir);
      // Try to move A under B (would create cycle)
      const res = runJson(['move', a.data.id, '--parent', b.data.id], dir);
      assert.equal(res.success, false);
    } finally {
      removeTmpDir(dir);
    }
  });

  it('moves card with --to flag', () => {
    const dir = makeTmpDir();
    try {
      const parent = runJson(['add', '--title', 'ToParent'], dir);
      const child = runJson(['add', '--title', 'ToChild'], dir);
      const moved = runJson(['move', child.data.id, '--to', parent.data.id], dir);
      assert.equal(moved.success, true);

      // Verify child is now under parent
      const got = runJson(['get', parent.data.id], dir);
      const childIds = got.data.cards.filter((c) => c.depth === 1).map((c) => c.id);
      assert.ok(childIds.includes(child.data.id));
    } finally {
      removeTmpDir(dir);
    }
  });

  it('move --to pretty-print shows correct source and destination', () => {
    const dir = makeTmpDir();
    try {
      const parent = runJson(['add', '--title', 'Destination'], dir);
      const child = runJson(['add', '--title', 'Traveler'], dir);
      const output = runRaw(['move', child.data.id, '--to', parent.data.id], dir);
      assert.ok(output.includes('\u2713'), 'Should contain checkmark');
      assert.ok(output.includes('Moved'), 'Should contain "Moved"');
      assert.ok(output.includes('Destination'), 'Should contain destination parent title');
      assert.ok(output.includes('\u2192'), 'Should contain arrow');
    } finally {
      removeTmpDir(dir);
    }
  });
});

describe('get command', () => {
  let tmpDir;
  before(() => { tmpDir = makeTmpDir(); });
  after(() => { removeTmpDir(tmpDir); });

  it('get with no args returns root cards as render array with breadcrumbs null', () => {
    runJson(['add', '--title', 'GetRoot1'], tmpDir);
    runJson(['add', '--title', 'GetRoot2'], tmpDir);
    const res = runJson(['get'], tmpDir);
    assert.equal(res.success, true);
    assert.equal(res.data.breadcrumbs, null);
    assert.ok(Array.isArray(res.data.cards));
    assert.ok(res.data.cards.length >= 2);
  });

  it('get <id> returns focused view with breadcrumbs and card at depth 0', () => {
    const dir = makeTmpDir();
    try {
      const parent = runJson(['add', '--title', 'Parent'], dir);
      const child = runJson(['add', '--title', 'Child', '--parent', parent.data.id], dir);
      const res = runJson(['get', child.data.id], dir);
      assert.equal(res.success, true);
      assert.ok(res.data.breadcrumbs);
      assert.equal(res.data.breadcrumbs.length, 1);
      assert.equal(res.data.breadcrumbs[0].id, parent.data.id);
      assert.equal(res.data.cards[0].id, child.data.id);
      assert.equal(res.data.cards[0].depth, 0);
    } finally {
      removeTmpDir(dir);
    }
  });

  it('get <id> --depth 2 returns 2 levels', () => {
    const dir = makeTmpDir();
    try {
      const a = runJson(['add', '--title', 'A'], dir);
      const b = runJson(['add', '--title', 'B', '--parent', a.data.id], dir);
      runJson(['add', '--title', 'C', '--parent', b.data.id], dir);
      const res = runJson(['get', a.data.id, '--depth', '2'], dir);
      assert.equal(res.success, true);
      const depths = res.data.cards.map((c) => c.depth);
      assert.ok(depths.includes(0));
      assert.ok(depths.includes(1));
      assert.ok(depths.includes(2));
    } finally {
      removeTmpDir(dir);
    }
  });

  it('get --depth 0 returns full tree', () => {
    const dir = makeTmpDir();
    try {
      const a = runJson(['add', '--title', 'A'], dir);
      const b = runJson(['add', '--title', 'B', '--parent', a.data.id], dir);
      runJson(['add', '--title', 'C', '--parent', b.data.id], dir);
      const res = runJson(['get', '--depth', '0'], dir);
      assert.equal(res.success, true);
      assert.equal(res.data.cards.length, 3); // A, B, C
    } finally {
      removeTmpDir(dir);
    }
  });

  it('get <id> --depth 0 returns full subtree from that card', () => {
    const dir = makeTmpDir();
    try {
      const a = runJson(['add', '--title', 'A'], dir);
      const b = runJson(['add', '--title', 'B', '--parent', a.data.id], dir);
      runJson(['add', '--title', 'C', '--parent', b.data.id], dir);
      const res = runJson(['get', a.data.id, '--depth', '0'], dir);
      assert.equal(res.success, true);
      assert.equal(res.data.cards.length, 3); // A at 0, B at 1, C at 2
    } finally {
      removeTmpDir(dir);
    }
  });

  it('render entries have correct shape', () => {
    const dir = makeTmpDir();
    try {
      runJson(['add', '--title', 'ShapeTest', '--body', 'test body'], dir);
      const res = runJson(['get'], dir);
      const entry = res.data.cards[0];
      assert.ok('id' in entry);
      assert.ok('title' in entry);
      assert.ok('depth' in entry);
      assert.ok('descendantCount' in entry);
      assert.ok('hasBody' in entry);
      assert.ok('bodyPreview' in entry);
      assert.ok('created' in entry);
      assert.ok('archived' in entry);
    } finally {
      removeTmpDir(dir);
    }
  });

  it('errors on missing ID', () => {
    const res = runJson(['get', 'deadbeef'], tmpDir);
    assert.equal(res.success, false);
    assert.equal(res.code, 'NOT_FOUND');
  });

  it('get --include-archived includes archived cards', () => {
    const dir = makeTmpDir();
    try {
      const card = runJson(['add', '--title', 'ArchTest'], dir);
      runJson(['archive', card.data.id], dir);
      const res = runJson(['get', '--include-archived'], dir);
      const ids = res.data.cards.map((c) => c.id);
      assert.ok(ids.includes(card.data.id));
    } finally {
      removeTmpDir(dir);
    }
  });

  it('get --archived-only shows only archived', () => {
    const dir = makeTmpDir();
    try {
      const card = runJson(['add', '--title', 'ArchOnly1'], dir);
      runJson(['add', '--title', 'Active1'], dir);
      runJson(['archive', card.data.id], dir);
      const res = runJson(['get', '--archived-only'], dir);
      assert.ok(res.data.cards.length > 0);
      for (const c of res.data.cards) {
        assert.equal(c.archived, true);
      }
    } finally {
      removeTmpDir(dir);
    }
  });
});

describe('archive command', () => {
  it('archive <id> returns success with {id, title, descendantCount}', () => {
    const dir = makeTmpDir();
    try {
      const parent = runJson(['add', '--title', 'Parent'], dir);
      runJson(['add', '--title', 'Child', '--parent', parent.data.id], dir);
      const res = runJson(['archive', parent.data.id], dir);
      assert.equal(res.success, true);
      assert.equal(res.data.id, parent.data.id);
      assert.equal(res.data.title, 'Parent');
      assert.equal(res.data.descendantCount, 1);
    } finally {
      removeTmpDir(dir);
    }
  });

  it('subsequent get excludes the archived card', () => {
    const dir = makeTmpDir();
    try {
      const card = runJson(['add', '--title', 'ToArchive'], dir);
      runJson(['archive', card.data.id], dir);
      const res = runJson(['get'], dir);
      const ids = res.data.cards.map((c) => c.id);
      assert.ok(!ids.includes(card.data.id));
    } finally {
      removeTmpDir(dir);
    }
  });

  it('get --include-archived shows the archived card', () => {
    const dir = makeTmpDir();
    try {
      const card = runJson(['add', '--title', 'ArchVisible'], dir);
      runJson(['archive', card.data.id], dir);
      const res = runJson(['get', '--include-archived'], dir);
      const ids = res.data.cards.map((c) => c.id);
      assert.ok(ids.includes(card.data.id));
    } finally {
      removeTmpDir(dir);
    }
  });

  it('missing id returns NOT_FOUND', () => {
    const dir = makeTmpDir();
    try {
      const res = runJson(['archive', 'deadbeef'], dir);
      assert.equal(res.success, false);
      assert.equal(res.code, 'NOT_FOUND');
    } finally {
      removeTmpDir(dir);
    }
  });
});

describe('unarchive command', () => {
  it('unarchive <id> returns success', () => {
    const dir = makeTmpDir();
    try {
      const card = runJson(['add', '--title', 'Unarch'], dir);
      runJson(['archive', card.data.id], dir);
      const res = runJson(['unarchive', card.data.id], dir);
      assert.equal(res.success, true);
      assert.equal(res.data.id, card.data.id);
    } finally {
      removeTmpDir(dir);
    }
  });

  it('card reappears in default get view', () => {
    const dir = makeTmpDir();
    try {
      const card = runJson(['add', '--title', 'Reappear'], dir);
      runJson(['archive', card.data.id], dir);
      runJson(['unarchive', card.data.id], dir);
      const res = runJson(['get'], dir);
      const ids = res.data.cards.map((c) => c.id);
      assert.ok(ids.includes(card.data.id));
    } finally {
      removeTmpDir(dir);
    }
  });

  it('missing id returns NOT_FOUND', () => {
    const dir = makeTmpDir();
    try {
      const res = runJson(['unarchive', 'deadbeef'], dir);
      assert.equal(res.success, false);
      assert.equal(res.code, 'NOT_FOUND');
    } finally {
      removeTmpDir(dir);
    }
  });
});

describe('alias routing', () => {
  it('dump returns same as get --depth 0', () => {
    const dir = makeTmpDir();
    try {
      const a = runJson(['add', '--title', 'DumpA'], dir);
      runJson(['add', '--title', 'DumpB', '--parent', a.data.id], dir);
      const getRes = runJson(['get', '--depth', '0'], dir);
      const dumpRes = runJson(['dump'], dir);
      assert.deepStrictEqual(getRes.data, dumpRes.data);
    } finally {
      removeTmpDir(dir);
    }
  });

  it('path <id> returns ancestry array [{id, title}, ...]', () => {
    const dir = makeTmpDir();
    try {
      const a = runJson(['add', '--title', 'PathA'], dir);
      const b = runJson(['add', '--title', 'PathB', '--parent', a.data.id], dir);
      const res = runJson(['path', b.data.id], dir);
      assert.equal(res.success, true);
      assert.equal(res.data.length, 2);
      assert.equal(res.data[0].id, a.data.id);
      assert.equal(res.data[0].title, 'PathA');
      assert.equal(res.data[1].id, b.data.id);
    } finally {
      removeTmpDir(dir);
    }
  });
});

describe('path', () => {
  let tmpDir;
  before(() => { tmpDir = makeTmpDir(); });
  after(() => { removeTmpDir(tmpDir); });

  it('returns ancestry', () => {
    const a = runJson(['add', '--title', 'A'], tmpDir);
    const b = runJson(['add', '--title', 'B', '--parent', a.data.id], tmpDir);
    const c = runJson(['add', '--title', 'C', '--parent', b.data.id], tmpDir);
    const res = runJson(['path', c.data.id], tmpDir);
    assert.equal(res.success, true);
    assert.equal(res.data.length, 3);
    assert.equal(res.data[0].id, a.data.id);
    assert.equal(res.data[0].title, 'A');
    assert.equal(res.data[1].id, b.data.id);
    assert.equal(res.data[2].id, c.data.id);
  });

  it('errors on missing ID', () => {
    const res = runJson(['path', 'deadbeef'], tmpDir);
    assert.equal(res.success, false);
    assert.equal(res.code, 'NOT_FOUND');
  });
});

describe('error handling', () => {
  it('unknown command returns error JSON with --json', () => {
    const dir = makeTmpDir();
    try {
      const res = runJson(['bogus'], dir);
      assert.equal(res.success, false);
      assert.ok(res.error.includes('Unknown command'));
    } finally {
      removeTmpDir(dir);
    }
  });

  it('first command auto-creates data dir', () => {
    const dir = makeTmpDir();
    try {
      const res = runJson(['get'], dir);
      assert.equal(res.success, true);
      assert.deepStrictEqual(res.data.cards, []);
      assert.equal(res.data.breadcrumbs, null);

      const dataDir = path.join(dir, '.planning', 'burrow');
      assert.ok(fs.existsSync(dataDir));

      runJson(['add', '--title', 'InitCard'], dir);
      const cardsPath = path.join(dir, '.planning', 'burrow', 'cards.json');
      assert.ok(fs.existsSync(cardsPath));
    } finally {
      removeTmpDir(dir);
    }
  });
});

describe('pretty-print output', () => {
  it('get with no args outputs human-readable text (not JSON)', () => {
    const dir = makeTmpDir();
    try {
      runJson(['add', '--title', 'PrettyTest'], dir);
      const output = runRaw(['get'], dir);
      // Should NOT be valid JSON
      let isJson = false;
      try { JSON.parse(output); isJson = true; } catch (e) { /* expected */ }
      assert.equal(isJson, false, 'Default output should not be JSON');
      // Should contain "burrow" breadcrumb
      assert.ok(output.includes('burrow'), 'Should contain burrow breadcrumb');
      // Should contain HR characters
      assert.ok(output.includes('\u2500'), 'Should contain horizontal rule characters');
    } finally {
      removeTmpDir(dir);
    }
  });

  it('get <id> outputs card detail with breadcrumbs', () => {
    const dir = makeTmpDir();
    try {
      const card = runJson(['add', '--title', 'DetailCard'], dir);
      const output = runRaw(['get', card.data.id], dir);
      assert.ok(output.includes('DetailCard'), 'Should contain card title');
      assert.ok(output.includes('burrow'), 'Should contain breadcrumb');
      assert.ok(output.includes('id:'), 'Should contain id: metadata line');
    } finally {
      removeTmpDir(dir);
    }
  });

  it('add outputs confirmation + card detail', () => {
    const dir = makeTmpDir();
    try {
      const output = runRaw(['add', '--title', 'NewCard'], dir);
      assert.ok(output.includes('\u2713'), 'Should contain checkmark');
      assert.ok(output.includes('Added card'), 'Should contain "Added card"');
      assert.ok(output.includes('NewCard'), 'Should contain card title');
    } finally {
      removeTmpDir(dir);
    }
  });

  it('delete outputs compact one-liner', () => {
    const dir = makeTmpDir();
    try {
      const card = runJson(['add', '--title', 'ToDelete'], dir);
      const output = runRaw(['delete', card.data.id], dir);
      assert.ok(output.includes('\u2713'), 'Should contain checkmark');
      assert.ok(output.includes('Deleted'), 'Should contain "Deleted"');
    } finally {
      removeTmpDir(dir);
    }
  });

  it('--json flag returns JSON on any command', () => {
    const dir = makeTmpDir();
    try {
      runJson(['add', '--title', 'JsonTest'], dir);
      const output = runRaw(['get', '--json'], dir);
      const parsed = JSON.parse(output.trim());
      assert.equal(parsed.success, true);
      assert.ok(parsed.data);
    } finally {
      removeTmpDir(dir);
    }
  });

  it('error without --json shows human-readable error', () => {
    const dir = makeTmpDir();
    try {
      const output = runRaw(['get', 'deadbeef'], dir);
      assert.ok(output.includes('\u2717'), 'Should contain cross-mark');
      assert.ok(!output.includes('NOT_FOUND'), 'Should not contain error code');
    } finally {
      removeTmpDir(dir);
    }
  });
});

describe('removed commands', () => {
  it('list command returns error', () => {
    const dir = makeTmpDir();
    try {
      const output = runRaw(['list'], dir);
      assert.ok(output.includes('Unknown command'), 'Should report unknown command');
    } finally {
      removeTmpDir(dir);
    }
  });

  it('children command returns error', () => {
    const dir = makeTmpDir();
    try {
      const output = runRaw(['children', 'someid'], dir);
      assert.ok(output.includes('Unknown command'), 'Should report unknown command');
    } finally {
      removeTmpDir(dir);
    }
  });
});
