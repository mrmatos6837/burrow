'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const {
  findById,
  findParent,
  getContainer,
  getPath,
  addCard,
  editCard,
  deleteCard,
  moveCard,

  renderTree,
  archiveCard,
  unarchiveCard,
  countDescendants,
  searchCards,
} = require('../.claude/burrow/lib/mongoose.cjs');

/**
 * Helper: create a fresh empty v2 data structure.
 */
function emptyData() {
  return { version: 2, cards: [] };
}

/**
 * Helper: create a populated v2 tree for testing.
 * Structure:
 *   root
 *     cardA
 *       childA1
 *         grandchild
 *       childA2
 *     cardB
 *     cardC
 */
function sampleTree() {
  return {
    version: 2,
    cards: [
      {
        id: 'aaaaaaaa',
        title: 'Card A',
        created: '2026-03-01T00:00:00.000Z',
        archived: false,
        body: '',
        children: [
          {
            id: 'a1a1a1a1',
            title: 'Child A1',
            created: '2026-03-01T01:00:00.000Z',
            archived: false,
            body: 'some notes',
            children: [
              {
                id: 'g1g1g1g1',
                title: 'Grandchild',
                created: '2026-03-01T02:00:00.000Z',
                archived: false,
                body: '',
                children: [],
              },
            ],
          },
          {
            id: 'a2a2a2a2',
            title: 'Child A2',
            created: '2026-03-01T01:30:00.000Z',
            archived: false,
            body: '',
            children: [],
          },
        ],
      },
      {
        id: 'bbbbbbbb',
        title: 'Card B',
        created: '2026-03-01T00:10:00.000Z',
        archived: false,
        body: '',
        children: [],
      },
      {
        id: 'cccccccc',
        title: 'Card C',
        created: '2026-03-01T00:20:00.000Z',
        archived: false,
        body: '',
        children: [],
      },
    ],
  };
}

describe('findById', () => {
  it('finds card at root level', () => {
    const data = sampleTree();
    const card = findById(data, 'bbbbbbbb');
    assert.ok(card);
    assert.equal(card.title, 'Card B');
  });

  it('finds card nested 3 levels deep', () => {
    const data = sampleTree();
    const card = findById(data, 'g1g1g1g1');
    assert.ok(card);
    assert.equal(card.title, 'Grandchild');
  });

  it('returns null for missing ID', () => {
    const data = sampleTree();
    assert.equal(findById(data, 'zzzzzzzz'), null);
  });
});

describe('findParent', () => {
  it('returns null parent and root array for root cards', () => {
    const data = sampleTree();
    const result = findParent(data, 'aaaaaaaa');
    assert.equal(result.parent, null);
    assert.ok(Array.isArray(result.container));
    assert.equal(result.container, data.cards);
  });

  it('returns parent card and children array for nested cards', () => {
    const data = sampleTree();
    const result = findParent(data, 'a1a1a1a1');
    assert.equal(result.parent.id, 'aaaaaaaa');
    assert.ok(Array.isArray(result.container));
    assert.equal(result.container, result.parent.children);
  });
});

describe('getContainer', () => {
  it('returns data.cards array when parentId is null', () => {
    const data = sampleTree();
    const container = getContainer(data, null);
    assert.ok(Array.isArray(container));
    assert.equal(container, data.cards);
  });

  it('returns data.cards array when parentId is undefined', () => {
    const data = sampleTree();
    const container = getContainer(data, undefined);
    assert.ok(Array.isArray(container));
    assert.equal(container, data.cards);
  });

  it('returns card.children array for valid parentId', () => {
    const data = sampleTree();
    const container = getContainer(data, 'aaaaaaaa');
    assert.ok(Array.isArray(container));
    assert.equal(container.length, 2);
  });

  it('returns null for invalid parentId', () => {
    const data = sampleTree();
    const result = getContainer(data, 'zzzzzzzz');
    assert.equal(result, null);
  });
});

describe('getPath', () => {
  it('returns path from root to deeply nested card', () => {
    const data = sampleTree();
    const p = getPath(data, 'g1g1g1g1');
    assert.ok(p);
    assert.equal(p.length, 3);
    assert.equal(p[0].id, 'aaaaaaaa');
    assert.equal(p[1].id, 'a1a1a1a1');
    assert.equal(p[2].id, 'g1g1g1g1');
  });

  it('returns single-element path for root card', () => {
    const data = sampleTree();
    const p = getPath(data, 'bbbbbbbb');
    assert.ok(p);
    assert.equal(p.length, 1);
    assert.equal(p[0].id, 'bbbbbbbb');
  });

  it('returns null for missing card', () => {
    const data = sampleTree();
    assert.equal(getPath(data, 'zzzzzzzz'), null);
  });
});

describe('addCard', () => {
  it('adds card to root with v2 schema', () => {
    const data = emptyData();
    const card = addCard(data, { title: 'First card' });
    assert.equal(card.title, 'First card');
    assert.ok(/^[0-9a-f]{8}$/.test(card.id), 'ID should be 8-char hex');
    assert.ok(card.created, 'should have created timestamp');
    assert.equal(card.body, '');
    assert.deepStrictEqual(card.children, []);
    assert.equal(card.position, undefined, 'no position field');
    assert.equal(card.notes, undefined, 'no notes field');
    assert.equal(data.cards.length, 1);
  });

  it('adds card as child of existing card', () => {
    const data = sampleTree();
    const card = addCard(data, { title: 'New child', parentId: 'bbbbbbbb' });
    assert.ok(card);
    const parent = findById(data, 'bbbbbbbb');
    assert.equal(parent.children.length, 1);
    assert.equal(parent.children[0].id, card.id);
  });

  it('adds card with body text', () => {
    const data = emptyData();
    const card = addCard(data, { title: 'With body', body: 'Hello world' });
    assert.equal(card.body, 'Hello world');
  });

  it('generates ISO 8601 timestamps', () => {
    const data = emptyData();
    const card = addCard(data, { title: 'Timestamp test' });
    const parsed = new Date(card.created);
    assert.ok(!isNaN(parsed.getTime()), 'created should be valid ISO date');
  });

  it('returns null for invalid parent', () => {
    const data = emptyData();
    const result = addCard(data, { title: 'Orphan', parentId: 'nonexist' });
    assert.equal(result, null);
  });

  it('inserts at position 0 (beginning)', () => {
    const data = emptyData();
    addCard(data, { title: 'First' });
    addCard(data, { title: 'Second' });
    addCard(data, { title: 'Inserted', position: 0 });
    assert.equal(data.cards.length, 3);
    assert.equal(data.cards[0].title, 'Inserted');
    assert.equal(data.cards[1].title, 'First');
    assert.equal(data.cards[2].title, 'Second');
  });

  it('inserts at position 1 among 3 siblings', () => {
    const data = emptyData();
    addCard(data, { title: 'A' });
    addCard(data, { title: 'B' });
    addCard(data, { title: 'C' });
    addCard(data, { title: 'Inserted', position: 1 });
    assert.equal(data.cards[0].title, 'A');
    assert.equal(data.cards[1].title, 'Inserted');
    assert.equal(data.cards[2].title, 'B');
    assert.equal(data.cards[3].title, 'C');
  });

  it('appends when position exceeds length', () => {
    const data = emptyData();
    addCard(data, { title: 'First' });
    addCard(data, { title: 'Appended', position: 99 });
    assert.equal(data.cards.length, 2);
    assert.equal(data.cards[1].title, 'Appended');
  });

  it('appends when no position given (backward compat)', () => {
    const data = emptyData();
    addCard(data, { title: 'First' });
    addCard(data, { title: 'Second' });
    assert.equal(data.cards[1].title, 'Second');
  });
});

describe('editCard', () => {
  it('edits title of existing card', () => {
    const data = sampleTree();
    const result = editCard(data, 'aaaaaaaa', { title: 'Renamed A' });
    assert.equal(result.title, 'Renamed A');
    assert.equal(findById(data, 'aaaaaaaa').title, 'Renamed A');
  });

  it('edits body of existing card', () => {
    const data = sampleTree();
    const result = editCard(data, 'bbbbbbbb', { body: 'Updated body' });
    assert.equal(result.body, 'Updated body');
  });

  it('returns null for missing ID', () => {
    const data = sampleTree();
    const result = editCard(data, 'zzzzzzzz', { title: 'Nope' });
    assert.equal(result, null);
  });
});

describe('deleteCard', () => {
  it('deletes a leaf card', () => {
    const data = sampleTree();
    const result = deleteCard(data, 'cccccccc');
    assert.equal(result.id, 'cccccccc');
    assert.equal(result.title, 'Card C');
    assert.equal(result.descendantCount, 0);
    assert.equal(data.cards.length, 2);
  });

  it('deletes card with children (descendants removed)', () => {
    const data = sampleTree();
    const result = deleteCard(data, 'aaaaaaaa');
    assert.equal(result.id, 'aaaaaaaa');
    assert.equal(result.descendantCount, 3);
    assert.equal(data.cards.length, 2);
    assert.equal(findById(data, 'a1a1a1a1'), null);
    assert.equal(findById(data, 'g1g1g1g1'), null);
  });

  it('returns null for missing ID', () => {
    const data = sampleTree();
    const result = deleteCard(data, 'zzzzzzzz');
    assert.equal(result, null);
  });
});

describe('moveCard', () => {
  it('moves card between parents', () => {
    const data = sampleTree();
    const result = moveCard(data, 'a2a2a2a2', 'bbbbbbbb');
    assert.ok(result);
    assert.equal(result.id, 'a2a2a2a2');
    const cardB = findById(data, 'bbbbbbbb');
    assert.equal(cardB.children.length, 1);
    assert.equal(cardB.children[0].id, 'a2a2a2a2');
    const cardA = findById(data, 'aaaaaaaa');
    assert.equal(cardA.children.length, 1);
  });

  it('moves card to root (parentId = null)', () => {
    const data = sampleTree();
    const result = moveCard(data, 'a1a1a1a1', null);
    assert.ok(result);
    assert.equal(data.cards.length, 4);
    assert.ok(data.cards.find((i) => i.id === 'a1a1a1a1'));
  });

  it('rejects cycle (moving parent into its own child)', () => {
    const data = sampleTree();
    const result = moveCard(data, 'aaaaaaaa', 'g1g1g1g1');
    assert.equal(result, null);
    assert.equal(data.cards.length, 3);
    assert.equal(data.cards[0].id, 'aaaaaaaa');
  });

  it('moves card with requestedPosition', () => {
    const data = sampleTree();
    // Move cardC to position 0 at root
    const result = moveCard(data, 'cccccccc', null, 0);
    assert.ok(result);
    assert.equal(data.cards[0].id, 'cccccccc');
  });

  it('moved card has no position field', () => {
    const data = sampleTree();
    const result = moveCard(data, 'a2a2a2a2', 'bbbbbbbb');
    assert.equal(result.position, undefined);
  });

  it('returns null for missing card ID', () => {
    const data = sampleTree();
    const result = moveCard(data, 'zzzzzzzz', 'bbbbbbbb');
    assert.equal(result, null);
  });
});

describe('removed exports', () => {
  it('recompact is not exported', () => {
    const mongoose = require('../.claude/burrow/lib/mongoose.cjs');
    assert.equal(mongoose.recompact, undefined);
  });

  it('getOrderedChildren is not exported', () => {
    const mongoose = require('../.claude/burrow/lib/mongoose.cjs');
    assert.equal(mongoose.getOrderedChildren, undefined);
  });

  it('getChildren is not exported', () => {
    const mongoose = require('../.claude/burrow/lib/mongoose.cjs');
    assert.equal(mongoose.getChildren, undefined);
  });

  it('listCards is not exported', () => {
    const mongoose = require('../.claude/burrow/lib/mongoose.cjs');
    assert.equal(mongoose.listCards, undefined);
  });
});

describe('ID generation', () => {
  it('generates 8-char hex IDs', () => {
    const data = emptyData();
    const card = addCard(data, { title: 'Test' });
    assert.match(card.id, /^[0-9a-f]{8}$/);
  });
});

describe('makePreview optimizations (PERF-08)', () => {
  const mongoose = require('../.claude/burrow/lib/mongoose.cjs');

  it('makePreview is exported', () => {
    assert.equal(typeof mongoose.makePreview, 'function', 'makePreview should be exported');
  });

  it('short body with newlines: replaces newlines, no truncation', () => {
    const result = mongoose.makePreview('short\nbody');
    assert.equal(result, 'short body');
  });

  it('80-char body with newlines: returns full cleaned string (no truncation)', () => {
    const body = 'A'.repeat(40) + '\n' + 'B'.repeat(39);
    const result = mongoose.makePreview(body);
    // 40 chars + space (replacing \n) + 39 chars = 80 chars
    assert.equal(result.length, 80);
    assert.ok(!result.includes('...'));
  });

  it('huge body (10000 chars): result length <= 83 chars', () => {
    const hugeBody = 'x'.repeat(10000);
    const result = mongoose.makePreview(hugeBody);
    assert.ok(result.length <= 83, `Expected <= 83 chars, got ${result.length}`);
    assert.ok(result.endsWith('...'));
  });

  it('huge body with newlines: truncates before processing extra newlines', () => {
    // Newlines after position 83 should never be processed (truncate-first)
    const body = 'a'.repeat(40) + '\n' + 'b'.repeat(40) + '\n'.repeat(9916);
    const result = mongoose.makePreview(body);
    assert.ok(result.length <= 83, `Expected <= 83 chars, got ${result.length}`);
  });
});

describe('addCard without collectAllIds (PERF-10)', () => {
  it('addCard generates unique IDs across 100 sequential adds', () => {
    const data = emptyData();
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      const card = addCard(data, { title: `Card ${i}` });
      assert.ok(card, `Card ${i} should be created`);
      assert.ok(!ids.has(card.id), `Duplicate ID detected: ${card.id}`);
      ids.add(card.id);
    }
    assert.equal(ids.size, 100, 'All 100 IDs should be unique');
  });

  it('addCard generates valid 8-char hex ID each time', () => {
    const data = emptyData();
    for (let i = 0; i < 10; i++) {
      const card = addCard(data, { title: `Card ${i}` });
      assert.match(card.id, /^[0-9a-f]{8}$/, `ID ${card.id} should be 8-char hex`);
    }
  });
});

/**
 * Helper: create a tree with body content and archived cards for render/archive tests.
 * Structure:
 *   root
 *     cardA (body: "Card A has a body with some content")
 *       childA1 (body: "some notes", archived: false)
 *         grandchild (archived: true)
 *       childA2 (archived: true)
 *     cardB (body: long text > 80 chars)
 *     cardC (archived: true)
 */
function sampleTreeWithArchived() {
  return {
    version: 2,
    cards: [
      {
        id: 'aaaaaaaa',
        title: 'Card A',
        created: '2026-03-01T00:00:00.000Z',
        archived: false,
        body: 'Card A has a body with some content',
        children: [
          {
            id: 'a1a1a1a1',
            title: 'Child A1',
            created: '2026-03-01T01:00:00.000Z',
            archived: false,
            body: 'some notes',
            children: [
              {
                id: 'g1g1g1g1',
                title: 'Grandchild',
                created: '2026-03-01T02:00:00.000Z',
                archived: true,
                body: '',
                children: [],
              },
            ],
          },
          {
            id: 'a2a2a2a2',
            title: 'Child A2',
            created: '2026-03-01T01:30:00.000Z',
            archived: true,
            body: '',
            children: [],
          },
        ],
      },
      {
        id: 'bbbbbbbb',
        title: 'Card B',
        created: '2026-03-01T00:10:00.000Z',
        archived: false,
        body: 'This is a very long body text that exceeds eighty characters in length so we can test the truncation behavior of bodyPreview properly',
        children: [],
      },
      {
        id: 'cccccccc',
        title: 'Card C',
        created: '2026-03-01T00:20:00.000Z',
        archived: true,
        body: '',
        children: [],
      },
    ],
  };
}

/**
 * Helper: tree with body content but no archived cards.
 */
function sampleTreeWithBody() {
  const data = sampleTree();
  data.cards[0].body = 'Card A body';
  data.cards[0].children[0].body = 'some notes';
  data.cards[1].body = 'This is a very long body text that exceeds eighty characters in length so we can test the truncation behavior of bodyPreview properly';
  // cardC body stays empty, childA2 body stays empty, grandchild body stays empty
  return data;
}

describe('countActiveDescendants (removed — covered by countDescendants activeOnly)', () => {
  it('countDescendants(card, { activeOnly: true }) returns 0 for leaf card', () => {
    const data = sampleTree();
    const card = findById(data, 'cccccccc');
    assert.equal(countDescendants(card, { activeOnly: true }), 0);
  });

  it('countDescendants(card, { activeOnly: true }) counts only active, skips archived subtrees', () => {
    const data = sampleTreeWithArchived();
    const cardA = findById(data, 'aaaaaaaa');
    // childA1 is active (1), grandchild is archived (skipped), childA2 is archived (skipped)
    assert.equal(countDescendants(cardA, { activeOnly: true }), 1);
  });

  it('countDescendants(card) counts all children when none archived', () => {
    const data = sampleTree();
    const cardA = findById(data, 'aaaaaaaa');
    // childA1 (1) + grandchild (1) + childA2 (1) = 3
    assert.equal(countDescendants(cardA), 3);
  });
});

describe('countDescendants (parameterized)', () => {
  it('countDescendants(card) counts all descendants (no opts)', () => {
    const data = sampleTree();
    const cardA = findById(data, 'aaaaaaaa');
    // childA1 (1) + grandchild (1) + childA2 (1) = 3
    assert.equal(countDescendants(cardA), 3);
  });

  it('countDescendants(card) returns 0 for leaf', () => {
    const data = sampleTree();
    const card = findById(data, 'cccccccc');
    assert.equal(countDescendants(card), 0);
  });

  it('countDescendants(card, { activeOnly: true }) skips archived and their subtrees', () => {
    const data = sampleTreeWithArchived();
    const cardA = findById(data, 'aaaaaaaa');
    // childA1 active (1), grandchild archived (skipped), childA2 archived (skipped) = 1
    assert.equal(countDescendants(cardA, { activeOnly: true }), 1);
  });

  it('countDescendants(card, { activeOnly: false }) counts all descendants', () => {
    const data = sampleTreeWithArchived();
    const cardA = findById(data, 'aaaaaaaa');
    // childA1 (1) + grandchild (1) + childA2 (1) = 3
    assert.equal(countDescendants(cardA, { activeOnly: false }), 3);
  });

  it('countDescendants(card, { activeOnly: true }) returns 0 for leaf', () => {
    const data = sampleTree();
    const card = findById(data, 'cccccccc');
    assert.equal(countDescendants(card, { activeOnly: true }), 0);
  });

  it('countActiveDescendants is NOT exported (function removed)', () => {
    const mongoose = require('../.claude/burrow/lib/mongoose.cjs');
    assert.equal(mongoose.countActiveDescendants, undefined);
  });
});

/**
 * Helper: flatten a nested card tree into an array (for archive filter assertions).
 */
function flattenCards(cards) {
  const result = [];
  for (const card of cards) {
    result.push(card);
    if (card.children && card.children.length) {
      for (const c of flattenCards(card.children)) {
        result.push(c);
      }
    }
  }
  return result;
}

describe('renderTree', () => {
  it('root view (no rootId): returns root cards as nested tree with breadcrumbs null', () => {
    const data = sampleTreeWithBody();
    const result = renderTree(data, null, { depth: 0 });
    assert.equal(result.breadcrumbs, null);
    // depth 0 = full tree, root level has 3 cards
    assert.equal(result.cards.length, 3);
    // No depth property on cards (depth is implicit from nesting)
    assert.equal(result.cards[0].depth, undefined);
  });

  it('root view with depth 1: root cards have children arrays limited to direct children', () => {
    const data = sampleTree();
    const result = renderTree(data, null, { depth: 1 });
    assert.equal(result.breadcrumbs, null);
    // 3 root cards
    assert.equal(result.cards.length, 3);
    // Card A has 2 direct children
    const cardA = result.cards.find((c) => c.id === 'aaaaaaaa');
    assert.equal(cardA.children.length, 2);
    // Children at maxDepth have empty children arrays (depth-limited)
    assert.equal(cardA.children[0].children.length, 0);
  });

  it('root view with depth 0: full tree, grandchild accessible via nesting', () => {
    const data = sampleTree();
    const result = renderTree(data, null, { depth: 0 });
    // 3 root cards
    assert.equal(result.cards.length, 3);
    // Grandchild accessible via Card A > Child A1 > Grandchild
    const cardA = result.cards.find((c) => c.id === 'aaaaaaaa');
    const childA1 = cardA.children.find((c) => c.id === 'a1a1a1a1');
    assert.ok(childA1, 'Child A1 should be nested under Card A');
    const grandchild = childA1.children.find((c) => c.id === 'g1g1g1g1');
    assert.ok(grandchild, 'Grandchild should be nested under Child A1');
  });

  it('focused view: rootId specified, breadcrumbs show ancestors, root card as single-element cards array', () => {
    const data = sampleTree();
    const result = renderTree(data, 'a1a1a1a1');
    assert.ok(result.breadcrumbs);
    assert.equal(result.breadcrumbs.length, 1);
    assert.equal(result.breadcrumbs[0].id, 'aaaaaaaa');
    assert.equal(result.breadcrumbs[0].title, 'Card A');
    // cards array contains the single root card
    assert.equal(result.cards.length, 1);
    assert.equal(result.cards[0].id, 'a1a1a1a1');
  });

  it('focused view depth 2: shows 2 levels via nesting', () => {
    const data = sampleTree();
    const result = renderTree(data, 'aaaaaaaa', { depth: 2 });
    // cards has Card A as single root
    assert.equal(result.cards.length, 1);
    assert.equal(result.cards[0].id, 'aaaaaaaa');
    // Card A has children
    const cardA = result.cards[0];
    assert.ok(cardA.children.length > 0, 'Card A should have children');
    // grandchild accessible at depth 2 (Card A > Child A1 > Grandchild)
    const childA1 = cardA.children.find((c) => c.id === 'a1a1a1a1');
    assert.ok(childA1, 'Child A1 should be present');
    const grandchild = childA1.children.find((c) => c.id === 'g1g1g1g1');
    assert.ok(grandchild, 'Grandchild should be at depth 2');
  });

  it('default depth (no depth arg): card + direct children only', () => {
    const data = sampleTree();
    const result = renderTree(data, 'aaaaaaaa');
    // Default depth=1: Card A as root, children nested, grandchildren empty
    assert.equal(result.cards.length, 1);
    const cardA = result.cards[0];
    assert.equal(cardA.id, 'aaaaaaaa');
    assert.ok(cardA.children.length > 0, 'Should have children');
    // Children at maxDepth=1 have empty children arrays
    for (const child of cardA.children) {
      assert.equal(child.children.length, 0, 'Grandchildren not included at default depth 1');
    }
  });

  it('archive filter active: excludes archived cards from nested tree', () => {
    const data = sampleTreeWithArchived();
    const result = renderTree(data, null, { depth: 0, archiveFilter: 'active' });
    const allCards = flattenCards(result.cards);
    const ids = allCards.map((c) => c.id);
    assert.ok(!ids.includes('cccccccc')); // Card C is archived
    assert.ok(!ids.includes('a2a2a2a2')); // Child A2 is archived
    assert.ok(!ids.includes('g1g1g1g1')); // Grandchild is archived
    assert.ok(ids.includes('aaaaaaaa'));
    assert.ok(ids.includes('a1a1a1a1'));
    assert.ok(ids.includes('bbbbbbbb'));
  });

  it('archive filter archived-only: shows only archived cards in tree', () => {
    const data = sampleTreeWithArchived();
    const result = renderTree(data, null, { depth: 0, archiveFilter: 'archived-only' });
    const allCards = flattenCards(result.cards);
    for (const card of allCards) {
      assert.equal(card.archived, true);
    }
    assert.ok(allCards.length > 0);
  });

  it('archive filter include-archived: shows all 6 cards in tree', () => {
    const data = sampleTreeWithArchived();
    const result = renderTree(data, null, { depth: 0, archiveFilter: 'include-archived' });
    const allCards = flattenCards(result.cards);
    // Should include all 6 cards
    assert.equal(allCards.length, 6);
  });

  it('render entry has correct fields (no depth, has children)', () => {
    const data = sampleTreeWithBody();
    const result = renderTree(data, null, { depth: 1 });
    const entry = result.cards[0]; // Card A
    assert.ok('id' in entry);
    assert.ok('title' in entry);
    assert.ok(!('depth' in entry), 'depth field should NOT be in new output');
    assert.ok('children' in entry, 'children array should be present');
    assert.ok('descendantCount' in entry);
    assert.ok('hasBody' in entry);
    assert.ok('bodyPreview' in entry);
    assert.ok('created' in entry);
    assert.ok('archived' in entry);
  });

  it('bodyPreview truncates at 80 chars with "..."', () => {
    const data = sampleTreeWithBody();
    const result = renderTree(data, null, { depth: 1 });
    const cardB = result.cards.find((c) => c.id === 'bbbbbbbb');
    assert.ok(cardB.bodyPreview.length <= 83); // 80 + '...'
    assert.ok(cardB.bodyPreview.endsWith('...'));
  });

  it('bodyPreview replaces newlines with spaces', () => {
    const data = sampleTree();
    data.cards[0].body = 'line one\nline two\nline three';
    const result = renderTree(data, null, { depth: 1 });
    const cardA = result.cards.find((c) => c.id === 'aaaaaaaa');
    assert.ok(!cardA.bodyPreview.includes('\n'));
    assert.ok(cardA.bodyPreview.includes('line one line two'));
  });

  it('hasBody false for empty/whitespace-only body', () => {
    const data = sampleTree();
    data.cards[2].body = '   '; // whitespace only
    const result = renderTree(data, null, { depth: 1 });
    const cardC = result.cards.find((c) => c.id === 'cccccccc');
    assert.equal(cardC.hasBody, false);
    const cardB = result.cards.find((c) => c.id === 'bbbbbbbb');
    assert.equal(cardB.hasBody, false); // empty string
  });

  it('returns null for nonexistent rootId', () => {
    const data = sampleTree();
    const result = renderTree(data, 'zzzzzzzz');
    assert.equal(result, null);
  });

  it('descendantCount uses active-only count', () => {
    const data = sampleTreeWithArchived();
    const result = renderTree(data, null, { depth: 0, archiveFilter: 'include-archived' });
    const cardA = result.cards.find((c) => c.id === 'aaaaaaaa');
    // childA1 active (1), grandchild archived (0), childA2 archived (0) = 1
    assert.equal(cardA.descendantCount, 1);
  });

  it('cards at maxDepth have empty children array', () => {
    const data = sampleTree();
    const result = renderTree(data, null, { depth: 1 });
    const cardA = result.cards.find((c) => c.id === 'aaaaaaaa');
    // childA1 has a grandchild but depth=1 so its children array should be empty
    const childA1 = cardA.children.find((c) => c.id === 'a1a1a1a1');
    assert.ok(childA1, 'Child A1 should exist');
    assert.deepEqual(childA1.children, [], 'Children at maxDepth should be empty array');
  });
});

describe('renderTree descendantCount optimization (PERF-07)', () => {
  it('root card descendantCount matches active children count via buildNested (rootId specified)', () => {
    const data = sampleTree();
    // Card A has: childA1 (1 active descendant: grandchild) + childA2 (0) = 3 total
    const result = renderTree(data, 'aaaaaaaa', { depth: 0 });
    assert.equal(result.cards.length, 1);
    const rootCard = result.cards[0];
    // childA1 (1) + grandchild via childA1 (1) + childA2 (1) = 3
    assert.equal(rootCard.descendantCount, 3, 'Root card descendantCount should be 3');
  });

  it('root card descendantCount with archived children only counts active (rootId specified)', () => {
    const data = sampleTreeWithArchived();
    // Card A: childA1 active (1), grandchild archived (skipped), childA2 archived (skipped) = 1
    const result = renderTree(data, 'aaaaaaaa', { depth: 0 });
    assert.equal(result.cards.length, 1);
    const rootCard = result.cards[0];
    assert.equal(rootCard.descendantCount, 1, 'Root card descendantCount should exclude archived descendants');
  });

  it('root card descendantCount equals sum of (1 + child.descendantCount) for each active child', () => {
    const data = sampleTree();
    const result = renderTree(data, 'aaaaaaaa', { depth: 0 });
    const rootCard = result.cards[0];
    // Children: childA1 (descendantCount=1), childA2 (descendantCount=0)
    // Expected: (1 + 1) + (1 + 0) = 3
    const expectedFromChildren = rootCard.children.reduce(
      (sum, child) => sum + 1 + (child.descendantCount || 0), 0
    );
    assert.equal(rootCard.descendantCount, expectedFromChildren,
      'Root card descendantCount should equal sum of (1 + child.descendantCount) for each child');
  });

  it('descendantCount with depth limit still shows full active descendant count (not depth-limited)', () => {
    const data = sampleTree();
    // With depth=1: Card A shows direct children but grandchild is hidden in children array
    // But descendantCount should still count ALL active descendants (3), not just visible ones
    const resultDepth1 = renderTree(data, 'aaaaaaaa', { depth: 1 });
    const resultDepthFull = renderTree(data, 'aaaaaaaa', { depth: 0 });
    // descendantCount should be the same regardless of depth limit
    assert.equal(resultDepth1.cards[0].descendantCount, resultDepthFull.cards[0].descendantCount,
      'descendantCount should be same regardless of depth limit');
    assert.equal(resultDepth1.cards[0].descendantCount, 3,
      'descendantCount should be 3 even when depth=1 hides grandchild');
  });

  it('card with 3 active children and 1 archived child has descendantCount of 3', () => {
    const data = {
      version: 2,
      cards: [
        {
          id: 'root0000',
          title: 'Root',
          created: '2026-03-01T00:00:00.000Z',
          archived: false,
          body: '',
          children: [
            { id: 'ch000001', title: 'Active 1', created: '2026-03-01T00:00:00.000Z', archived: false, body: '', children: [] },
            { id: 'ch000002', title: 'Active 2', created: '2026-03-01T00:00:00.000Z', archived: false, body: '', children: [] },
            { id: 'ch000003', title: 'Active 3', created: '2026-03-01T00:00:00.000Z', archived: false, body: '', children: [] },
            { id: 'ch000004', title: 'Archived', created: '2026-03-01T00:00:00.000Z', archived: true, body: '', children: [] },
          ],
        },
      ],
    };
    const result = renderTree(data, 'root0000', { depth: 0 });
    assert.equal(result.cards[0].descendantCount, 3,
      'descendantCount should be 3 (not 4) — archived child excluded');
  });

  it('root view (no rootId): each top-level card has correct descendantCount', () => {
    const data = sampleTree();
    const result = renderTree(data, null, { depth: 0 });
    const cardA = result.cards.find(c => c.id === 'aaaaaaaa');
    const cardB = result.cards.find(c => c.id === 'bbbbbbbb');
    const cardC = result.cards.find(c => c.id === 'cccccccc');
    assert.equal(cardA.descendantCount, 3, 'Card A should have 3 active descendants');
    assert.equal(cardB.descendantCount, 0, 'Card B should have 0 descendants');
    assert.equal(cardC.descendantCount, 0, 'Card C should have 0 descendants');
  });
});

describe('archiveCard', () => {
  it('archives card and all descendants', () => {
    const data = sampleTree();
    const result = archiveCard(data, 'aaaaaaaa');
    assert.ok(result);
    const cardA = findById(data, 'aaaaaaaa');
    assert.equal(cardA.archived, true);
    const childA1 = findById(data, 'a1a1a1a1');
    assert.equal(childA1.archived, true);
    const grandchild = findById(data, 'g1g1g1g1');
    assert.equal(grandchild.archived, true);
    const childA2 = findById(data, 'a2a2a2a2');
    assert.equal(childA2.archived, true);
  });

  it('returns {id, title, descendantCount}', () => {
    const data = sampleTree();
    const result = archiveCard(data, 'aaaaaaaa');
    assert.equal(result.id, 'aaaaaaaa');
    assert.equal(result.title, 'Card A');
    assert.equal(result.descendantCount, 3);
  });

  it('returns null for missing id', () => {
    const data = sampleTree();
    const result = archiveCard(data, 'zzzzzzzz');
    assert.equal(result, null);
  });
});

describe('unarchiveCard', () => {
  it('unarchives card and all descendants', () => {
    const data = sampleTreeWithArchived();
    // Grandchild and childA2 are archived
    const result = unarchiveCard(data, 'aaaaaaaa');
    assert.ok(result);
    const childA2 = findById(data, 'a2a2a2a2');
    assert.equal(childA2.archived, false);
    const grandchild = findById(data, 'g1g1g1g1');
    assert.equal(grandchild.archived, false);
  });

  it('returns {id, title, descendantCount}', () => {
    const data = sampleTreeWithArchived();
    const result = unarchiveCard(data, 'cccccccc');
    assert.equal(result.id, 'cccccccc');
    assert.equal(result.title, 'Card C');
    assert.equal(result.descendantCount, 0);
  });

  it('returns null for missing id', () => {
    const data = sampleTree();
    const result = unarchiveCard(data, 'zzzzzzzz');
    assert.equal(result, null);
  });
});

describe('archiveCard full return shape (API-01 + PERF-03)', () => {
  it('archiveCard returns full card shape including body, created, archived, children', () => {
    const data = sampleTree();
    const result = archiveCard(data, 'aaaaaaaa');
    assert.ok(result);
    assert.equal(result.id, 'aaaaaaaa');
    assert.equal(result.title, 'Card A');
    assert.equal(result.archived, true);
    assert.ok('body' in result, 'result should have body field');
    assert.ok('created' in result, 'result should have created field');
    assert.ok('children' in result, 'result should have children field');
    assert.equal(result.descendantCount, 3);
  });

  it('archiveCard descendantCount is computed during recursion (total descendants)', () => {
    const data = sampleTree();
    // Card A has 3 descendants: childA1, grandchild, childA2
    const result = archiveCard(data, 'aaaaaaaa');
    assert.equal(result.descendantCount, 3);
  });

  it('unarchiveCard returns full card shape including body, created, archived, children', () => {
    const data = sampleTreeWithArchived();
    const result = unarchiveCard(data, 'aaaaaaaa');
    assert.ok(result);
    assert.equal(result.id, 'aaaaaaaa');
    assert.equal(result.title, 'Card A');
    assert.equal(result.archived, false);
    assert.ok('body' in result, 'result should have body field');
    assert.ok('created' in result, 'result should have created field');
    assert.ok('children' in result, 'result should have children field');
    assert.ok('descendantCount' in result, 'result should have descendantCount field');
  });

  it('unarchiveCard descendantCount is total descendants (all nodes set to unarchived)', () => {
    const data = sampleTreeWithArchived();
    // Card A: childA1 (1) + grandchild (1) + childA2 (1) = 3
    const result = unarchiveCard(data, 'aaaaaaaa');
    assert.equal(result.descendantCount, 3);
  });
});

describe('searchCards (API-02)', () => {
  it('searchCards is exported', () => {
    const mongoose = require('../.claude/burrow/lib/mongoose.cjs');
    assert.equal(typeof mongoose.searchCards, 'function', 'searchCards should be exported');
  });

  it('finds matching cards by title (case-insensitive)', () => {
    const data = sampleTree();
    const results = searchCards(data, 'card a');
    assert.ok(results.length >= 1, 'Should find Card A');
    const match = results.find((r) => r.id === 'aaaaaaaa');
    assert.ok(match, 'Should find Card A by ID');
    assert.equal(match.title, 'Card A');
  });

  it('returns path as breadcrumb string for nested match', () => {
    const data = sampleTree();
    const results = searchCards(data, 'grandchild');
    assert.ok(results.length >= 1, 'Should find Grandchild');
    const match = results[0];
    assert.ok(match.path.includes('Card A'), 'Path should include ancestor');
    assert.ok(match.path.includes('Child A1'), 'Path should include parent');
    assert.ok(match.path.includes('Grandchild'), 'Path should include the card itself');
  });

  it('returns empty array when no matches', () => {
    const data = sampleTree();
    const results = searchCards(data, 'zzznomatch');
    assert.deepEqual(results, []);
  });

  it('skips archived cards', () => {
    const data = sampleTreeWithArchived();
    // Child A2 is archived
    const results = searchCards(data, 'child a2');
    assert.equal(results.length, 0, 'Should not find archived card');
  });

  it('returns result with {id, title, path} shape', () => {
    const data = sampleTree();
    const results = searchCards(data, 'card b');
    assert.ok(results.length >= 1);
    const match = results[0];
    assert.ok('id' in match, 'Should have id');
    assert.ok('title' in match, 'Should have title');
    assert.ok('path' in match, 'Should have path');
  });

  it('finds multiple matches', () => {
    const data = sampleTree();
    // "Card" appears in Card A, Card B, Card C
    const results = searchCards(data, 'card');
    assert.ok(results.length >= 3, 'Should find multiple matching cards');
  });
});

describe('renderTree depth validation (QUAL-03)', () => {
  it('renderTree with string depth throws error', () => {
    const data = sampleTree();
    assert.throws(() => {
      renderTree(data, null, { depth: 'abc' });
    }, /depth.*number|number.*depth/i, 'Should throw about depth being a number');
  });

  it('renderTree with numeric depth works normally', () => {
    const data = sampleTree();
    assert.doesNotThrow(() => {
      renderTree(data, null, { depth: 1 });
    });
  });

  it('renderTree with undefined depth works normally (default)', () => {
    const data = sampleTree();
    assert.doesNotThrow(() => {
      renderTree(data, null, {});
    });
  });
});

describe('PREVIEW_TRUNCATE_LENGTH constant (QUAL-04)', () => {
  it('PREVIEW_TRUNCATE_LENGTH is exported from mongoose.cjs', () => {
    const mongoose = require('../.claude/burrow/lib/mongoose.cjs');
    assert.equal(typeof mongoose.PREVIEW_TRUNCATE_LENGTH, 'number', 'PREVIEW_TRUNCATE_LENGTH should be a number');
    assert.equal(mongoose.PREVIEW_TRUNCATE_LENGTH, 80, 'PREVIEW_TRUNCATE_LENGTH should be 80');
  });
});

describe('deleteCard full return shape (API-01)', () => {
  it('deleteCard returns full card object with all fields', () => {
    const data = sampleTree();
    const result = deleteCard(data, 'aaaaaaaa');
    assert.ok(result);
    assert.equal(result.id, 'aaaaaaaa');
    assert.equal(result.title, 'Card A');
    assert.ok('body' in result, 'result should have body field');
    assert.ok('created' in result, 'result should have created field');
    assert.ok('archived' in result, 'result should have archived field');
    assert.ok('children' in result, 'result should have children field');
    assert.equal(result.descendantCount, 3);
  });

  it('deleteCard returns leaf card with all fields and descendantCount 0', () => {
    const data = sampleTree();
    const result = deleteCard(data, 'cccccccc');
    assert.ok(result);
    assert.equal(result.id, 'cccccccc');
    assert.equal(result.title, 'Card C');
    assert.ok('body' in result);
    assert.ok('created' in result);
    assert.ok('archived' in result);
    assert.ok(Array.isArray(result.children), 'children should be array');
    assert.equal(result.descendantCount, 0);
  });

  it('deleteCard children array in result is the removed card subtree', () => {
    const data = sampleTree();
    const result = deleteCard(data, 'aaaaaaaa');
    // Card A had 2 direct children before deletion
    assert.ok(Array.isArray(result.children));
    assert.equal(result.children.length, 2);
  });
});
