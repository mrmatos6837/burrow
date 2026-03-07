'use strict';

const { generateId, collectAllIds } = require('./core.cjs');

// --- Helpers ---

/**
 * Recursively find an item by ID in the tree.
 * @param {object} data - Root data object
 * @param {string} id - Item ID to find
 * @returns {object|null} The item, or null if not found
 */
function findById(data, id) {
  function search(items) {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children && item.children.items) {
        const found = search(item.children.items);
        if (found) return found;
      }
    }
    return null;
  }
  return search(data.items);
}

/**
 * Find the parent of an item by ID.
 * @param {object} data - Root data object
 * @param {string} id - Item ID to find parent of
 * @returns {{parent: object|null, container: object}|null} parent item (null for root), container ({ordering, items})
 */
function findParent(data, id) {
  // Check root level
  for (const item of data.items) {
    if (item.id === id) {
      return { parent: null, container: data };
    }
  }
  // Check nested
  function search(parentItem) {
    const children = parentItem.children;
    if (!children || !children.items) return null;
    for (const item of children.items) {
      if (item.id === id) {
        return { parent: parentItem, container: children };
      }
      const found = search(item);
      if (found) return found;
    }
    return null;
  }
  for (const item of data.items) {
    const found = search(item);
    if (found) return found;
  }
  return null;
}

/**
 * Get the container for adding/listing items.
 * @param {object} data - Root data object
 * @param {string|null|undefined} parentId - Parent ID, or null/undefined for root
 * @returns {object|null} The container ({ordering, items}), or null if parentId not found
 */
function getContainer(data, parentId) {
  if (parentId == null) return data;
  const parent = findById(data, parentId);
  if (!parent) return null;
  return parent.children;
}

/**
 * Get the ancestry path from root to the target item.
 * @param {object} data - Root data object
 * @param {string} id - Target item ID
 * @returns {Array<object>|null} Array from root ancestor to target, or null
 */
function getPath(data, id) {
  function search(items, path) {
    for (const item of items) {
      const currentPath = [...path, item];
      if (item.id === id) return currentPath;
      if (item.children && item.children.items) {
        const found = search(item.children.items, currentPath);
        if (found) return found;
      }
    }
    return null;
  }
  return search(data.items, []);
}

/**
 * Sort items according to ordering mode. Returns a new sorted array.
 * @param {object} container - {ordering, items}
 * @returns {Array<object>} Sorted copy of items
 */
function getOrderedChildren(container) {
  const items = [...container.items];
  switch (container.ordering) {
    case 'alpha-asc':
      items.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'alpha-desc':
      items.sort((a, b) => b.title.localeCompare(a.title));
      break;
    case 'custom':
    default:
      items.sort((a, b) => a.position - b.position);
      break;
  }
  return items;
}

/**
 * Recompact positions in a container: reassign [0,1,2,...] sorted by current position.
 * @param {object} container - {ordering, items}
 */
function recompact(container) {
  container.items.sort((a, b) => a.position - b.position);
  for (let i = 0; i < container.items.length; i++) {
    container.items[i].position = i;
  }
}

/**
 * Count all descendants recursively.
 * @param {object} item
 * @returns {number}
 */
function countDescendants(item) {
  let count = 0;
  if (item.children && item.children.items) {
    for (const child of item.children.items) {
      count += 1 + countDescendants(child);
    }
  }
  return count;
}

// --- Public API ---

/**
 * Add a new item to the tree.
 * @param {object} data - Root data object
 * @param {object} opts - {title, parentId, notes, position}
 * @returns {object} The created item
 */
function addItem(data, { title, parentId, notes, position }) {
  const container = getContainer(data, parentId);
  if (!container) return null;

  const existingIds = collectAllIds(data);
  const id = generateId(existingIds);

  let assignedPosition;
  const isAlpha = container.ordering === 'alpha-asc' || container.ordering === 'alpha-desc';

  if (isAlpha) {
    assignedPosition = 0;
  } else if (position != null) {
    assignedPosition = position;
  } else {
    // Default: end of list
    assignedPosition = container.items.length;
  }

  const item = {
    id,
    title,
    position: assignedPosition,
    created: new Date().toISOString(),
    archived: false,
    notes: notes || '',
    children: { ordering: 'custom', items: [] },
  };

  container.items.push(item);
  return item;
}

/**
 * Edit an existing item's title, notes, or ordering.
 * @param {object} data - Root data object
 * @param {string} id - Item ID
 * @param {object} changes - {title, notes, ordering}
 * @returns {object|null} Updated item, or null if not found
 */
function editItem(data, id, { title, notes, ordering }) {
  const item = findById(data, id);
  if (!item) return null;

  if (title !== undefined) item.title = title;
  if (notes !== undefined) item.notes = notes;
  if (ordering !== undefined) item.children.ordering = ordering;

  return item;
}

/**
 * Delete an item and all its descendants.
 * @param {object} data - Root data object
 * @param {string} id - Item ID to delete
 * @returns {{id, title, descendantCount}|null} Deleted item info, or null if not found
 */
function deleteItem(data, id) {
  const parentResult = findParent(data, id);
  if (!parentResult) return null;

  const { container } = parentResult;
  const idx = container.items.findIndex((i) => i.id === id);
  if (idx === -1) return null;

  const item = container.items[idx];
  const descendantCount = countDescendants(item);

  container.items.splice(idx, 1);
  recompact(container);

  return { id: item.id, title: item.title, descendantCount };
}

/**
 * Move an item to a new parent (or root).
 * @param {object} data - Root data object
 * @param {string} itemId - ID of item to move
 * @param {string|null} newParentId - Target parent ID, or null for root
 * @param {number} [requestedPosition] - Optional position in target
 * @returns {object|null} Moved item, or null on error (not found, cycle)
 */
function moveItem(data, itemId, newParentId, requestedPosition) {
  const item = findById(data, itemId);
  if (!item) return null;

  // Cycle check: newParentId cannot be a descendant of itemId
  if (newParentId != null) {
    const path = getPath(data, newParentId);
    if (path && path.some((p) => p.id === itemId)) {
      return null; // Would create a cycle
    }
  }

  // Remove from source
  const sourceResult = findParent(data, itemId);
  if (!sourceResult) return null;
  const { container: sourceContainer } = sourceResult;
  const sourceIdx = sourceContainer.items.findIndex((i) => i.id === itemId);
  sourceContainer.items.splice(sourceIdx, 1);
  recompact(sourceContainer);

  // Insert into target
  const targetContainer = getContainer(data, newParentId);
  if (!targetContainer) return null;

  const isAlpha = targetContainer.ordering === 'alpha-asc' || targetContainer.ordering === 'alpha-desc';
  if (isAlpha) {
    item.position = 0;
  } else if (requestedPosition != null) {
    item.position = requestedPosition;
  } else {
    item.position = targetContainer.items.length;
  }

  targetContainer.items.push(item);
  return item;
}

/**
 * Get ordered children of an item.
 * @param {object} data - Root data object
 * @param {string} id - Item ID
 * @returns {Array<object>} Ordered children
 */
function getChildren(data, id) {
  const item = findById(data, id);
  if (!item || !item.children) return [];
  return getOrderedChildren(item.children);
}

/**
 * List items: root items (no arg) or children of parentId.
 * @param {object} data - Root data object
 * @param {string} [parentId] - Optional parent ID
 * @returns {Array<object>} Ordered items
 */
function listItems(data, parentId) {
  if (parentId == null) {
    return getOrderedChildren(data);
  }
  return getChildren(data, parentId);
}

module.exports = {
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
  recompact,
  getOrderedChildren,
};
