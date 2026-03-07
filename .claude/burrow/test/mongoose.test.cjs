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
  getChildren,
  listCards,
} = require('../lib/mongoose.cjs');

/**
 * Helper: create a fresh empty data structure.
 */
function emptyData() {
  return { version: 1, ordering: 'custom', cards: [] };
}

/**
 * Helper: create a populated tree for testing.
 * Structure:
 *   root
 *     cardA (pos 0)
 *       childA1 (pos 0)
 *         grandchild (pos 0)
 *       childA2 (pos 1)
 *     cardB (pos 1)
 *     cardC (pos 2)
 */
function sampleTree() {
  return {
    version: 1,
    ordering: 'custom',
    cards: [
      {
        id: 'aaaaaaaa',
        title: 'Card A',
        position: 0,
        created: '2026-03-01T00:00:00.000Z',
        archived: false,
        notes: '',
        children: {
          ordering: 'custom',
          cards: [
            {
              id: 'a1a1a1a1',
              title: 'Child A1',
              position: 0,
              created: '2026-03-01T01:00:00.000Z',
              archived: false,
              notes: 'some notes',
              children: {
                ordering: 'custom',
                cards: [
                  {
                    id: 'g1g1g1g1',
                    title: 'Grandchild',
                    position: 0,
                    created: '2026-03-01T02:00:00.000Z',
                    archived: false,
                    notes: '',
                    children: { ordering: 'custom', cards: [] },
                  },
                ],
              },
            },
            {
              id: 'a2a2a2a2',
              title: 'Child A2',
              position: 1,
              created: '2026-03-01T01:30:00.000Z',
              archived: false,
              notes: '',
              children: { ordering: 'custom', cards: [] },
            },
          ],
        },
      },
      {
        id: 'bbbbbbbb',
        title: 'Card B',
        position: 1,
        created: '2026-03-01T00:10:00.000Z',
        archived: false,
        notes: '',
        children: { ordering: 'custom', cards: [] },
      },
      {
        id: 'cccccccc',
        title: 'Card C',
        position: 2,
        created: '2026-03-01T00:20:00.000Z',
        archived: false,
        notes: '',
        children: { ordering: 'custom', cards: [] },
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
  it('returns null parent for root cards', () => {
    const data = sampleTree();
    const result = findParent(data, 'aaaaaaaa');
    assert.equal(result.parent, null);
    assert.ok(result.container);
    assert.equal(result.container.ordering, 'custom');
  });

  it('returns parent card for nested cards', () => {
    const data = sampleTree();
    const result = findParent(data, 'a1a1a1a1');
    assert.equal(result.parent.id, 'aaaaaaaa');
    assert.equal(result.container.ordering, 'custom');
  });
});

describe('getContainer', () => {
  it('returns root data when parentId is null', () => {
    const data = sampleTree();
    const container = getContainer(data, null);
    assert.equal(container, data);
  });

  it('returns root data when parentId is undefined', () => {
    const data = sampleTree();
    const container = getContainer(data, undefined);
    assert.equal(container, data);
  });

  it('returns card.children for valid parentId', () => {
    const data = sampleTree();
    const container = getContainer(data, 'aaaaaaaa');
    assert.equal(container.ordering, 'custom');
    assert.equal(container.cards.length, 2);
  });

  it('returns error result for invalid parentId', () => {
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
  it('adds card to root with custom ordering, gets last position', () => {
    const data = emptyData();
    const card = addCard(data, { title: 'First card' });
    assert.equal(card.position, 0);
    assert.equal(card.title, 'First card');
    assert.ok(/^[0-9a-f]{8}$/.test(card.id), 'ID should be 8-char hex');
    assert.ok(card.created, 'should have created timestamp');
    assert.deepStrictEqual(card.children, { ordering: 'custom', cards: [] });
    assert.equal(data.cards.length, 1);
  });

  it('adds card as child of existing card', () => {
    const data = sampleTree();
    const card = addCard(data, { title: 'New child', parentId: 'bbbbbbbb' });
    assert.ok(card);
    assert.equal(card.position, 0);
    const parent = findById(data, 'bbbbbbbb');
    assert.equal(parent.children.cards.length, 1);
    assert.equal(parent.children.cards[0].id, card.id);
  });

  it('adds card with explicit --position override', () => {
    const data = sampleTree();
    // sampleTree root has 3 cards at pos 0,1,2
    const card = addCard(data, { title: 'Inserted', position: 1 });
    assert.equal(card.position, 1);
  });

  it('adds card to alpha-asc parent (position set to 0)', () => {
    const data = sampleTree();
    // Change Card A's children ordering to alpha-asc
    data.cards[0].children.ordering = 'alpha-asc';
    const card = addCard(data, { title: 'Zeta child', parentId: 'aaaaaaaa' });
    assert.equal(card.position, 0, 'alpha-ordered cards have position 0 (irrelevant for sorting)');
  });

  it('generates ISO 8601 timestamps', () => {
    const data = emptyData();
    const card = addCard(data, { title: 'Timestamp test' });
    // ISO 8601 check
    const parsed = new Date(card.created);
    assert.ok(!isNaN(parsed.getTime()), 'created should be valid ISO date');
  });
});

describe('editCard', () => {
  it('edits title of existing card', () => {
    const data = sampleTree();
    const result = editCard(data, 'aaaaaaaa', { title: 'Renamed A' });
    assert.equal(result.title, 'Renamed A');
    assert.equal(findById(data, 'aaaaaaaa').title, 'Renamed A');
  });

  it('edits notes of existing card', () => {
    const data = sampleTree();
    const result = editCard(data, 'bbbbbbbb', { notes: 'Updated notes' });
    assert.equal(result.notes, 'Updated notes');
  });

  it('edits ordering of a card (updates children.ordering)', () => {
    const data = sampleTree();
    const result = editCard(data, 'aaaaaaaa', { ordering: 'alpha-asc' });
    assert.equal(result.children.ordering, 'alpha-asc');
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
    assert.equal(result.descendantCount, 3); // childA1, childA2, grandchild
    assert.equal(data.cards.length, 2);
    // Verify descendants are gone
    assert.equal(findById(data, 'a1a1a1a1'), null);
    assert.equal(findById(data, 'g1g1g1g1'), null);
  });

  it('recompacts positions after delete', () => {
    const data = sampleTree();
    deleteCard(data, 'bbbbbbbb'); // was pos 1
    // Remaining: Card A (pos 0), Card C (was pos 2, now should be pos 1)
    const cardC = findById(data, 'cccccccc');
    assert.equal(cardC.position, 1);
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
    // Move childA2 under Card B
    const result = moveCard(data, 'a2a2a2a2', 'bbbbbbbb');
    assert.ok(result);
    assert.equal(result.id, 'a2a2a2a2');
    const cardB = findById(data, 'bbbbbbbb');
    assert.equal(cardB.children.cards.length, 1);
    assert.equal(cardB.children.cards[0].id, 'a2a2a2a2');
    // Removed from Card A
    const cardA = findById(data, 'aaaaaaaa');
    assert.equal(cardA.children.cards.length, 1); // only childA1 remains
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
    // Move Card A into its own grandchild -- should be rejected
    const result = moveCard(data, 'aaaaaaaa', 'g1g1g1g1');
    assert.equal(result, null);
    // Tree should be unchanged
    assert.equal(data.cards.length, 3);
    assert.equal(data.cards[0].id, 'aaaaaaaa');
  });

  it('recompacts positions at source after move', () => {
    const data = sampleTree();
    // Card A has childA1 (pos 0) and childA2 (pos 1)
    moveCard(data, 'a1a1a1a1', 'bbbbbbbb');
    // childA2 should now be at position 0
    const cardA = findById(data, 'aaaaaaaa');
    assert.equal(cardA.children.cards[0].position, 0);
  });

  it('assigns position by target ordering', () => {
    const data = sampleTree();
    // Change Card B children to alpha-asc
    data.cards[1].children.ordering = 'alpha-asc';
    moveCard(data, 'a2a2a2a2', 'bbbbbbbb');
    const moved = findById(data, 'a2a2a2a2');
    assert.equal(moved.position, 0, 'alpha-ordered target gives position 0');
  });

  it('returns null for missing card ID', () => {
    const data = sampleTree();
    const result = moveCard(data, 'zzzzzzzz', 'bbbbbbbb');
    assert.equal(result, null);
  });
});

describe('getChildren / listCards ordering', () => {
  it('custom ordering returns by position', () => {
    const data = sampleTree();
    const children = getChildren(data, 'aaaaaaaa');
    assert.equal(children[0].id, 'a1a1a1a1');
    assert.equal(children[1].id, 'a2a2a2a2');
  });

  it('alpha-asc returns alphabetical', () => {
    const data = sampleTree();
    data.cards[0].children.ordering = 'alpha-asc';
    const children = getChildren(data, 'aaaaaaaa');
    assert.equal(children[0].title, 'Child A1');
    assert.equal(children[1].title, 'Child A2');
  });

  it('alpha-desc returns reverse alphabetical', () => {
    const data = sampleTree();
    data.cards[0].children.ordering = 'alpha-desc';
    const children = getChildren(data, 'aaaaaaaa');
    assert.equal(children[0].title, 'Child A2');
    assert.equal(children[1].title, 'Child A1');
  });

  it('listCards with no arg returns root cards ordered', () => {
    const data = sampleTree();
    const cards = listCards(data);
    assert.equal(cards.length, 3);
    assert.equal(cards[0].title, 'Card A');
    assert.equal(cards[1].title, 'Card B');
    assert.equal(cards[2].title, 'Card C');
  });

  it('listCards with parentId returns children of that card', () => {
    const data = sampleTree();
    const cards = listCards(data, 'aaaaaaaa');
    assert.equal(cards.length, 2);
    assert.equal(cards[0].id, 'a1a1a1a1');
  });

  it('getChildren returns empty array for leaf card', () => {
    const data = sampleTree();
    const children = getChildren(data, 'cccccccc');
    assert.deepStrictEqual(children, []);
  });
});

describe('ID generation', () => {
  it('generates 8-char hex IDs', () => {
    const data = emptyData();
    const card = addCard(data, { title: 'Test' });
    assert.match(card.id, /^[0-9a-f]{8}$/);
  });
});
