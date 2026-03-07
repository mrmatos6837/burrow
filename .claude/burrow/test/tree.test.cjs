'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const {
  findById,
  findParent,
  getContainer,
  getPath,
  addItem,
  editItem,
  deleteItem,
  moveItem,
  getChildren,
  listItems,
} = require('../lib/tree.cjs');

/**
 * Helper: create a fresh empty data structure.
 */
function emptyData() {
  return { version: 1, ordering: 'custom', items: [] };
}

/**
 * Helper: create a populated tree for testing.
 * Structure:
 *   root
 *     itemA (pos 0)
 *       childA1 (pos 0)
 *         grandchild (pos 0)
 *       childA2 (pos 1)
 *     itemB (pos 1)
 *     itemC (pos 2)
 */
function sampleTree() {
  return {
    version: 1,
    ordering: 'custom',
    items: [
      {
        id: 'aaaaaaaa',
        title: 'Item A',
        position: 0,
        created: '2026-03-01T00:00:00.000Z',
        archived: false,
        notes: '',
        children: {
          ordering: 'custom',
          items: [
            {
              id: 'a1a1a1a1',
              title: 'Child A1',
              position: 0,
              created: '2026-03-01T01:00:00.000Z',
              archived: false,
              notes: 'some notes',
              children: {
                ordering: 'custom',
                items: [
                  {
                    id: 'g1g1g1g1',
                    title: 'Grandchild',
                    position: 0,
                    created: '2026-03-01T02:00:00.000Z',
                    archived: false,
                    notes: '',
                    children: { ordering: 'custom', items: [] },
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
              children: { ordering: 'custom', items: [] },
            },
          ],
        },
      },
      {
        id: 'bbbbbbbb',
        title: 'Item B',
        position: 1,
        created: '2026-03-01T00:10:00.000Z',
        archived: false,
        notes: '',
        children: { ordering: 'custom', items: [] },
      },
      {
        id: 'cccccccc',
        title: 'Item C',
        position: 2,
        created: '2026-03-01T00:20:00.000Z',
        archived: false,
        notes: '',
        children: { ordering: 'custom', items: [] },
      },
    ],
  };
}

describe('findById', () => {
  it('finds item at root level', () => {
    const data = sampleTree();
    const item = findById(data, 'bbbbbbbb');
    assert.ok(item);
    assert.equal(item.title, 'Item B');
  });

  it('finds item nested 3 levels deep', () => {
    const data = sampleTree();
    const item = findById(data, 'g1g1g1g1');
    assert.ok(item);
    assert.equal(item.title, 'Grandchild');
  });

  it('returns null for missing ID', () => {
    const data = sampleTree();
    assert.equal(findById(data, 'zzzzzzzz'), null);
  });
});

describe('findParent', () => {
  it('returns null parent for root items', () => {
    const data = sampleTree();
    const result = findParent(data, 'aaaaaaaa');
    assert.equal(result.parent, null);
    assert.ok(result.container);
    assert.equal(result.container.ordering, 'custom');
  });

  it('returns parent item for nested items', () => {
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

  it('returns item.children for valid parentId', () => {
    const data = sampleTree();
    const container = getContainer(data, 'aaaaaaaa');
    assert.equal(container.ordering, 'custom');
    assert.equal(container.items.length, 2);
  });

  it('returns error result for invalid parentId', () => {
    const data = sampleTree();
    const result = getContainer(data, 'zzzzzzzz');
    assert.equal(result, null);
  });
});

describe('getPath', () => {
  it('returns path from root to deeply nested item', () => {
    const data = sampleTree();
    const p = getPath(data, 'g1g1g1g1');
    assert.ok(p);
    assert.equal(p.length, 3);
    assert.equal(p[0].id, 'aaaaaaaa');
    assert.equal(p[1].id, 'a1a1a1a1');
    assert.equal(p[2].id, 'g1g1g1g1');
  });

  it('returns single-element path for root item', () => {
    const data = sampleTree();
    const p = getPath(data, 'bbbbbbbb');
    assert.ok(p);
    assert.equal(p.length, 1);
    assert.equal(p[0].id, 'bbbbbbbb');
  });

  it('returns null for missing item', () => {
    const data = sampleTree();
    assert.equal(getPath(data, 'zzzzzzzz'), null);
  });
});

describe('addItem', () => {
  it('adds item to root with custom ordering, gets last position', () => {
    const data = emptyData();
    const item = addItem(data, { title: 'First item' });
    assert.equal(item.position, 0);
    assert.equal(item.title, 'First item');
    assert.ok(/^[0-9a-f]{8}$/.test(item.id), 'ID should be 8-char hex');
    assert.ok(item.created, 'should have created timestamp');
    assert.deepStrictEqual(item.children, { ordering: 'custom', items: [] });
    assert.equal(data.items.length, 1);
  });

  it('adds item as child of existing item', () => {
    const data = sampleTree();
    const item = addItem(data, { title: 'New child', parentId: 'bbbbbbbb' });
    assert.ok(item);
    assert.equal(item.position, 0);
    const parent = findById(data, 'bbbbbbbb');
    assert.equal(parent.children.items.length, 1);
    assert.equal(parent.children.items[0].id, item.id);
  });

  it('adds item with explicit --position override', () => {
    const data = sampleTree();
    // sampleTree root has 3 items at pos 0,1,2
    const item = addItem(data, { title: 'Inserted', position: 1 });
    assert.equal(item.position, 1);
  });

  it('adds item to alpha-asc parent (position set to 0)', () => {
    const data = sampleTree();
    // Change Item A's children ordering to alpha-asc
    data.items[0].children.ordering = 'alpha-asc';
    const item = addItem(data, { title: 'Zeta child', parentId: 'aaaaaaaa' });
    assert.equal(item.position, 0, 'alpha-ordered items have position 0 (irrelevant for sorting)');
  });

  it('generates ISO 8601 timestamps', () => {
    const data = emptyData();
    const item = addItem(data, { title: 'Timestamp test' });
    // ISO 8601 check
    const parsed = new Date(item.created);
    assert.ok(!isNaN(parsed.getTime()), 'created should be valid ISO date');
  });
});

describe('editItem', () => {
  it('edits title of existing item', () => {
    const data = sampleTree();
    const result = editItem(data, 'aaaaaaaa', { title: 'Renamed A' });
    assert.equal(result.title, 'Renamed A');
    assert.equal(findById(data, 'aaaaaaaa').title, 'Renamed A');
  });

  it('edits notes of existing item', () => {
    const data = sampleTree();
    const result = editItem(data, 'bbbbbbbb', { notes: 'Updated notes' });
    assert.equal(result.notes, 'Updated notes');
  });

  it('edits ordering of an item (updates children.ordering)', () => {
    const data = sampleTree();
    const result = editItem(data, 'aaaaaaaa', { ordering: 'alpha-asc' });
    assert.equal(result.children.ordering, 'alpha-asc');
  });

  it('returns null for missing ID', () => {
    const data = sampleTree();
    const result = editItem(data, 'zzzzzzzz', { title: 'Nope' });
    assert.equal(result, null);
  });
});

describe('deleteItem', () => {
  it('deletes a leaf item', () => {
    const data = sampleTree();
    const result = deleteItem(data, 'cccccccc');
    assert.equal(result.id, 'cccccccc');
    assert.equal(result.title, 'Item C');
    assert.equal(result.descendantCount, 0);
    assert.equal(data.items.length, 2);
  });

  it('deletes item with children (descendants removed)', () => {
    const data = sampleTree();
    const result = deleteItem(data, 'aaaaaaaa');
    assert.equal(result.id, 'aaaaaaaa');
    assert.equal(result.descendantCount, 3); // childA1, childA2, grandchild
    assert.equal(data.items.length, 2);
    // Verify descendants are gone
    assert.equal(findById(data, 'a1a1a1a1'), null);
    assert.equal(findById(data, 'g1g1g1g1'), null);
  });

  it('recompacts positions after delete', () => {
    const data = sampleTree();
    deleteItem(data, 'bbbbbbbb'); // was pos 1
    // Remaining: Item A (pos 0), Item C (was pos 2, now should be pos 1)
    const itemC = findById(data, 'cccccccc');
    assert.equal(itemC.position, 1);
  });

  it('returns null for missing ID', () => {
    const data = sampleTree();
    const result = deleteItem(data, 'zzzzzzzz');
    assert.equal(result, null);
  });
});

describe('moveItem', () => {
  it('moves item between parents', () => {
    const data = sampleTree();
    // Move childA2 under Item B
    const result = moveItem(data, 'a2a2a2a2', 'bbbbbbbb');
    assert.ok(result);
    assert.equal(result.id, 'a2a2a2a2');
    const itemB = findById(data, 'bbbbbbbb');
    assert.equal(itemB.children.items.length, 1);
    assert.equal(itemB.children.items[0].id, 'a2a2a2a2');
    // Removed from Item A
    const itemA = findById(data, 'aaaaaaaa');
    assert.equal(itemA.children.items.length, 1); // only childA1 remains
  });

  it('moves item to root (parentId = null)', () => {
    const data = sampleTree();
    const result = moveItem(data, 'a1a1a1a1', null);
    assert.ok(result);
    assert.equal(data.items.length, 4);
    assert.ok(data.items.find((i) => i.id === 'a1a1a1a1'));
  });

  it('rejects cycle (moving parent into its own child)', () => {
    const data = sampleTree();
    // Move Item A into its own grandchild -- should be rejected
    const result = moveItem(data, 'aaaaaaaa', 'g1g1g1g1');
    assert.equal(result, null);
    // Tree should be unchanged
    assert.equal(data.items.length, 3);
    assert.equal(data.items[0].id, 'aaaaaaaa');
  });

  it('recompacts positions at source after move', () => {
    const data = sampleTree();
    // Item A has childA1 (pos 0) and childA2 (pos 1)
    moveItem(data, 'a1a1a1a1', 'bbbbbbbb');
    // childA2 should now be at position 0
    const itemA = findById(data, 'aaaaaaaa');
    assert.equal(itemA.children.items[0].position, 0);
  });

  it('assigns position by target ordering', () => {
    const data = sampleTree();
    // Change Item B children to alpha-asc
    data.items[1].children.ordering = 'alpha-asc';
    moveItem(data, 'a2a2a2a2', 'bbbbbbbb');
    const moved = findById(data, 'a2a2a2a2');
    assert.equal(moved.position, 0, 'alpha-ordered target gives position 0');
  });

  it('returns null for missing item ID', () => {
    const data = sampleTree();
    const result = moveItem(data, 'zzzzzzzz', 'bbbbbbbb');
    assert.equal(result, null);
  });
});

describe('getChildren / listItems ordering', () => {
  it('custom ordering returns by position', () => {
    const data = sampleTree();
    const children = getChildren(data, 'aaaaaaaa');
    assert.equal(children[0].id, 'a1a1a1a1');
    assert.equal(children[1].id, 'a2a2a2a2');
  });

  it('alpha-asc returns alphabetical', () => {
    const data = sampleTree();
    data.items[0].children.ordering = 'alpha-asc';
    const children = getChildren(data, 'aaaaaaaa');
    assert.equal(children[0].title, 'Child A1');
    assert.equal(children[1].title, 'Child A2');
  });

  it('alpha-desc returns reverse alphabetical', () => {
    const data = sampleTree();
    data.items[0].children.ordering = 'alpha-desc';
    const children = getChildren(data, 'aaaaaaaa');
    assert.equal(children[0].title, 'Child A2');
    assert.equal(children[1].title, 'Child A1');
  });

  it('listItems with no arg returns root items ordered', () => {
    const data = sampleTree();
    const items = listItems(data);
    assert.equal(items.length, 3);
    assert.equal(items[0].title, 'Item A');
    assert.equal(items[1].title, 'Item B');
    assert.equal(items[2].title, 'Item C');
  });

  it('listItems with parentId returns children of that item', () => {
    const data = sampleTree();
    const items = listItems(data, 'aaaaaaaa');
    assert.equal(items.length, 2);
    assert.equal(items[0].id, 'a1a1a1a1');
  });

  it('getChildren returns empty array for leaf item', () => {
    const data = sampleTree();
    const children = getChildren(data, 'cccccccc');
    assert.deepStrictEqual(children, []);
  });
});

describe('ID generation', () => {
  it('generates 8-char hex IDs', () => {
    const data = emptyData();
    const item = addItem(data, { title: 'Test' });
    assert.match(item.id, /^[0-9a-f]{8}$/);
  });
});
