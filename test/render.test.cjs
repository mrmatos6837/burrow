'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  renderCard,
  renderMutation,
  renderPath,
  renderError,
} = require('../.claude/burrow/lib/render.cjs');

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
        descendantCount: 0,
        hasBody: true,
      },
      {
        id: 'j2k3l4m5',
        title: 'Workaround',
        created: '2026-03-08T06:00:00.000Z',
        archived: false,
        body: '',
        children: [],
        descendantCount: 0,
        hasBody: false,
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

  it('renders only children passed in (no re-filtering by renderCard)', () => {
    // renderCard trusts that children are pre-filtered by renderTree.
    // Only the active child is passed in the children array.
    const card = makeCard({
      children: [
        { id: 'c1111111', title: 'Active', created: '2026-03-07T00:00:00.000Z', archived: false, body: '', children: [], descendantCount: 0, hasBody: false },
      ],
    });
    const result = renderCard(card, [], { termWidth: 80 });
    assert.ok(result.includes('Active'));
    // No archived children in the array so none shown
    assert.ok(!result.includes('Archived'));
  });

  it('shows [archived] label for archived children (pre-filtered by caller)', () => {
    // renderCard renders all children as-is; archived ones show [archived] label
    const card = makeCard({
      children: [
        { id: 'c2222222', title: 'Old task', created: '2026-03-07T00:00:00.000Z', archived: true, body: '', children: [], descendantCount: 0, hasBody: false },
      ],
    });
    const result = renderCard(card, [], { termWidth: 80 });
    assert.ok(result.includes('Old task'));
    assert.ok(result.includes('[archived]'), 'Should show [archived] tag for archived card');
  });

  it('shows count for cards with descendants using pre-computed descendantCount', () => {
    const card = makeCard({
      children: [
        {
          id: 'c1111111', title: 'Has children', created: '2026-03-07T00:00:00.000Z',
          archived: false, body: '', descendantCount: 1, hasBody: false,
          children: [
            { id: 'c3333333', title: 'Grandchild', created: '2026-03-07T00:00:00.000Z', archived: false, body: '', children: [], descendantCount: 0, hasBody: false },
          ],
        },
        { id: 'c2222222', title: 'No children', created: '2026-03-07T00:00:00.000Z', archived: false, body: '', children: [], descendantCount: 0, hasBody: false },
      ],
    });
    const result = renderCard(card, [], { termWidth: 80 });
    assert.ok(result.includes('(1)'), 'Should show (1) for card with pre-computed descendantCount=1');
    // Leaf cards should NOT show (0)
    const lines = result.split('\n');
    const leafLine = lines.find(l => l.includes('No children'));
    assert.ok(leafLine, 'Leaf card line should exist');
    assert.ok(!leafLine.includes('(0)'), 'Leaf card should NOT show (0) count');
  });

  it('shows [archived] label on archived cards when both are in children array', () => {
    // renderCard renders all children as-is; archived ones get [archived] label
    const card = makeCard({
      children: [
        { id: 'c1111111', title: 'Active', created: '2026-03-07T00:00:00.000Z', archived: false, body: '', children: [], descendantCount: 0, hasBody: false },
        { id: 'c2222222', title: 'Old task', created: '2026-03-07T00:00:00.000Z', archived: true, body: '', children: [], descendantCount: 0, hasBody: false },
      ],
    });
    const result = renderCard(card, [], { termWidth: 80 });
    assert.ok(result.includes('Active'));
    assert.ok(result.includes('Old task'));
    assert.ok(result.includes('[archived]'));
  });

  it('renders nested children (grandchildren) with indented tree lines', () => {
    const card = makeCard({
      children: [
        {
          id: 'c1111111',
          title: 'Parent child',
          created: '2026-03-07T00:00:00.000Z',
          archived: false,
          body: '',
          descendantCount: 1,
          hasBody: false,
          children: [
            {
              id: 'c3333333',
              title: 'Grandchild',
              created: '2026-03-07T00:00:00.000Z',
              archived: false,
              body: '',
              children: [],
              descendantCount: 0,
              hasBody: false,
            },
          ],
        },
        {
          id: 'c2222222',
          title: 'Sibling',
          created: '2026-03-07T00:00:00.000Z',
          archived: false,
          body: '',
          children: [],
          descendantCount: 0,
          hasBody: false,
        },
      ],
    });
    const result = renderCard(card, [], { termWidth: 120 });
    // Should contain grandchild
    assert.ok(result.includes('Grandchild'), 'Should render grandchild title');
    assert.ok(result.includes('[c3333333]'), 'Should render grandchild ID');
    // Grandchild should be indented with pipe continuation from parent
    assert.ok(result.includes('\u2502'), 'Should contain pipe for continuation indent');
  });

  it('renders body with indentation', () => {
    const card = makeCard({ body: 'Line 1\nLine 2\nLine 3' });
    const result = renderCard(card, [], {});
    assert.ok(result.includes('  Line 1'));
    assert.ok(result.includes('  Line 2'));
    assert.ok(result.includes('  Line 3'));
  });

  it('shows body ellipsis marker for children with body', () => {
    const card = makeCardWithChildren();
    const result = renderCard(card, [], { termWidth: 80 });
    // Root cause has body, should have + body marker
    const lines = result.split('\n');
    const rootCauseLine = lines.find(l => l.includes('Root cause'));
    assert.ok(rootCauseLine, 'Root cause line should exist');
    assert.ok(rootCauseLine.includes(' +'), 'Should use + as body indicator');
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

describe('formatAge direct hardening (QUAL-01)', () => {
  // formatAge is not exported; test via renderCard which calls formatCreatedDate(card.created)
  // which in turn calls formatAge. A numeric created value should show ??? not NaN.

  it('numeric created (non-string) does not produce NaN in output', () => {
    const card = makeCard({ created: 12345 });
    const result = renderCard(card, [], {});
    assert.ok(!result.includes('NaN'), 'Should not render NaN for numeric created');
    assert.ok(result.includes('???'), 'Should show ??? for numeric created');
  });

  it('random string created does not produce NaN in output', () => {
    const card = makeCard({ created: 'not-a-date' });
    const result = renderCard(card, [], {});
    assert.ok(!result.includes('NaN'), 'Should not render NaN for random string');
    assert.ok(result.includes('???'), 'Should show ??? for invalid string');
  });

  it('empty string created shows ??? in output', () => {
    const card = makeCard({ created: '' });
    const result = renderCard(card, [], {});
    assert.ok(!result.includes('NaN'), 'Should not render NaN for empty string');
    assert.ok(result.includes('???'), 'Should show ??? for empty string');
  });

  it('undefined created shows ??? in output', () => {
    const card = makeCard({ created: undefined });
    const result = renderCard(card, [], {});
    assert.ok(!result.includes('NaN'), 'Should not render NaN for undefined');
    assert.ok(result.includes('???'), 'Should show ??? for undefined');
  });

  it('null created shows ??? in output', () => {
    const card = makeCard({ created: null });
    const result = renderCard(card, [], {});
    assert.ok(!result.includes('NaN'), 'Should not render NaN for null');
    assert.ok(result.includes('???'), 'Should show ??? for null');
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

  it('renders remove as one-liner', () => {
    const result = renderMutation('remove', { id: 'e5f6g7h8', title: 'API timeout', descendantCount: 2 }, {});
    assert.ok(result.includes('\u2713 Removed'));
    assert.ok(result.includes('"API timeout"'));
    assert.ok(result.includes('[e5f6g7h8]'));
    assert.ok(result.includes('2 children'));
  });

  it('omits child count when zero for remove', () => {
    const result = renderMutation('remove', { id: 'e5f6g7h8', title: 'API timeout', descendantCount: 0 }, {});
    assert.ok(result.includes('\u2713 Removed'));
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

describe('[archived] tag always shown on archived cards', () => {
  it('shows [archived] tag on archived child card', () => {
    const card = makeCard({
      children: [
        { id: 'c2222222', title: 'Old task', created: '2026-03-07T00:00:00.000Z', archived: true, body: '', children: [], descendantCount: 0, hasBody: false },
      ],
    });
    const result = renderCard(card, [], { termWidth: 80 });
    assert.ok(result.includes('[archived]'), 'Should show [archived] tag on archived card');
  });

  it('shows [archived] tag on archived cards when mixed with active', () => {
    const card = makeCard({
      children: [
        { id: 'c1111111', title: 'Active task', created: '2026-03-07T00:00:00.000Z', archived: false, body: '', children: [], descendantCount: 0, hasBody: false },
        { id: 'c2222222', title: 'Old task', created: '2026-03-07T00:00:00.000Z', archived: true, body: '', children: [], descendantCount: 0, hasBody: false },
      ],
    });
    const result = renderCard(card, [], { termWidth: 80 });
    assert.ok(result.includes('[archived]'), 'Should show [archived] tag on archived card');
    // Active card should NOT have [archived] tag
    const lines = result.split('\n');
    const activeTaskLine = lines.find(l => l.includes('Active task'));
    assert.ok(activeTaskLine, 'Active task should be in output');
    assert.ok(!activeTaskLine.includes('[archived]'), 'Active task should NOT have [archived] tag');
  });

  it('does not show [archived] on non-archived cards', () => {
    const card = makeCard({
      children: [
        { id: 'c1111111', title: 'Active task', created: '2026-03-07T00:00:00.000Z', archived: false, body: '', children: [], descendantCount: 0, hasBody: false },
      ],
    });
    const result = renderCard(card, [], { termWidth: 80 });
    assert.ok(!result.includes('[archived]'), 'Non-archived cards should never show [archived] tag');
  });
});

describe('formatCardLine indicator ordering', () => {
  it('renders count + body: Title (N) + (using pre-computed descendantCount)', () => {
    const parent = makeCard({
      children: [
        {
          id: 'c1111111', title: 'Feature work', created: '2026-03-07T00:00:00.000Z',
          archived: false, body: 'Some details about this',
          descendantCount: 6,
          hasBody: true,
          children: [
            { id: 'c3333333', title: 'Sub-task A', created: '2026-03-07T00:00:00.000Z', archived: false, body: '', children: [], descendantCount: 0, hasBody: false },
            { id: 'c4444444', title: 'Sub-task B', created: '2026-03-07T00:00:00.000Z', archived: false, body: '', children: [], descendantCount: 0, hasBody: false },
            { id: 'c5555555', title: 'Sub-task C', created: '2026-03-07T00:00:00.000Z', archived: false, body: '', children: [], descendantCount: 0, hasBody: false },
            { id: 'c6666666', title: 'Sub-task D', created: '2026-03-07T00:00:00.000Z', archived: false, body: '', children: [], descendantCount: 0, hasBody: false },
            { id: 'c7777777', title: 'Sub-task E', created: '2026-03-07T00:00:00.000Z', archived: false, body: '', children: [], descendantCount: 0, hasBody: false },
            { id: 'c8888888', title: 'Sub-task F', created: '2026-03-07T00:00:00.000Z', archived: false, body: '', children: [], descendantCount: 0, hasBody: false },
          ],
        },
      ],
    });
    const result = renderCard(parent, [], { termWidth: 120 });
    const lines = result.split('\n');
    const featureLine = lines.find(l => l.includes('Feature work'));
    assert.ok(featureLine, 'Feature work line should exist');
    assert.ok(featureLine.includes('(6)'), 'Should show (6) from pre-computed descendantCount');
    assert.ok(featureLine.includes(' +'), 'Should show + for body');
    // Count should appear before body marker
    const countIdx = featureLine.indexOf('(6)');
    const bodyIdx = featureLine.indexOf(' +');
    assert.ok(countIdx < bodyIdx, 'Count (6) should appear before + body marker');
  });

  it('renders count only: Title (N)', () => {
    const parent = makeCard({
      children: [
        {
          id: 'c1111111', title: 'Has child', created: '2026-03-07T00:00:00.000Z',
          archived: false, body: '',
          descendantCount: 1,
          hasBody: false,
          children: [
            { id: 'c2222222', title: 'Only child', created: '2026-03-07T00:00:00.000Z', archived: false, body: '', children: [], descendantCount: 0, hasBody: false },
          ],
        },
      ],
    });
    const result = renderCard(parent, [], { termWidth: 120 });
    const lines = result.split('\n');
    const line = lines.find(l => l.includes('Has child'));
    assert.ok(line, 'Line should exist');
    assert.ok(line.includes('(1)'), 'Should show (1) for 1 descendant');
    // Should NOT have ellipsis body marker on this specific line (no body)
    const afterCount = line.slice(line.indexOf('(1)') + 3);
    assert.ok(!afterCount.startsWith(' +'), 'Should not have + body marker when no body');
  });

  it('renders body only: Title +', () => {
    const parent = makeCard({
      children: [
        {
          id: 'c1111111', title: 'Leaf with body', created: '2026-03-07T00:00:00.000Z',
          archived: false, body: 'Some body content',
          descendantCount: 0,
          hasBody: true,
          children: [],
        },
      ],
    });
    const result = renderCard(parent, [], { termWidth: 120 });
    const lines = result.split('\n');
    const line = lines.find(l => l.includes('Leaf with body'));
    assert.ok(line, 'Line should exist');
    assert.ok(line.includes(' +'), 'Should show + for body');
    assert.ok(!line.includes('(0)'), 'Should NOT show (0) count for leaf');
  });

  it('renders neither: Title', () => {
    const parent = makeCard({
      children: [
        {
          id: 'c1111111', title: 'Plain leaf', created: '2026-03-07T00:00:00.000Z',
          archived: false, body: '',
          descendantCount: 0,
          hasBody: false,
          children: [],
        },
      ],
    });
    const result = renderCard(parent, [], { termWidth: 120 });
    const lines = result.split('\n');
    const line = lines.find(l => l.includes('Plain leaf'));
    assert.ok(line, 'Line should exist');
    assert.ok(!line.includes('(0)'), 'Should NOT show (0) count');
    // Check no body marker
    const titleIdx = line.indexOf('Plain leaf');
    const afterTitle = line.slice(titleIdx + 'Plain leaf'.length);
    // afterTitle should be just whitespace + age
    assert.ok(!afterTitle.includes(' +'), 'Should NOT show + when no body');
  });

  it('renders all indicators: Title (N) + [archived]', () => {
    const parent = makeCard({
      children: [
        {
          id: 'c1111111', title: 'Legacy feature', created: '2026-03-07T00:00:00.000Z',
          archived: true, body: 'Deprecated since v2',
          descendantCount: 2,
          hasBody: true,
          children: [
            { id: 'c2222222', title: 'Sub 1', created: '2026-03-07T00:00:00.000Z', archived: false, body: '', children: [], descendantCount: 0, hasBody: false },
            { id: 'c3333333', title: 'Sub 2', created: '2026-03-07T00:00:00.000Z', archived: false, body: '', children: [], descendantCount: 0, hasBody: false },
          ],
        },
      ],
    });
    const result = renderCard(parent, [], { termWidth: 120 });
    const lines = result.split('\n');
    const line = lines.find(l => l.includes('Legacy feature'));
    assert.ok(line, 'Line should exist');
    // Verify all indicators present (from pre-computed descendantCount=2)
    assert.ok(line.includes('(2)'), 'Should show (2) from pre-computed descendantCount');
    assert.ok(line.includes(' +'), 'Should show + for body');
    assert.ok(line.includes('[archived]'), 'Should show [archived] tag');
    // Verify ordering: count before + before [archived]
    const countIdx = line.indexOf('(2)');
    const bodyIdx = line.indexOf(' +');
    const archivedIdx = line.indexOf('[archived]');
    assert.ok(countIdx < bodyIdx, 'Count should appear before + body marker');
    assert.ok(bodyIdx < archivedIdx, '+ body marker should appear before [archived]');
  });
});

describe('formatAge edge cases', () => {
  // Access formatAge indirectly via renderCard's created field display,
  // but we need direct access — expose via a test-only require of internal.
  // Since formatAge is not exported, we test observable behavior via renderCard
  // and via formatCreatedDate which calls formatAge.
  // The plan says to test behavior; we verify via renderCard metadata line
  // (created: contains the age string) and by exercising renderCard with
  // pathological created values.

  it('renderCard with undefined created does not show NaN', () => {
    const card = {
      id: 'a1b2c3d4',
      title: 'Test card',
      created: undefined,
      archived: false,
      body: '',
      children: [],
    };
    const result = renderCard(card, [], {});
    assert.ok(!result.includes('NaN'), 'Should not render NaN for undefined created');
    assert.ok(!result.includes('undefined'), 'Should not render "undefined"');
  });

  it('renderCard with null created does not show NaN', () => {
    const card = {
      id: 'a1b2c3d4',
      title: 'Test card',
      created: null,
      archived: false,
      body: '',
      children: [],
    };
    const result = renderCard(card, [], {});
    assert.ok(!result.includes('NaN'), 'Should not render NaN for null created');
  });

  it('renderCard with invalid date string does not show NaN', () => {
    const card = {
      id: 'a1b2c3d4',
      title: 'Test card',
      created: 'not-a-date',
      archived: false,
      body: '',
      children: [],
    };
    const result = renderCard(card, [], {});
    assert.ok(!result.includes('NaN'), 'Should not render NaN for invalid date');
    assert.ok(result.includes('???'), 'Should show ??? for invalid date');
  });

  it('renderCard with empty string created does not show NaN', () => {
    const card = {
      id: 'a1b2c3d4',
      title: 'Test card',
      created: '',
      archived: false,
      body: '',
      children: [],
    };
    const result = renderCard(card, [], {});
    assert.ok(!result.includes('NaN'), 'Should not render NaN for empty created');
    assert.ok(result.includes('???'), 'Should show ??? for empty created');
  });

  it('renderCard with future date shows "just now" not negative age', () => {
    const futureDate = new Date(Date.now() + 3600 * 1000).toISOString(); // 1 hour in future
    const card = {
      id: 'a1b2c3d4',
      title: 'Test card',
      created: futureDate,
      archived: false,
      body: '',
      children: [],
    };
    const result = renderCard(card, [], {});
    assert.ok(!result.includes('NaN'), 'Should not have NaN for future date');
    assert.ok(result.includes('just now'), 'Should show "just now" for future date');
  });

  it('renderCard with far future date shows "just now" not negative age', () => {
    const farFutureDate = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(); // 1 year future
    const card = {
      id: 'a1b2c3d4',
      title: 'Test card',
      created: farFutureDate,
      archived: false,
      body: '',
      children: [],
    };
    const result = renderCard(card, [], {});
    assert.ok(result.includes('just now'), 'Should show "just now" for far future date');
  });

  it('renderCard child with invalid created date shows ??? in tree line', () => {
    const card = {
      id: 'a1b2c3d4',
      title: 'Parent',
      created: '2026-03-06T12:00:00.000Z',
      archived: false,
      body: '',
      children: [
        {
          id: 'c1111111',
          title: 'Child with bad date',
          created: 'bad-date',
          archived: false,
          body: '',
          children: [],
          descendantCount: 0,
          hasBody: false,
        },
      ],
    };
    const result = renderCard(card, [], { termWidth: 80 });
    assert.ok(!result.includes('NaN'), 'Tree lines should not show NaN for invalid date');
    assert.ok(result.includes('???'), 'Tree lines should show ??? for invalid date');
  });
});

describe('safeTitle guard in formatCardLine', () => {
  it('formatCardLine with undefined title renders (untitled), no crash', () => {
    const card = {
      id: 'a1b2c3d4',
      title: undefined,
      created: '2026-03-06T12:00:00.000Z',
      archived: false,
      body: '',
      children: [
        {
          id: 'c1111111',
          title: undefined,
          created: '2026-03-06T12:00:00.000Z',
          archived: false,
          body: '',
          children: [],
          descendantCount: 0,
          hasBody: false,
        },
      ],
    };
    const result = renderCard(card, [], { termWidth: 80 });
    assert.ok(result.includes('(untitled)'), 'Should render (untitled) for undefined title in tree line');
  });

  it('formatCardLine with empty string title renders (untitled)', () => {
    const card = {
      id: 'a1b2c3d4',
      title: 'Parent',
      created: '2026-03-06T12:00:00.000Z',
      archived: false,
      body: '',
      children: [
        {
          id: 'c1111111',
          title: '',
          created: '2026-03-06T12:00:00.000Z',
          archived: false,
          body: '',
          children: [],
          descendantCount: 0,
          hasBody: false,
        },
      ],
    };
    const result = renderCard(card, [], { termWidth: 80 });
    assert.ok(result.includes('(untitled)'), 'Should render (untitled) for empty string title');
  });

  it('formatCardLine with whitespace-only title renders (untitled)', () => {
    const card = {
      id: 'a1b2c3d4',
      title: 'Parent',
      created: '2026-03-06T12:00:00.000Z',
      archived: false,
      body: '',
      children: [
        {
          id: 'c1111111',
          title: '   ',
          created: '2026-03-06T12:00:00.000Z',
          archived: false,
          body: '',
          children: [],
          descendantCount: 0,
          hasBody: false,
        },
      ],
    };
    const result = renderCard(card, [], { termWidth: 80 });
    assert.ok(result.includes('(untitled)'), 'Should render (untitled) for whitespace-only title');
  });
});

describe('safeTitle guard in renderCard header', () => {
  it('renderCard with undefined title shows (untitled) in header and breadcrumb', () => {
    const card = {
      id: 'a1b2c3d4',
      title: undefined,
      created: '2026-03-06T12:00:00.000Z',
      archived: false,
      body: '',
      children: [],
    };
    const result = renderCard(card, [{ id: 'par00000', title: 'Parent' }], {});
    assert.ok(result.includes('(untitled)'), 'Header should show (untitled) for undefined title');
    // Count occurrences — should appear in breadcrumb AND in title section
    const count = (result.match(/\(untitled\)/g) || []).length;
    assert.ok(count >= 2, `Expected at least 2 occurrences of (untitled), got ${count}`);
  });

  it('renderCard with empty string title shows (untitled) in header and breadcrumb', () => {
    const card = {
      id: 'a1b2c3d4',
      title: '',
      created: '2026-03-06T12:00:00.000Z',
      archived: false,
      body: '',
      children: [],
    };
    const result = renderCard(card, [], {});
    assert.ok(result.includes('(untitled)'), 'Header should show (untitled) for empty string title');
  });
});

describe('safeTitle guard in formatBreadcrumb', () => {
  it('formatBreadcrumb with undefined cardTitle shows (untitled)', () => {
    const card = {
      id: 'a1b2c3d4',
      title: undefined,
      created: '2026-03-06T12:00:00.000Z',
      archived: false,
      body: '',
      children: [],
    };
    const result = renderCard(card, [], {});
    // renderCard passes card.title to formatBreadcrumb — with undefined, should show (untitled)
    assert.ok(result.includes('(untitled)'), 'Breadcrumb should show (untitled) for undefined title');
  });
});

describe('exports', () => {
  it('exports all five functions', () => {
    const mod = require('../.claude/burrow/lib/render.cjs');
    assert.equal(typeof mod.renderCard, 'function');
    assert.equal(typeof mod.renderMutation, 'function');
    assert.equal(typeof mod.renderPath, 'function');
    assert.equal(typeof mod.renderError, 'function');
    assert.equal(typeof mod.renderConfigList, 'function');
  });

  it('exports only six functions', () => {
    const mod = require('../.claude/burrow/lib/render.cjs');
    const keys = Object.keys(mod);
    assert.equal(keys.length, 6);
  });

  it('exports renderIndex', () => {
    const mod = require('../.claude/burrow/lib/render.cjs');
    assert.equal(typeof mod.renderIndex, 'function');
  });
});

// Helper to create a minimal card for tree-line tests
function makeTreeCard(overrides = {}) {
  return {
    id: 'a1b2c3d4',
    title: 'Test card',
    created: '2026-03-06T12:00:00.000Z',
    archived: false,
    body: '',
    children: [],
    descendantCount: 0,
    hasBody: false,
    ...overrides,
  };
}

describe('MIN_TERM_WIDTH floor (width clamping)', () => {
  // The MIN_TERM_WIDTH constant in render.cjs is 40.
  // formatCardLine is tested indirectly via renderCard which calls renderTreeLines -> formatCardLine.
  // We build a parent card with one child and check the tree line length.

  it('narrow termWidth (20) clamps to MIN_TERM_WIDTH (40): line is at least 40 chars', () => {
    const parent = makeCard({
      children: [makeTreeCard({ id: 'c1111111', title: 'Short' })],
    });
    const result = renderCard(parent, [], { termWidth: 20 });
    const lines = result.split('\n');
    const childLine = lines.find(l => l.includes('[c1111111]'));
    assert.ok(childLine, 'Child line should exist');
    // Line should be MIN_TERM_WIDTH (40) not 20
    assert.ok(childLine.length >= 40, `Expected line >= 40 chars, got ${childLine.length}`);
  });

  it('termWidth=120 produces a tree line of 120 chars', () => {
    const parent = makeCard({
      children: [makeTreeCard({ id: 'c1111111', title: 'Short' })],
    });
    const result = renderCard(parent, [], { termWidth: 120 });
    const lines = result.split('\n');
    const childLine = lines.find(l => l.includes('[c1111111]'));
    assert.ok(childLine, 'Child line should exist');
    assert.equal(childLine.length, 120, `Expected line of exactly 120 chars, got ${childLine.length}`);
  });

  it('termWidth=40 (at floor) produces valid output with no crash', () => {
    const parent = makeCard({
      children: [makeTreeCard({ id: 'c1111111', title: 'Short' })],
    });
    assert.doesNotThrow(() => {
      renderCard(parent, [], { termWidth: 40 });
    });
    const result = renderCard(parent, [], { termWidth: 40 });
    const lines = result.split('\n');
    const childLine = lines.find(l => l.includes('[c1111111]'));
    assert.ok(childLine, 'Child line should exist at termWidth=40');
    assert.equal(childLine.length, 40, `Expected line of exactly 40 chars, got ${childLine.length}`);
  });

  it('termWidth=80 (standard) produces tree lines of exactly 80 chars', () => {
    const parent = makeCard({
      children: [makeTreeCard({ id: 'c1111111', title: 'Short' })],
    });
    const result = renderCard(parent, [], { termWidth: 80 });
    const lines = result.split('\n');
    const childLine = lines.find(l => l.includes('[c1111111]'));
    assert.ok(childLine, 'Child line should exist');
    assert.equal(childLine.length, 80, `Expected line of exactly 80 chars, got ${childLine.length}`);
  });
});

describe('depth 3+ alignment (all lines exactly termWidth chars)', () => {
  // Build a 4-level deep tree: root -> L1 -> L2 -> L3
  function makeDeepTree() {
    return makeCard({
      children: [
        {
          id: 'l1111111',
          title: 'Level 1',
          created: '2026-03-06T12:00:00.000Z',
          archived: false,
          body: '',
          descendantCount: 1,
          hasBody: false,
          children: [
            {
              id: 'l2222222',
              title: 'Level 2',
              created: '2026-03-06T12:00:00.000Z',
              archived: false,
              body: '',
              descendantCount: 1,
              hasBody: false,
              children: [
                {
                  id: 'l3333333',
                  title: 'Level 3',
                  created: '2026-03-06T12:00:00.000Z',
                  archived: false,
                  body: '',
                  descendantCount: 0,
                  hasBody: false,
                  children: [],
                },
              ],
            },
          ],
        },
        {
          id: 'l4444444',
          title: 'Sibling L1',
          created: '2026-03-06T12:00:00.000Z',
          archived: false,
          body: '',
          descendantCount: 0,
          hasBody: false,
          children: [],
        },
      ],
    });
  }

  it('renderTreeLines at depth 3 with termWidth=80: all tree lines are exactly 80 chars', () => {
    const parent = makeDeepTree();
    const result = renderCard(parent, [], { termWidth: 80 });
    const lines = result.split('\n');
    // Tree lines start with '  ' (2-space indent) + box-drawing character
    const treeLines = lines.filter(l => l.includes('[l1111111]') || l.includes('[l2222222]') || l.includes('[l3333333]') || l.includes('[l4444444]'));
    assert.ok(treeLines.length >= 4, `Expected at least 4 tree lines (L1, L2, L3, sibling), got ${treeLines.length}`);
    for (const line of treeLines) {
      assert.equal(line.length, 80, `Tree line should be exactly 80 chars, got ${line.length}: "${line}"`);
    }
  });

  it('age column right-aligns consistently: all lines same length', () => {
    const parent = makeDeepTree();
    const result = renderCard(parent, [], { termWidth: 80 });
    const lines = result.split('\n');
    const treeLines = lines.filter(l => l.includes('[l1111111]') || l.includes('[l2222222]') || l.includes('[l3333333]') || l.includes('[l4444444]'));
    const lengths = treeLines.map(l => l.length);
    const unique = [...new Set(lengths)];
    assert.equal(unique.length, 1, `All tree lines should have the same length, but got: ${lengths.join(', ')}`);
  });
});
