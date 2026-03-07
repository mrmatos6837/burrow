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

  it('adds card at root', () => {
    const res = run(['add', '--title', 'Root Card'], tmpDir);
    assert.equal(res.success, true);
    assert.equal(res.data.title, 'Root Card');
    assert.match(res.data.id, /^[0-9a-f]{8}$/);
    assert.equal(res.data.position, 0);
    assert.ok(res.data.created);
    assert.ok(res.data.children);
    assert.equal(res.data.children.ordering, 'custom');
    assert.deepEqual(res.data.children.cards, []);
  });

  it('adds card as child', () => {
    const parent = run(['add', '--title', 'Parent'], tmpDir);
    const child = run(['add', '--title', 'Child', '--parent', parent.data.id], tmpDir);
    assert.equal(child.success, true);
    assert.equal(child.data.title, 'Child');

    // Verify child is under parent
    const got = run(['get', parent.data.id], tmpDir);
    assert.equal(got.data.children.cards.length, 1);
    assert.equal(got.data.children.cards[0].id, child.data.id);
  });

  it('adds card with --position', () => {
    const dir = makeTmpDir();
    try {
      run(['add', '--title', 'First'], dir);
      run(['add', '--title', 'Second'], dir);
      const third = run(['add', '--title', 'Third', '--position', '0'], dir);
      assert.equal(third.data.position, 0);
    } finally {
      removeTmpDir(dir);
    }
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

  it('edits notes', () => {
    const added = run(['add', '--title', 'NoteCard'], tmpDir);
    const edited = run(['edit', added.data.id, '--notes', 'Updated notes'], tmpDir);
    assert.equal(edited.success, true);
    assert.equal(edited.data.notes, 'Updated notes');
  });

  it('edits ordering', () => {
    const added = run(['add', '--title', 'OrderCard'], tmpDir);
    const edited = run(['edit', added.data.id, '--ordering', 'alpha-asc'], tmpDir);
    assert.equal(edited.success, true);
    assert.equal(edited.data.children.ordering, 'alpha-asc');
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

    // Verify it is gone
    const list = run(['list'], tmpDir);
    const ids = list.data.map((i) => i.id);
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

    // Verify A is now child of B
    const got = run(['get', b.data.id], tmpDir);
    const childIds = got.data.children.cards.map((i) => i.id);
    assert.ok(childIds.includes(a.data.id));
  });

  it('moves card to root', () => {
    const dir = makeTmpDir();
    try {
      const parent = run(['add', '--title', 'Parent'], dir);
      const child = run(['add', '--title', 'Child', '--parent', parent.data.id], dir);
      const moved = run(['move', child.data.id, '--parent', ''], dir);
      assert.equal(moved.success, true);

      // Verify child is now at root
      const list = run(['list'], dir);
      const rootIds = list.data.map((i) => i.id);
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

describe('get', () => {
  let tmpDir;
  before(() => { tmpDir = makeTmpDir(); });
  after(() => { removeTmpDir(tmpDir); });

  it('returns card with children', () => {
    const parent = run(['add', '--title', 'Parent'], tmpDir);
    run(['add', '--title', 'Child1', '--parent', parent.data.id], tmpDir);
    run(['add', '--title', 'Child2', '--parent', parent.data.id], tmpDir);
    const got = run(['get', parent.data.id], tmpDir);
    assert.equal(got.success, true);
    assert.equal(got.data.children.cards.length, 2);
  });

  it('errors on missing ID', () => {
    const res = run(['get', 'deadbeef'], tmpDir);
    assert.equal(res.success, false);
    assert.equal(res.code, 'NOT_FOUND');
  });
});

describe('children', () => {
  let tmpDir;
  before(() => { tmpDir = makeTmpDir(); });
  after(() => { removeTmpDir(tmpDir); });

  it('returns ordered children', () => {
    const parent = run(['add', '--title', 'Parent'], tmpDir);
    run(['add', '--title', 'C1', '--parent', parent.data.id], tmpDir);
    run(['add', '--title', 'C2', '--parent', parent.data.id], tmpDir);
    run(['add', '--title', 'C3', '--parent', parent.data.id], tmpDir);
    const res = run(['children', parent.data.id], tmpDir);
    assert.equal(res.success, true);
    assert.equal(res.data.length, 3);
    // Verify position order
    assert.equal(res.data[0].position, 0);
    assert.equal(res.data[1].position, 1);
    assert.equal(res.data[2].position, 2);
  });
});

describe('list', () => {
  let tmpDir;
  before(() => { tmpDir = makeTmpDir(); });
  after(() => { removeTmpDir(tmpDir); });

  it('returns root cards with no arg', () => {
    run(['add', '--title', 'R1'], tmpDir);
    run(['add', '--title', 'R2'], tmpDir);
    const res = run(['list'], tmpDir);
    assert.equal(res.success, true);
    assert.ok(res.data.length >= 2);
  });

  it('returns children with parentId', () => {
    const dir = makeTmpDir();
    try {
      const parent = run(['add', '--title', 'Parent'], dir);
      const child = run(['add', '--title', 'Child', '--parent', parent.data.id], dir);
      const res = run(['list', parent.data.id], dir);
      assert.equal(res.success, true);
      assert.equal(res.data.length, 1);
      assert.equal(res.data[0].id, child.data.id);
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
      assert.deepEqual(res.data, []);

      // Verify cards.json was NOT created (list is read-only, only ensures dir)
      // But the data dir should exist
      const dataDir = path.join(dir, '.planning', 'burrow');
      assert.ok(fs.existsSync(dataDir));

      // After a write command, cards.json should exist
      run(['add', '--title', 'InitCard'], dir);
      const cardsPath = path.join(dir, '.planning', 'burrow', 'cards.json');
      assert.ok(fs.existsSync(cardsPath));
    } finally {
      removeTmpDir(dir);
    }
  });
});
