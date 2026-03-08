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

describe('getChildren / listCards', () => {
  it('getChildren returns children array', () => {
    const data = sampleTree();
    const children = getChildren(data, 'aaaaaaaa');
    assert.equal(children.length, 2);
    assert.equal(children[0].id, 'a1a1a1a1');
    assert.equal(children[1].id, 'a2a2a2a2');
  });

  it('listCards with no arg returns root cards', () => {
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

describe('removed exports', () => {
  it('recompact is not exported', () => {
    const mongoose = require('../lib/mongoose.cjs');
    assert.equal(mongoose.recompact, undefined);
  });

  it('getOrderedChildren is not exported', () => {
    const mongoose = require('../lib/mongoose.cjs');
    assert.equal(mongoose.getOrderedChildren, undefined);
  });
});

describe('ID generation', () => {
  it('generates 8-char hex IDs', () => {
    const data = emptyData();
    const card = addCard(data, { title: 'Test' });
    assert.match(card.id, /^[0-9a-f]{8}$/);
  });
});
