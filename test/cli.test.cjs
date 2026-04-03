'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const CLI_PATH = path.resolve(__dirname, '..', '.claude', 'burrow', 'burrow-tools.cjs');

/**
 * Run a CLI command and return the raw stdout string.
 * @param {string[]} args - CLI arguments
 * @param {string} cwd - Working directory
 * @returns {string} Raw stdout
 */
function run(args, cwd) {
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
 * Load and parse cards.json from the given directory.
 * @param {string} cwd - Working directory
 * @returns {object} Parsed data with .cards array
 */
function loadData(cwd) {
  const filePath = path.join(cwd, '.planning', 'burrow', 'cards.json');
  if (!fs.existsSync(filePath)) return { cards: [] };
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * Recursively find a card by title in the tree.
 * @param {Array} cards - Array of card objects
 * @param {string} title - Title to search for
 * @returns {object|null} Card object or null
 */
function findByTitle(cards, title) {
  for (const card of cards) {
    if (card.title === title) return card;
    if (card.children && card.children.length) {
      const found = findByTitle(card.children, title);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Recursively find a card by ID in the tree.
 * @param {Array} cards - Array of card objects
 * @param {string} id - ID to search for
 * @returns {object|null} Card object or null
 */
function findById(cards, id) {
  for (const card of cards) {
    if (card.id === id) return card;
    if (card.children && card.children.length) {
      const found = findById(card.children, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Add a card via CLI and return its data from cards.json.
 * @param {string} title - Card title
 * @param {string} cwd - Working directory
 * @param {object} [opts] - Optional {parent, body}
 * @returns {object} Card object from cards.json
 */
function addCard(title, cwd, opts) {
  const args = ['add', '--title', title];
  if (opts?.parent) args.push('--parent', opts.parent);
  if (opts?.body) args.push('--body', opts.body);
  run(args, cwd);
  const data = loadData(cwd);
  return findByTitle(data.cards, title);
}

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'burrow-cli-'));
}

function removeTmpDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe('add', () => {
  let tmpDir;
  before(() => { tmpDir = makeTmpDir(); });
  after(() => { removeTmpDir(tmpDir); });

  it('adds card at root', () => {
    const card = addCard('Root Card', tmpDir);
    assert.ok(card);
    assert.equal(card.title, 'Root Card');
    assert.match(card.id, /^[0-9a-f]{8}$/);
    assert.equal(card.body, '');
    assert.deepEqual(card.children, []);
    assert.ok(card.created);
  });

  it('adds card as child', () => {
    const parent = addCard('Parent', tmpDir);
    const child = addCard('Child', tmpDir, { parent: parent.id });
    assert.ok(child);

    // Verify child is under parent in cards.json
    const data = loadData(tmpDir);
    const parentCard = findById(data.cards, parent.id);
    assert.equal(parentCard.children.length, 1);
    assert.equal(parentCard.children[0].id, child.id);
  });

  it('adds card with --body', () => {
    const card = addCard('WithBody', tmpDir, { body: 'Hello world' });
    assert.equal(card.body, 'Hello world');
  });

  it('pretty-print output contains checkmark and title', () => {
    const output = run(['add', '--title', 'PrettyAdd'], tmpDir);
    assert.ok(output.includes('\u2713'), 'Should contain checkmark');
    assert.ok(output.includes('Added card'), 'Should contain "Added card"');
    assert.ok(output.includes('PrettyAdd'), 'Should contain card title');
  });
});

describe('edit', () => {
  let tmpDir;
  before(() => { tmpDir = makeTmpDir(); });
  after(() => { removeTmpDir(tmpDir); });

  it('edits title', () => {
    const card = addCard('Original', tmpDir);
    run(['edit', card.id, '--title', 'New Title'], tmpDir);
    const data = loadData(tmpDir);
    const edited = findById(data.cards, card.id);
    assert.equal(edited.title, 'New Title');
  });

  it('edits body', () => {
    const card = addCard('BodyCard', tmpDir);
    run(['edit', card.id, '--body', 'Updated body'], tmpDir);
    const data = loadData(tmpDir);
    const edited = findById(data.cards, card.id);
    assert.equal(edited.body, 'Updated body');
  });
});

describe('remove', () => {
  let tmpDir;
  before(() => { tmpDir = makeTmpDir(); });
  after(() => { removeTmpDir(tmpDir); });

  it('removes card', () => {
    const card = addCard('ToRemove', tmpDir);
    run(['remove', card.id], tmpDir);
    const data = loadData(tmpDir);
    const found = findById(data.cards, card.id);
    assert.equal(found, null, 'Removed card should not exist');
  });

  it('pretty-print contains Removed', () => {
    const card = addCard('RemoveMe', tmpDir);
    const output = run(['remove', card.id], tmpDir);
    assert.ok(output.includes('\u2713'), 'Should contain checkmark');
    assert.ok(output.includes('Removed'), 'Should contain "Removed"');
  });

  it('reports descendant count', () => {
    const dir = makeTmpDir();
    try {
      const parent = addCard('Parent', dir);
      addCard('Child1', dir, { parent: parent.id });
      addCard('Child2', dir, { parent: parent.id });
      const output = run(['remove', parent.id], dir);
      assert.ok(output.includes('2 children'), 'Should report descendant count');
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
    const a = addCard('A', tmpDir);
    const b = addCard('B', tmpDir);
    run(['move', a.id, '--to', b.id], tmpDir);
    const data = loadData(tmpDir);
    const bCard = findById(data.cards, b.id);
    const childIds = bCard.children.map((c) => c.id);
    assert.ok(childIds.includes(a.id));
  });

  it('moves card to root', () => {
    const dir = makeTmpDir();
    try {
      const parent = addCard('Parent', dir);
      const child = addCard('Child', dir, { parent: parent.id });
      run(['move', child.id, '--to', ''], dir);
      const data = loadData(dir);
      const rootIds = data.cards.map((c) => c.id);
      assert.ok(rootIds.includes(child.id), 'Moved card should appear at root');
    } finally {
      removeTmpDir(dir);
    }
  });

  it('rejects cycle', () => {
    const dir = makeTmpDir();
    try {
      const a = addCard('A', dir);
      const b = addCard('B', dir, { parent: a.id });
      const output = run(['move', a.id, '--to', b.id], dir);
      assert.ok(output.includes('cycle') || output.includes('\u2717'), 'Should reject cycle');
    } finally {
      removeTmpDir(dir);
    }
  });

  it('pretty-print shows source and destination', () => {
    const dir = makeTmpDir();
    try {
      const parent = addCard('Destination', dir);
      const child = addCard('Traveler', dir);
      const output = run(['move', child.id, '--to', parent.id], dir);
      assert.ok(output.includes('\u2713'), 'Should contain checkmark');
      assert.ok(output.includes('Moved'), 'Should contain "Moved"');
      assert.ok(output.includes('Destination'), 'Should contain destination parent title');
      assert.ok(output.includes('\u2192'), 'Should contain arrow');
    } finally {
      removeTmpDir(dir);
    }
  });
});

describe('read command', () => {
  let tmpDir;
  before(() => { tmpDir = makeTmpDir(); });
  after(() => { removeTmpDir(tmpDir); });

  it('read with no args outputs human-readable root view', () => {
    addCard('ReadRoot1', tmpDir);
    addCard('ReadRoot2', tmpDir);
    const output = run(['read'], tmpDir);
    assert.ok(output.includes('burrow'), 'Should contain burrow breadcrumb');
    assert.ok(output.includes('\u2500'), 'Should contain horizontal rule characters');
    assert.ok(output.includes('ReadRoot1'), 'Should contain card title');
    assert.ok(output.includes('ReadRoot2'), 'Should contain card title');
  });

  it('read <id> outputs card detail with breadcrumbs', () => {
    const card = addCard('DetailCard', tmpDir);
    const output = run(['read', card.id], tmpDir);
    assert.ok(output.includes('DetailCard'), 'Should contain card title');
    assert.ok(output.includes('burrow'), 'Should contain breadcrumb');
    assert.ok(output.includes('id:'), 'Should contain id: metadata line');
  });

  it('read <id> --depth 2 shows grandchild', () => {
    const dir = makeTmpDir();
    try {
      const a = addCard('Root Node', dir);
      const b = addCard('Child Node', dir, { parent: a.id });
      addCard('Grandchild Node', dir, { parent: b.id });
      const output = run(['read', a.id, '--depth', '2'], dir);
      assert.ok(output.includes('Child Node'), 'Should show child');
      assert.ok(output.includes('Grandchild Node'), 'Should show grandchild');
      assert.ok(output.includes('\u2502') || output.includes('\u2514') || output.includes('\u251c'),
        'Should contain box-drawing characters');
    } finally {
      removeTmpDir(dir);
    }
  });

  it('errors on missing ID', () => {
    const output = run(['read', 'deadbeef'], tmpDir);
    assert.ok(output.includes('\u2717'), 'Should contain cross-mark');
  });

  it('read --include-archived includes archived cards', () => {
    const dir = makeTmpDir();
    try {
      const card = addCard('ArchTest', dir);
      run(['archive', card.id], dir);
      const output = run(['read', '--include-archived'], dir);
      assert.ok(output.includes('ArchTest'), 'Archived card should appear with --include-archived');
    } finally {
      removeTmpDir(dir);
    }
  });

  it('read --archived-only shows only archived', () => {
    const dir = makeTmpDir();
    try {
      const card = addCard('ArchOnly1', dir);
      addCard('Active1', dir);
      run(['archive', card.id], dir);
      const output = run(['read', '--archived-only'], dir);
      assert.ok(output.includes('ArchOnly1'), 'Should show archived card');
    } finally {
      removeTmpDir(dir);
    }
  });
});

describe('archive command', () => {
  it('archive marks card as archived in data', () => {
    const dir = makeTmpDir();
    try {
      const parent = addCard('Parent', dir);
      addCard('Child', dir, { parent: parent.id });
      const output = run(['archive', parent.id], dir);
      assert.ok(output.includes('\u2713'), 'Should contain checkmark');

      const data = loadData(dir);
      const card = findById(data.cards, parent.id);
      assert.equal(card.archived, true);
    } finally {
      removeTmpDir(dir);
    }
  });

  it('archived card excluded from default read', () => {
    const dir = makeTmpDir();
    try {
      const card = addCard('ToArchive', dir);
      run(['archive', card.id], dir);
      const output = run(['read'], dir);
      assert.ok(!output.includes('ToArchive'), 'Archived card should not appear in default read');
    } finally {
      removeTmpDir(dir);
    }
  });

  it('missing id returns error', () => {
    const dir = makeTmpDir();
    try {
      const output = run(['archive', 'deadbeef'], dir);
      assert.ok(output.includes('\u2717'), 'Should contain cross-mark');
    } finally {
      removeTmpDir(dir);
    }
  });
});

describe('unarchive command', () => {
  it('unarchive restores card', () => {
    const dir = makeTmpDir();
    try {
      const card = addCard('Unarch', dir);
      run(['archive', card.id], dir);
      run(['unarchive', card.id], dir);
      const data = loadData(dir);
      const restored = findById(data.cards, card.id);
      assert.equal(restored.archived, false);
    } finally {
      removeTmpDir(dir);
    }
  });

  it('card reappears in default read', () => {
    const dir = makeTmpDir();
    try {
      const card = addCard('Reappear', dir);
      run(['archive', card.id], dir);
      run(['unarchive', card.id], dir);
      const output = run(['read'], dir);
      assert.ok(output.includes('Reappear'), 'Unarchived card should reappear');
    } finally {
      removeTmpDir(dir);
    }
  });

  it('missing id returns error', () => {
    const dir = makeTmpDir();
    try {
      const output = run(['unarchive', 'deadbeef'], dir);
      assert.ok(output.includes('\u2717'), 'Should contain cross-mark');
    } finally {
      removeTmpDir(dir);
    }
  });
});

describe('dump', () => {
  it('dump shows full tree', () => {
    const dir = makeTmpDir();
    try {
      const a = addCard('DumpA', dir);
      addCard('DumpB', dir, { parent: a.id });
      const output = run(['dump'], dir);
      assert.ok(output.includes('DumpA'), 'Should contain root card');
      assert.ok(output.includes('DumpB'), 'Should contain nested card');
    } finally {
      removeTmpDir(dir);
    }
  });

  it('dump defaults to full:true (no truncation marker)', () => {
    const dir = makeTmpDir();
    try {
      addCard('DumpCard', dir, { body: 'Some body content' });
      const output = run(['dump'], dir);
      assert.ok(!output.includes('(truncated'), 'dump should not contain truncation marker by default');
      assert.ok(!output.includes('use --full'), 'dump should not suggest --full flag');
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
    const a = addCard('PathA', tmpDir);
    const b = addCard('PathB', tmpDir, { parent: a.id });
    const c = addCard('PathC', tmpDir, { parent: b.id });
    const output = run(['path', c.id], tmpDir);
    assert.ok(output.includes('PathA'), 'Should contain ancestor');
    assert.ok(output.includes('PathB'), 'Should contain parent');
    assert.ok(output.includes('PathC'), 'Should contain card itself');
  });

  it('errors on missing ID', () => {
    const output = run(['path', 'deadbeef'], tmpDir);
    assert.ok(output.includes('\u2717'), 'Should contain cross-mark');
  });
});

describe('find', () => {
  it('finds card by title substring', () => {
    const dir = makeTmpDir();
    try {
      addCard('Login Bug', dir);
      addCard('Signup Flow', dir);
      const output = run(['find', 'login'], dir);
      assert.ok(output.includes('Login Bug'), 'Should find matching card');
      assert.ok(output.includes('1 match'), 'Should report match count');
    } finally {
      removeTmpDir(dir);
    }
  });

  it('find is case-insensitive', () => {
    const dir = makeTmpDir();
    try {
      addCard('OAuth Token', dir);
      const output = run(['find', 'oauth'], dir);
      assert.ok(output.includes('OAuth Token'), 'Should match case-insensitively');
    } finally {
      removeTmpDir(dir);
    }
  });

  it('find returns multiple matches', () => {
    const dir = makeTmpDir();
    try {
      addCard('Auth Login', dir);
      addCard('Auth Signup', dir);
      addCard('Unrelated', dir);
      const output = run(['find', 'auth'], dir);
      assert.ok(output.includes('Auth Login'), 'Should find first match');
      assert.ok(output.includes('Auth Signup'), 'Should find second match');
      assert.ok(output.includes('2 match'), 'Should report 2 matches');
    } finally {
      removeTmpDir(dir);
    }
  });

  it('find reports no matches', () => {
    const dir = makeTmpDir();
    try {
      addCard('Something', dir);
      const output = run(['find', 'nonexistent'], dir);
      assert.ok(output.includes('No cards matching'), 'Should report no matches');
    } finally {
      removeTmpDir(dir);
    }
  });

  it('find with no query returns error', () => {
    const dir = makeTmpDir();
    try {
      const output = run(['find'], dir);
      assert.ok(output.includes('\u2717'), 'Should contain cross-mark');
    } finally {
      removeTmpDir(dir);
    }
  });

  it('find matches nested cards', () => {
    const dir = makeTmpDir();
    try {
      const parent = addCard('Bugs', dir);
      addCard('Login Crash', dir, { parent: parent.id });
      const output = run(['find', 'crash'], dir);
      assert.ok(output.includes('Login Crash'), 'Should find nested card');
    } finally {
      removeTmpDir(dir);
    }
  });
});

describe('error handling', () => {
  it('unknown command returns error', () => {
    const dir = makeTmpDir();
    try {
      const output = run(['bogus'], dir);
      assert.ok(output.includes('Unknown command'), 'Should report unknown command');
    } finally {
      removeTmpDir(dir);
    }
  });

  it('first command auto-creates data dir', () => {
    const dir = makeTmpDir();
    try {
      run(['read'], dir);
      const dataDir = path.join(dir, '.planning', 'burrow');
      assert.ok(fs.existsSync(dataDir));
    } finally {
      removeTmpDir(dir);
    }
  });
});

describe('add --at', () => {
  it('inserts at beginning with --at 0', () => {
    const dir = makeTmpDir();
    try {
      addCard('First', dir);
      addCard('Second', dir);
      run(['add', '--title', 'Inserted', '--at', '0'], dir);
      const data = loadData(dir);
      assert.equal(data.cards[0].title, 'Inserted');
      assert.equal(data.cards[1].title, 'First');
      assert.equal(data.cards[2].title, 'Second');
    } finally {
      removeTmpDir(dir);
    }
  });

  it('inserts at position in parent with --parent --at', () => {
    const dir = makeTmpDir();
    try {
      const parent = addCard('Parent', dir);
      addCard('ChildA', dir, { parent: parent.id });
      addCard('ChildB', dir, { parent: parent.id });
      run(['add', '--title', 'Inserted', '--parent', parent.id, '--at', '0'], dir);
      const data = loadData(dir);
      const p = findById(data.cards, parent.id);
      assert.equal(p.children[0].title, 'Inserted');
      assert.equal(p.children[1].title, 'ChildA');
      assert.equal(p.children[2].title, 'ChildB');
    } finally {
      removeTmpDir(dir);
    }
  });

  it('appends to root without --at (backward compat)', () => {
    const dir = makeTmpDir();
    try {
      addCard('First', dir);
      run(['add', '--title', 'Second'], dir);
      const data = loadData(dir);
      assert.equal(data.cards[data.cards.length - 1].title, 'Second');
    } finally {
      removeTmpDir(dir);
    }
  });
});

describe('move --at', () => {
  it('reorders within current parent with --at 0 (no --to)', () => {
    const dir = makeTmpDir();
    try {
      const a = addCard('A', dir);
      const b = addCard('B', dir);
      const c = addCard('C', dir);
      // Move C to position 0 among root siblings
      run(['move', c.id, '--at', '0'], dir);
      const data = loadData(dir);
      assert.equal(data.cards[0].title, 'C');
      assert.equal(data.cards[1].title, 'A');
      assert.equal(data.cards[2].title, 'B');
    } finally {
      removeTmpDir(dir);
    }
  });

  it('places at position in destination with --to --at', () => {
    const dir = makeTmpDir();
    try {
      const parent = addCard('Parent', dir);
      addCard('ChildA', dir, { parent: parent.id });
      addCard('ChildB', dir, { parent: parent.id });
      const outsider = addCard('Outsider', dir);
      run(['move', outsider.id, '--to', parent.id, '--at', '1'], dir);
      const data = loadData(dir);
      const p = findById(data.cards, parent.id);
      assert.equal(p.children[0].title, 'ChildA');
      assert.equal(p.children[1].title, 'Outsider');
      assert.equal(p.children[2].title, 'ChildB');
    } finally {
      removeTmpDir(dir);
    }
  });
});

describe('removed commands', () => {
  it('get command returns error', () => {
    const dir = makeTmpDir();
    try {
      const output = run(['get'], dir);
      assert.ok(output.includes('Unknown command'), 'Should report unknown command');
    } finally {
      removeTmpDir(dir);
    }
  });

  it('delete command returns error', () => {
    const dir = makeTmpDir();
    try {
      const output = run(['delete', 'someid'], dir);
      assert.ok(output.includes('Unknown command'), 'Should report unknown command');
    } finally {
      removeTmpDir(dir);
    }
  });
});

describe('input validation (VALID-01, VALID-02, VALID-03)', () => {
  it('read --depth abc produces error mentioning depth and number/numeric', () => {
    const dir = makeTmpDir();
    try {
      const output = run(['read', '--depth', 'abc'], dir);
      assert.ok(output.includes('\u2717'), 'Should contain cross-mark');
      assert.ok(
        output.toLowerCase().includes('depth') &&
        (output.toLowerCase().includes('number') || output.toLowerCase().includes('numeric')),
        `Output should mention depth and number/numeric, got: ${output}`
      );
    } finally {
      removeTmpDir(dir);
    }
  });

  it('add --at -1 produces error about negative position', () => {
    const dir = makeTmpDir();
    try {
      const output = run(['add', '--title', 'Test', '--at', '-1'], dir);
      assert.ok(output.includes('\u2717'), 'Should contain cross-mark');
      assert.ok(
        output.toLowerCase().includes('negative') || output.toLowerCase().includes('non-negative') || output.toLowerCase().includes('at'),
        `Output should mention negative or --at, got: ${output}`
      );
    } finally {
      removeTmpDir(dir);
    }
  });

  it('move --at -1 produces error about negative position', () => {
    const dir = makeTmpDir();
    try {
      const card = addCard('MoveCard', dir);
      const output = run(['move', card.id, '--at', '-1'], dir);
      assert.ok(output.includes('\u2717'), 'Should contain cross-mark');
      assert.ok(
        output.toLowerCase().includes('negative') || output.toLowerCase().includes('non-negative') || output.toLowerCase().includes('at'),
        `Output should mention negative or --at, got: ${output}`
      );
    } finally {
      removeTmpDir(dir);
    }
  });

  it('read --bogus-flag produces error (strict mode)', () => {
    const dir = makeTmpDir();
    try {
      const output = run(['read', '--bogus-flag'], dir);
      assert.ok(output.includes('\u2717'), 'Should contain cross-mark');
    } finally {
      removeTmpDir(dir);
    }
  });

  it('add --bogus-flag --title test produces error (strict mode)', () => {
    const dir = makeTmpDir();
    try {
      const output = run(['add', '--bogus-flag', '--title', 'test'], dir);
      assert.ok(output.includes('\u2717'), 'Should contain cross-mark');
    } finally {
      removeTmpDir(dir);
    }
  });
});

// --- config command tests ---

function makeConfigDir() {
  const dir = makeTmpDir();
  const burrowDir = path.join(dir, '.planning', 'burrow');
  fs.mkdirSync(burrowDir, { recursive: true });
  fs.writeFileSync(
    path.join(burrowDir, 'config.json'),
    JSON.stringify({ loadMode: 'auto', autoThreshold: 4000 }, null, 2) + '\n',
    'utf-8'
  );
  return dir;
}

describe('config command', () => {
  it('config list prints config values when config.json exists', () => {
    const dir = makeConfigDir();
    try {
      const output = run(['config', 'list'], dir);
      assert.ok(output.includes('burrow config'), 'Should contain "burrow config" header');
      assert.ok(output.includes('loadMode'), 'Should contain loadMode key');
      assert.ok(output.includes('autoThreshold'), 'Should contain autoThreshold key');
    } finally {
      removeTmpDir(dir);
    }
  });

  it('config get loadMode prints raw value "auto"', () => {
    const dir = makeConfigDir();
    try {
      const output = run(['config', 'get', 'loadMode'], dir);
      assert.ok(output.trim() === 'auto', `Expected "auto", got: "${output.trim()}"`);
    } finally {
      removeTmpDir(dir);
    }
  });

  it('config set loadMode index prints confirmation and persists', () => {
    const dir = makeConfigDir();
    try {
      const output = run(['config', 'set', 'loadMode', 'index'], dir);
      assert.ok(output.includes('loadMode = index'), `Expected "loadMode = index", got: ${output}`);
      // Verify persisted
      const after = run(['config', 'get', 'loadMode'], dir);
      assert.ok(after.trim() === 'index', `Expected "index" after set, got: "${after.trim()}"`);
    } finally {
      removeTmpDir(dir);
    }
  });

  it('config set badKey val exits 1 with "Unknown config key"', () => {
    const dir = makeConfigDir();
    try {
      const output = run(['config', 'set', 'badKey', 'val'], dir);
      assert.ok(output.includes('\u2717'), 'Should contain cross-mark');
      assert.ok(output.includes('Unknown config key'), `Expected "Unknown config key", got: ${output}`);
    } finally {
      removeTmpDir(dir);
    }
  });

  it('config set loadMode invalid exits 1 with "Invalid value"', () => {
    const dir = makeConfigDir();
    try {
      const output = run(['config', 'set', 'loadMode', 'invalid'], dir);
      assert.ok(output.includes('\u2717'), 'Should contain cross-mark');
      assert.ok(output.includes('Invalid value'), `Expected "Invalid value", got: ${output}`);
    } finally {
      removeTmpDir(dir);
    }
  });

  it('config with no subcommand exits 1 with usage message', () => {
    const dir = makeConfigDir();
    try {
      const output = run(['config'], dir);
      assert.ok(output.includes('\u2717'), 'Should contain cross-mark');
      assert.ok(output.includes('Usage'), `Expected usage message, got: ${output}`);
    } finally {
      removeTmpDir(dir);
    }
  });
});

/**
 * Create a tmp dir with .planning/burrow/cards.json containing a nested test tree.
 * Structure: Parent 1 (with body) > Child 1.1 > Grandchild 1.1.1 (with body)
 *            Archived Parent (archived=true)
 */
function makeIndexDir() {
  const dir = makeTmpDir();
  const burrowDir = path.join(dir, '.planning', 'burrow');
  fs.mkdirSync(burrowDir, { recursive: true });
  const testData = {
    version: 2,
    cards: [
      {
        id: 'aaaaaaaa',
        title: 'Parent 1',
        created: '2026-01-01T00:00:00.000Z',
        archived: false,
        body: 'A long body that takes many tokens to represent and should not appear in index output at all',
        children: [
          {
            id: 'bbbbbbbb',
            title: 'Child 1.1',
            created: '2026-01-01T00:00:00.000Z',
            archived: false,
            body: '',
            children: [
              {
                id: 'cccccccc',
                title: 'Grandchild 1.1.1',
                created: '2026-01-01T00:00:00.000Z',
                archived: false,
                body: 'deep body',
                children: [],
              },
            ],
          },
        ],
      },
      {
        id: 'dddddddd',
        title: 'Archived Parent',
        created: '2026-01-01T00:00:00.000Z',
        archived: true,
        body: 'archived body',
        children: [],
      },
    ],
  };
  fs.writeFileSync(
    path.join(burrowDir, 'cards.json'),
    JSON.stringify(testData, null, 2) + '\n',
    'utf-8'
  );
  return dir;
}

describe('index command', () => {
  it('burrow index outputs human-readable tree with "burrow index" header', () => {
    const dir = makeIndexDir();
    try {
      const output = run(['index'], dir);
      assert.ok(output.includes('burrow index'), 'Should contain "burrow index" header');
    } finally {
      removeTmpDir(dir);
    }
  });

  it('burrow index --json outputs valid JSON array', () => {
    const dir = makeIndexDir();
    try {
      const output = run(['index', '--json'], dir);
      let parsed;
      assert.doesNotThrow(() => { parsed = JSON.parse(output); }, 'Should be valid JSON');
      assert.ok(Array.isArray(parsed), 'Should be an array');
    } finally {
      removeTmpDir(dir);
    }
  });

  it('burrow index --json output contains id, title, childCount, hasBody, archived, children fields', () => {
    const dir = makeIndexDir();
    try {
      const output = run(['index', '--json'], dir);
      const parsed = JSON.parse(output);
      assert.ok(parsed.length > 0, 'Should have cards');
      const card = parsed[0];
      assert.ok('id' in card, 'Should have id');
      assert.ok('title' in card, 'Should have title');
      assert.ok('childCount' in card, 'Should have childCount');
      assert.ok('hasBody' in card, 'Should have hasBody');
      assert.ok('archived' in card, 'Should have archived');
      assert.ok('children' in card, 'Should have children');
    } finally {
      removeTmpDir(dir);
    }
  });

  it('burrow index --json output does NOT contain "body" key with string value or "created" key', () => {
    const dir = makeIndexDir();
    try {
      const output = run(['index', '--json'], dir);
      const parsed = JSON.parse(output);
      // Recursively check all cards for forbidden fields
      function checkNoForbiddenFields(cards) {
        for (const card of cards) {
          assert.ok(!('body' in card), `Card "${card.title}" should not have body field`);
          assert.ok(!('created' in card), `Card "${card.title}" should not have created field`);
          assert.ok(!('bodyPreview' in card), `Card "${card.title}" should not have bodyPreview field`);
          assert.ok(!('descendantCount' in card), `Card "${card.title}" should not have descendantCount field`);
          if (card.children && card.children.length > 0) {
            checkNoForbiddenFields(card.children);
          }
        }
      }
      checkNoForbiddenFields(parsed);
    } finally {
      removeTmpDir(dir);
    }
  });

  it('burrow index --depth 1 limits to 1 level (no grandchildren in output)', () => {
    const dir = makeIndexDir();
    try {
      const output = run(['index', '--depth', '1', '--json'], dir);
      const parsed = JSON.parse(output);
      // Parent 1 should be present
      assert.ok(parsed.length > 0, 'Should have cards at level 1');
      // Child 1.1 should be in Parent 1's children (still shown, because depth=1 means 1 level of children)
      // Actually depth=1 means only recurse 1 level: root cards are returned, their children are listed but not recursed
      // Parent 1's children array should be present but Child 1.1's children should be empty
      const parent1 = parsed.find((c) => c.id === 'aaaaaaaa');
      assert.ok(parent1, 'Parent 1 should be present');
      // With depth=1, children of root are shown but their children are empty
      if (parent1.children.length > 0) {
        const child11 = parent1.children.find((c) => c.id === 'bbbbbbbb');
        if (child11) {
          assert.equal(child11.children.length, 0, 'Child 1.1 should have no children with depth=1');
        }
      }
    } finally {
      removeTmpDir(dir);
    }
  });

  it('burrow index --include-archived includes archived cards in output', () => {
    const dir = makeIndexDir();
    try {
      const output = run(['index', '--include-archived', '--json'], dir);
      const parsed = JSON.parse(output);
      const archivedCard = parsed.find((c) => c.id === 'dddddddd');
      assert.ok(archivedCard, 'Archived Parent should be present with --include-archived');
      assert.equal(archivedCard.archived, true);
    } finally {
      removeTmpDir(dir);
    }
  });

  it('burrow index without --include-archived excludes archived cards', () => {
    const dir = makeIndexDir();
    try {
      const output = run(['index', '--json'], dir);
      const parsed = JSON.parse(output);
      const archivedCard = parsed.find((c) => c.id === 'dddddddd');
      assert.ok(!archivedCard, 'Archived Parent should NOT be present without --include-archived');
    } finally {
      removeTmpDir(dir);
    }
  });

  it('burrow index --json byte count is smaller than cards.json file size', () => {
    const dir = makeIndexDir();
    try {
      const cardsJsonPath = path.join(dir, '.planning', 'burrow', 'cards.json');
      const cardsJsonSize = fs.statSync(cardsJsonPath).size;
      const indexOutput = run(['index', '--json'], dir);
      const indexSize = Buffer.byteLength(indexOutput, 'utf-8');
      assert.ok(indexSize < cardsJsonSize, `Index (${indexSize} bytes) should be smaller than cards.json (${cardsJsonSize} bytes)`);
    } finally {
      removeTmpDir(dir);
    }
  });
});
