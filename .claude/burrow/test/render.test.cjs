'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  renderCard,
  renderMutation,
  renderPath,
  renderError,
} = require('../lib/render.cjs');

// --- Fixtures ---

function makeCard(overrides = {}) {
  return {
    id: 'a1b2c3d4',
    title: 'Login bug',
    created: '2026-03-06T12:00:00.000Z',
    archived: false,
    body: 'OAuth callback sends to /dashboard instead of original page',
    children: [],
    ...overrides,
  };
}

function makeCardWithChildren() {
  return makeCard({
    children: [
      {
        id: 'i9j0k1l2',
        title: 'Root cause',
        created: '2026-03-07T12:00:00.000Z',
        archived: false,
        body: 'Found the redirect logic',
        children: [],
      },
      {
        id: 'j2k3l4m5',
        title: 'Workaround',
        created: '2026-03-08T06:00:00.000Z',
        archived: false,
        body: '',
        children: [],
      },
    ],
  });
}

// --- formatAge (tested via renderCard metadata) ---

describe('renderError', () => {
  it('returns cross-mark + message', () => {
    const result = renderError('Card not found');
    assert.equal(result, '\u2717 Card not found');
  });

  it('handles empty message', () => {
    const result = renderError('');
    assert.equal(result, '\u2717 ');
  });
});

describe('renderPath', () => {
  it('renders breadcrumb from path array', () => {
    const pathArray = [
      { id: 'aaa11111', title: 'bugs' },
      { id: 'a1b2c3d4', title: 'Login bug' },
    ];
    const result = renderPath(pathArray);
    assert.equal(result, 'burrow \u203a bugs \u203a Login bug [a1b2c3d4]');
  });

  it('renders single card path', () => {
    const pathArray = [{ id: 'a1b2c3d4', title: 'Login bug' }];
    const result = renderPath(pathArray);
    assert.equal(result, 'burrow \u203a Login bug [a1b2c3d4]');
  });

  it('renders empty path as just burrow', () => {
    const result = renderPath([]);
    assert.equal(result, 'burrow');
  });
});

describe('renderCard', () => {
  it('renders card with all sections', () => {
    const card = makeCard();
    const result = renderCard(card, [{ id: 'aaa11111', title: 'bugs' }], {});
    // Check breadcrumb header
    assert.ok(result.includes('burrow \u203a bugs \u203a Login bug'));
    // Check title section
    assert.ok(result.includes('Login bug'));
    // Check metadata
    assert.ok(result.includes('id:       a1b2c3d4'));
    assert.ok(result.includes('created:'));
    assert.ok(result.includes('archived: no'));
    // Check body
    assert.ok(result.includes('OAuth callback sends to /dashboard'));
    // Check HR delimiters
    const hrCount = (result.match(/\u2500{40}/g) || []).length;
    assert.ok(hrCount >= 5, `Expected at least 5 HRs, got ${hrCount}`);
  });

  it('renders empty card with (none) and (empty)', () => {
    const card = makeCard({ children: [], body: '' });
    const result = renderCard(card, [], {});
    assert.ok(result.includes('(none)'));
    assert.ok(result.includes('(empty)'));
  });

  it('truncates body over 200 chars', () => {
    const longBody = 'A'.repeat(250);
    const card = makeCard({ body: longBody });
    const result = renderCard(card, [], {});
    assert.ok(result.includes('(truncated'));
    assert.ok(result.includes('--full'));
    // Should not contain the full body
    assert.ok(!result.includes('A'.repeat(250)));
  });

  it('shows full body with full=true', () => {
    const longBody = 'A'.repeat(250);
    const card = makeCard({ body: longBody });
    const result = renderCard(card, [], { full: true });
    assert.ok(result.includes('A'.repeat(250)));
    assert.ok(!result.includes('(truncated'));
  });

  it('renders children with box-drawing characters', () => {
    const card = makeCardWithChildren();
    const result = renderCard(card, [], { termWidth: 80 });
    assert.ok(result.includes('\u251c\u2500'));  // branch
    assert.ok(result.includes('\u2514\u2500'));  // corner
    assert.ok(result.includes('[i9j0k1l2]'));
    assert.ok(result.includes('[j2k3l4m5]'));
    assert.ok(result.includes('Root cause'));
    assert.ok(result.includes('Workaround'));
  });

  it('renders children header with count', () => {
    const card = makeCardWithChildren();
    const result = renderCard(card, [], { termWidth: 80 });
    assert.ok(result.includes('children: 2 cards'));
  });

  it('renders root card with (root) ID', () => {
    const rootCard = {
      id: '(root)',
      title: 'burrow',
      created: '2026-03-07T00:00:00.000Z',
      archived: false,
      body: '',
      children: [],
    };
    const result = renderCard(rootCard, [], {});
    assert.ok(result.includes('id:       (root)'));
    assert.ok(result.includes('burrow'));
  });

  it('shows archived: yes for archived cards', () => {
    const card = makeCard({ archived: true });
    const result = renderCard(card, [], {});
    assert.ok(result.includes('archived: yes'));
  });

  it('filters archived children by default', () => {
    const card = makeCard({
      children: [
        { id: 'c1111111', title: 'Active', created: '2026-03-07T00:00:00.000Z', archived: false, body: '', children: [] },
        { id: 'c2222222', title: 'Archived', created: '2026-03-07T00:00:00.000Z', archived: true, body: '', children: [] },
      ],
    });
    const result = renderCard(card, [], { termWidth: 80 });
    assert.ok(result.includes('Active'));
    assert.ok(!result.includes('Archived'));
  });

  it('shows [archived] label when include-archived', () => {
    const card = makeCard({
      children: [
        { id: 'c1111111', title: 'Active', created: '2026-03-07T00:00:00.000Z', archived: false, body: '', children: [] },
        { id: 'c2222222', title: 'Old task', created: '2026-03-07T00:00:00.000Z', archived: true, body: '', children: [] },
      ],
    });
    const result = renderCard(card, [], { termWidth: 80, archiveFilter: 'include-archived' });
    assert.ok(result.includes('Active'));
    assert.ok(result.includes('Old task'));
    assert.ok(result.includes('[archived]'));
  });

  it('renders body with indentation', () => {
    const card = makeCard({ body: 'Line 1\nLine 2\nLine 3' });
    const result = renderCard(card, [], {});
    assert.ok(result.includes('  Line 1'));
    assert.ok(result.includes('  Line 2'));
    assert.ok(result.includes('  Line 3'));
  });

  it('shows body dot marker for children with body', () => {
    const card = makeCardWithChildren();
    const result = renderCard(card, [], { termWidth: 80 });
    // Root cause has body, should have dot marker
    assert.ok(result.includes('\u2022'));
  });
});

describe('formatAge via renderCard', () => {
  it('shows relative age in metadata', () => {
    // Card created 2 days ago relative to a known time
    const card = makeCard({ created: '2026-03-06T12:00:00.000Z' });
    const result = renderCard(card, [], {});
    // Should contain 'ago' or 'just now' in created line
    assert.ok(result.includes('ago') || result.includes('just now'),
      'Expected relative age in created metadata');
  });
});

describe('renderMutation', () => {
  it('renders add with checkmark and card detail', () => {
    const card = makeCard();
    const result = renderMutation('add', card, { breadcrumbs: [], card });
    assert.ok(result.includes('\u2713 Added card'));
    // Should include card detail
    assert.ok(result.includes('id:       a1b2c3d4'));
  });

  it('renders edit with diff lines', () => {
    const card = makeCard({ title: 'Login bug fixed' });
    const result = renderMutation('edit', card, {
      breadcrumbs: [],
      card,
      oldTitle: 'Login bug',
      oldBody: 'Old body text',
    });
    assert.ok(result.includes('\u2713 Edited card'));
    assert.ok(result.includes('title:'));
    assert.ok(result.includes('\u2192'));  // arrow
  });

  it('renders delete as one-liner', () => {
    const result = renderMutation('delete', { id: 'e5f6g7h8', title: 'API timeout', descendantCount: 2 }, {});
    assert.ok(result.includes('\u2713 Deleted'));
    assert.ok(result.includes('"API timeout"'));
    assert.ok(result.includes('[e5f6g7h8]'));
    assert.ok(result.includes('2 children'));
  });

  it('omits child count when zero for delete', () => {
    const result = renderMutation('delete', { id: 'e5f6g7h8', title: 'API timeout', descendantCount: 0 }, {});
    assert.ok(result.includes('\u2713 Deleted'));
    assert.ok(!result.includes('children'));
  });

  it('renders move as one-liner with arrow', () => {
    const result = renderMutation('move', { id: 'e5f6g7h8', title: 'API timeout' }, {
      fromParentTitle: 'bugs',
    });
    assert.ok(result.includes('\u2713 Moved'));
    assert.ok(result.includes('"API timeout"'));
    assert.ok(result.includes('[e5f6g7h8]'));
    assert.ok(result.includes('\u2192'));
  });

  it('renders archive as one-liner with cascade count', () => {
    const result = renderMutation('archive', { id: 'a1b2c3d4', title: 'bugs', descendantCount: 5 }, {});
    assert.ok(result.includes('\u2713 Archived'));
    assert.ok(result.includes('"bugs"'));
    assert.ok(result.includes('5 children'));
  });

  it('renders unarchive as one-liner', () => {
    const result = renderMutation('unarchive', { id: 'a1b2c3d4', title: 'bugs', descendantCount: 5 }, {});
    assert.ok(result.includes('\u2713 Unarchived'));
    assert.ok(result.includes('"bugs"'));
    assert.ok(result.includes('5 children'));
  });

  it('omits child count when zero for archive', () => {
    const result = renderMutation('archive', { id: 'a1b2c3d4', title: 'bugs', descendantCount: 0 }, {});
    assert.ok(!result.includes('children'));
  });

  it('renders edit with only title change', () => {
    const card = makeCard({ title: 'New title' });
    const result = renderMutation('edit', card, {
      breadcrumbs: [],
      card,
      oldTitle: 'Old title',
    });
    assert.ok(result.includes('title:'));
    // The diff section should not contain a body diff line (arrow between old/new body)
    // But the card detail will have "body:" -- so check the diff section specifically
    const lines = result.split('\n');
    const diffLines = lines.filter((l) => l.startsWith('  body:') && l.includes('\u2192'));
    assert.equal(diffLines.length, 0, 'Should not have body diff line when body unchanged');
  });

  it('truncates long diff values at ~40 chars', () => {
    const longTitle = 'A very long title that exceeds forty characters easily';
    const card = makeCard({ title: longTitle });
    const result = renderMutation('edit', card, {
      breadcrumbs: [],
      card,
      oldTitle: 'Short',
    });
    // The long title in diff should be truncated with ellipsis
    assert.ok(result.includes('\u2026') || result.includes('...'),
      'Expected ellipsis in long diff value');
  });
});

describe('exports', () => {
  it('exports all four functions', () => {
    const mod = require('../lib/render.cjs');
    assert.equal(typeof mod.renderCard, 'function');
    assert.equal(typeof mod.renderMutation, 'function');
    assert.equal(typeof mod.renderPath, 'function');
    assert.equal(typeof mod.renderError, 'function');
  });

  it('exports only four functions', () => {
    const mod = require('../lib/render.cjs');
    const keys = Object.keys(mod);
    assert.equal(keys.length, 4);
  });
});
