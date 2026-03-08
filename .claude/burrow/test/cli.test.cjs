'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const CLI_PATH = path.resolve(__dirname, '..', 'burrow-tools.cjs');

/**
 * Run a CLI command and return the parsed JSON response.
 * @param {string[]} args - CLI arguments
 * @param {string} cwd - Working directory
 * @returns {object} Parsed JSON response
 */
function run(args, cwd) {
  try {
    const stdout = execFileSync('node', [CLI_PATH, ...args], {
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
    const res = run(['add', '--title', 'Root Card'], tmpDir);
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
    const parent = run(['add', '--title', 'Parent'], tmpDir);
    const child = run(['add', '--title', 'Child', '--parent', parent.data.id], tmpDir);
    assert.equal(child.success, true);
    assert.equal(child.data.title, 'Child');

    // Verify child is under parent via get (render array)
    const got = run(['get', parent.data.id], tmpDir);
    assert.equal(got.success, true);
    const childEntries = got.data.cards.filter((c) => c.depth === 1);
    assert.equal(childEntries.length, 1);
    assert.equal(childEntries[0].id, child.data.id);
  });

  it('adds card with --body', () => {
    const res = run(['add', '--title', 'WithBody', '--body', 'Hello world'], tmpDir);
    assert.equal(res.success, true);
    assert.equal(res.data.body, 'Hello world');
  });
});

describe('edit', () => {
  let tmpDir;
  before(() => { tmpDir = makeTmpDir(); });
  after(() => { removeTmpDir(tmpDir); });

  it('edits title', () => {
    const added = run(['add', '--title', 'Original'], tmpDir);
    const edited = run(['edit', added.data.id, '--title', 'New Title'], tmpDir);
    assert.equal(edited.success, true);
    assert.equal(edited.data.title, 'New Title');
  });

  it('edits body', () => {
    const added = run(['add', '--title', 'BodyCard'], tmpDir);
    const edited = run(['edit', added.data.id, '--body', 'Updated body'], tmpDir);
    assert.equal(edited.success, true);
    assert.equal(edited.data.body, 'Updated body');
  });
});

describe('delete', () => {
  let tmpDir;
  before(() => { tmpDir = makeTmpDir(); });
  after(() => { removeTmpDir(tmpDir); });

  it('deletes card', () => {
    const added = run(['add', '--title', 'ToDelete'], tmpDir);
    const del = run(['delete', added.data.id], tmpDir);
    assert.equal(del.success, true);
    assert.equal(del.data.id, added.data.id);

    // Verify it is gone via list (render array)
    const list = run(['list'], tmpDir);
    const ids = list.data.cards.map((c) => c.id);
    assert.ok(!ids.includes(added.data.id));
  });

  it('reports descendant count', () => {
    const dir = makeTmpDir();
    try {
      const parent = run(['add', '--title', 'Parent'], dir);
      run(['add', '--title', 'Child1', '--parent', parent.data.id], dir);
      run(['add', '--title', 'Child2', '--parent', parent.data.id], dir);
      const del = run(['delete', parent.data.id], dir);
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
    const a = run(['add', '--title', 'A'], tmpDir);
    const b = run(['add', '--title', 'B'], tmpDir);
    const moved = run(['move', a.data.id, '--parent', b.data.id], tmpDir);
    assert.equal(moved.success, true);

    // Verify A is now child of B via get (render array)
    const got = run(['get', b.data.id], tmpDir);
    const childIds = got.data.cards.filter((c) => c.depth === 1).map((c) => c.id);
    assert.ok(childIds.includes(a.data.id));
  });

  it('moves card to root', () => {
    const dir = makeTmpDir();
    try {
      const parent = run(['add', '--title', 'Parent'], dir);
      const child = run(['add', '--title', 'Child', '--parent', parent.data.id], dir);
      const moved = run(['move', child.data.id, '--parent', ''], dir);
      assert.equal(moved.success, true);

      // Verify child is now at root via list (render array)
      const list = run(['list'], dir);
      const rootIds = list.data.cards.map((c) => c.id);
      assert.ok(rootIds.includes(child.data.id));
    } finally {
      removeTmpDir(dir);
    }
  });

  it('rejects cycle', () => {
    const dir = makeTmpDir();
    try {
      const a = run(['add', '--title', 'A'], dir);
      const b = run(['add', '--title', 'B', '--parent', a.data.id], dir);
      // Try to move A under B (would create cycle)
      const res = run(['move', a.data.id, '--parent', b.data.id], dir);
      assert.equal(res.success, false);
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
    run(['add', '--title', 'GetRoot1'], tmpDir);
    run(['add', '--title', 'GetRoot2'], tmpDir);
    const res = run(['get'], tmpDir);
    assert.equal(res.success, true);
    assert.equal(res.data.breadcrumbs, null);
    assert.ok(Array.isArray(res.data.cards));
    assert.ok(res.data.cards.length >= 2);
  });

  it('get <id> returns focused view with breadcrumbs and card at depth 0', () => {
    const dir = makeTmpDir();
    try {
      const parent = run(['add', '--title', 'Parent'], dir);
      const child = run(['add', '--title', 'Child', '--parent', parent.data.id], dir);
      const res = run(['get', child.data.id], dir);
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
      const a = run(['add', '--title', 'A'], dir);
      const b = run(['add', '--title', 'B', '--parent', a.data.id], dir);
      run(['add', '--title', 'C', '--parent', b.data.id], dir);
      const res = run(['get', a.data.id, '--depth', '2'], dir);
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
      const a = run(['add', '--title', 'A'], dir);
      const b = run(['add', '--title', 'B', '--parent', a.data.id], dir);
      run(['add', '--title', 'C', '--parent', b.data.id], dir);
      const res = run(['get', '--depth', '0'], dir);
      assert.equal(res.success, true);
      assert.equal(res.data.cards.length, 3); // A, B, C
    } finally {
      removeTmpDir(dir);
    }
  });

  it('get <id> --depth 0 returns full subtree from that card', () => {
    const dir = makeTmpDir();
    try {
      const a = run(['add', '--title', 'A'], dir);
      const b = run(['add', '--title', 'B', '--parent', a.data.id], dir);
      run(['add', '--title', 'C', '--parent', b.data.id], dir);
      const res = run(['get', a.data.id, '--depth', '0'], dir);
      assert.equal(res.success, true);
      assert.equal(res.data.cards.length, 3); // A at 0, B at 1, C at 2
    } finally {
      removeTmpDir(dir);
    }
  });

  it('render entries have correct shape', () => {
    const dir = makeTmpDir();
    try {
      run(['add', '--title', 'ShapeTest', '--body', 'test body'], dir);
      const res = run(['get'], dir);
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
    const res = run(['get', 'deadbeef'], tmpDir);
    assert.equal(res.success, false);
    assert.equal(res.code, 'NOT_FOUND');
  });

  it('get --include-archived includes archived cards', () => {
    const dir = makeTmpDir();
    try {
      const card = run(['add', '--title', 'ArchTest'], dir);
      run(['archive', card.data.id], dir);
      const res = run(['get', '--include-archived'], dir);
      const ids = res.data.cards.map((c) => c.id);
      assert.ok(ids.includes(card.data.id));
    } finally {
      removeTmpDir(dir);
    }
  });

  it('get --archived-only shows only archived', () => {
    const dir = makeTmpDir();
    try {
      const card = run(['add', '--title', 'ArchOnly1'], dir);
      run(['add', '--title', 'Active1'], dir);
      run(['archive', card.data.id], dir);
      const res = run(['get', '--archived-only'], dir);
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
      const parent = run(['add', '--title', 'Parent'], dir);
      run(['add', '--title', 'Child', '--parent', parent.data.id], dir);
      const res = run(['archive', parent.data.id], dir);
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
      const card = run(['add', '--title', 'ToArchive'], dir);
      run(['archive', card.data.id], dir);
      const res = run(['get'], dir);
      const ids = res.data.cards.map((c) => c.id);
      assert.ok(!ids.includes(card.data.id));
    } finally {
      removeTmpDir(dir);
    }
  });

  it('get --include-archived shows the archived card', () => {
    const dir = makeTmpDir();
    try {
      const card = run(['add', '--title', 'ArchVisible'], dir);
      run(['archive', card.data.id], dir);
      const res = run(['get', '--include-archived'], dir);
      const ids = res.data.cards.map((c) => c.id);
      assert.ok(ids.includes(card.data.id));
    } finally {
      removeTmpDir(dir);
    }
  });

  it('missing id returns NOT_FOUND', () => {
    const dir = makeTmpDir();
    try {
      const res = run(['archive', 'deadbeef'], dir);
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
      const card = run(['add', '--title', 'Unarch'], dir);
      run(['archive', card.data.id], dir);
      const res = run(['unarchive', card.data.id], dir);
      assert.equal(res.success, true);
      assert.equal(res.data.id, card.data.id);
    } finally {
      removeTmpDir(dir);
    }
  });

  it('card reappears in default get view', () => {
    const dir = makeTmpDir();
    try {
      const card = run(['add', '--title', 'Reappear'], dir);
      run(['archive', card.data.id], dir);
      run(['unarchive', card.data.id], dir);
      const res = run(['get'], dir);
      const ids = res.data.cards.map((c) => c.id);
      assert.ok(ids.includes(card.data.id));
    } finally {
      removeTmpDir(dir);
    }
  });

  it('missing id returns NOT_FOUND', () => {
    const dir = makeTmpDir();
    try {
      const res = run(['unarchive', 'deadbeef'], dir);
      assert.equal(res.success, false);
      assert.equal(res.code, 'NOT_FOUND');
    } finally {
      removeTmpDir(dir);
    }
  });
});

describe('alias routing', () => {
  it('list returns same as get with no args', () => {
    const dir = makeTmpDir();
    try {
      run(['add', '--title', 'AliasTest1'], dir);
      run(['add', '--title', 'AliasTest2'], dir);
      const getRes = run(['get'], dir);
      const listRes = run(['list'], dir);
      assert.deepStrictEqual(getRes.data, listRes.data);
    } finally {
      removeTmpDir(dir);
    }
  });

  it('dump returns same as get --depth 0', () => {
    const dir = makeTmpDir();
    try {
      const a = run(['add', '--title', 'DumpA'], dir);
      run(['add', '--title', 'DumpB', '--parent', a.data.id], dir);
      const getRes = run(['get', '--depth', '0'], dir);
      const dumpRes = run(['dump'], dir);
      assert.deepStrictEqual(getRes.data, dumpRes.data);
    } finally {
      removeTmpDir(dir);
    }
  });

  it('children <id> returns same as get <id>', () => {
    const dir = makeTmpDir();
    try {
      const parent = run(['add', '--title', 'ChildAlias'], dir);
      run(['add', '--title', 'C1', '--parent', parent.data.id], dir);
      const getRes = run(['get', parent.data.id], dir);
      const childRes = run(['children', parent.data.id], dir);
      assert.deepStrictEqual(getRes.data, childRes.data);
    } finally {
      removeTmpDir(dir);
    }
  });

  it('path <id> returns ancestry array [{id, title}, ...]', () => {
    const dir = makeTmpDir();
    try {
      const a = run(['add', '--title', 'PathA'], dir);
      const b = run(['add', '--title', 'PathB', '--parent', a.data.id], dir);
      const res = run(['path', b.data.id], dir);
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
    const a = run(['add', '--title', 'A'], tmpDir);
    const b = run(['add', '--title', 'B', '--parent', a.data.id], tmpDir);
    const c = run(['add', '--title', 'C', '--parent', b.data.id], tmpDir);
    const res = run(['path', c.data.id], tmpDir);
    assert.equal(res.success, true);
    assert.equal(res.data.length, 3);
    assert.equal(res.data[0].id, a.data.id);
    assert.equal(res.data[0].title, 'A');
    assert.equal(res.data[1].id, b.data.id);
    assert.equal(res.data[2].id, c.data.id);
  });

  it('errors on missing ID', () => {
    const res = run(['path', 'deadbeef'], tmpDir);
    assert.equal(res.success, false);
    assert.equal(res.code, 'NOT_FOUND');
  });
});

describe('error handling', () => {
  it('unknown command returns error JSON', () => {
    const dir = makeTmpDir();
    try {
      const res = run(['bogus'], dir);
      assert.equal(res.success, false);
      assert.ok(res.error.includes('Unknown command'));
    } finally {
      removeTmpDir(dir);
    }
  });

  it('first command auto-creates data dir', () => {
    const dir = makeTmpDir();
    try {
      const res = run(['list'], dir);
      assert.equal(res.success, true);
      assert.deepStrictEqual(res.data.cards, []);
      assert.equal(res.data.breadcrumbs, null);

      const dataDir = path.join(dir, '.planning', 'burrow');
      assert.ok(fs.existsSync(dataDir));

      run(['add', '--title', 'InitCard'], dir);
      const cardsPath = path.join(dir, '.planning', 'burrow', 'cards.json');
      assert.ok(fs.existsSync(cardsPath));
    } finally {
      removeTmpDir(dir);
    }
  });
});
