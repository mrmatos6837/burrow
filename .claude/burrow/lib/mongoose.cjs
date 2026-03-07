'use strict';

const { generateId, collectAllIds } = require('./core.cjs');

// --- Helpers ---

/**
 * Recursively find an card by ID in the tree.
 * @param {object} data - Root data object
 * @param {string} id - Card ID to find
 * @returns {object|null} The card, or null if not found
 */
function findById(data, id) {
  function search(cards) {
    for (const card of cards) {
      if (card.id === id) return card;
      if (card.children && card.children.cards) {
        const found = search(card.children.cards);
        if (found) return found;
      }
    }
    return null;
  }
  return search(data.cards);
}

/**
 * Find the parent of an card by ID.
 * @param {object} data - Root data object
 * @param {string} id - Card ID to find parent of
 * @returns {{parent: object|null, container: object}|null} parent card (null for root), container ({ordering, cards})
 */
function findParent(data, id) {
  // Check root level
  for (const card of data.cards) {
    if (card.id === id) {
      return { parent: null, container: data };
    }
  }
  // Check nested
  function search(parentCard) {
    const children = parentCard.children;
    if (!children || !children.cards) return null;
    for (const card of children.cards) {
      if (card.id === id) {
        return { parent: parentCard, container: children };
      }
      const found = search(card);
      if (found) return found;
    }
    return null;
  }
  for (const card of data.cards) {
    const found = search(card);
    if (found) return found;
  }
  return null;
}

/**
 * Get the container for adding/listing cards.
 * @param {object} data - Root data object
 * @param {string|null|undefined} parentId - Parent ID, or null/undefined for root
 * @returns {object|null} The container ({ordering, cards}), or null if parentId not found
 */
function getContainer(data, parentId) {
  if (parentId == null) return data;
  const parent = findById(data, parentId);
  if (!parent) return null;
  return parent.children;
}

/**
 * Get the ancestry path from root to the target card.
 * @param {object} data - Root data object
 * @param {string} id - Target card ID
 * @returns {Array<object>|null} Array from root ancestor to target, or null
 */
function getPath(data, id) {
  function search(cards, path) {
    for (const card of cards) {
      const currentPath = [...path, card];
      if (card.id === id) return currentPath;
      if (card.children && card.children.cards) {
        const found = search(card.children.cards, currentPath);
        if (found) return found;
      }
    }
    return null;
  }
  return search(data.cards, []);
}

/**
 * Sort cards according to ordering mode. Returns a new sorted array.
 * @param {object} container - {ordering, cards}
 * @returns {Array<object>} Sorted copy of cards
 */
function getOrderedChildren(container) {
  const cards = [...container.cards];
  switch (container.ordering) {
    case 'alpha-asc':
      cards.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'alpha-desc':
      cards.sort((a, b) => b.title.localeCompare(a.title));
      break;
    case 'custom':
    default:
      cards.sort((a, b) => a.position - b.position);
      break;
  }
  return cards;
}

/**
 * Recompact positions in a container: reassign [0,1,2,...] sorted by current position.
 * @param {object} container - {ordering, cards}
 */
function recompact(container) {
  container.cards.sort((a, b) => a.position - b.position);
  for (let i = 0; i < container.cards.length; i++) {
    container.cards[i].position = i;
  }
}

/**
 * Count all descendants recursively.
 * @param {object} card
 * @returns {number}
 */
function countDescendants(card) {
  let count = 0;
  if (card.children && card.children.cards) {
    for (const child of card.children.cards) {
      count += 1 + countDescendants(child);
    }
  }
  return count;
}

// --- Public API ---

/**
 * Add a new card to the tree.
 * @param {object} data - Root data object
 * @param {object} opts - {title, parentId, notes, position}
 * @returns {object} The created card
 */
function addCard(data, { title, parentId, notes, position }) {
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
    assignedPosition = container.cards.length;
  }

  const card = {
    id,
    title,
    position: assignedPosition,
    created: new Date().toISOString(),
    archived: false,
    notes: notes || '',
    children: { ordering: 'custom', cards: [] },
  };

  container.cards.push(card);
  return card;
}

/**
 * Edit an existing card's title, notes, or ordering.
 * @param {object} data - Root data object
 * @param {string} id - Card ID
 * @param {object} changes - {title, notes, ordering}
 * @returns {object|null} Updated card, or null if not found
 */
function editCard(data, id, { title, notes, ordering }) {
  const card = findById(data, id);
  if (!card) return null;

  if (title !== undefined) card.title = title;
  if (notes !== undefined) card.notes = notes;
  if (ordering !== undefined) card.children.ordering = ordering;

  return card;
}

/**
 * Delete an card and all its descendants.
 * @param {object} data - Root data object
 * @param {string} id - Card ID to delete
 * @returns {{id, title, descendantCount}|null} Deleted card info, or null if not found
 */
function deleteCard(data, id) {
  const parentResult = findParent(data, id);
  if (!parentResult) return null;

  const { container } = parentResult;
  const idx = container.cards.findIndex((i) => i.id === id);
  if (idx === -1) return null;

  const card = container.cards[idx];
  const descendantCount = countDescendants(card);

  container.cards.splice(idx, 1);
  recompact(container);

  return { id: card.id, title: card.title, descendantCount };
}

/**
 * Move an card to a new parent (or root).
 * @param {object} data - Root data object
 * @param {string} cardId - ID of card to move
 * @param {string|null} newParentId - Target parent ID, or null for root
 * @param {number} [requestedPosition] - Optional position in target
 * @returns {object|null} Moved card, or null on error (not found, cycle)
 */
function moveCard(data, cardId, newParentId, requestedPosition) {
  const card = findById(data, cardId);
  if (!card) return null;

  // Cycle check: newParentId cannot be a descendant of cardId
  if (newParentId != null) {
    const path = getPath(data, newParentId);
    if (path && path.some((p) => p.id === cardId)) {
      return null; // Would create a cycle
    }
  }

  // Remove from source
  const sourceResult = findParent(data, cardId);
  if (!sourceResult) return null;
  const { container: sourceContainer } = sourceResult;
  const sourceIdx = sourceContainer.cards.findIndex((i) => i.id === cardId);
  sourceContainer.cards.splice(sourceIdx, 1);
  recompact(sourceContainer);

  // Insert into target
  const targetContainer = getContainer(data, newParentId);
  if (!targetContainer) return null;

  const isAlpha = targetContainer.ordering === 'alpha-asc' || targetContainer.ordering === 'alpha-desc';
  if (isAlpha) {
    card.position = 0;
  } else if (requestedPosition != null) {
    card.position = requestedPosition;
  } else {
    card.position = targetContainer.cards.length;
  }

  targetContainer.cards.push(card);
  return card;
}

/**
 * Get ordered children of an card.
 * @param {object} data - Root data object
 * @param {string} id - Card ID
 * @returns {Array<object>} Ordered children
 */
function getChildren(data, id) {
  const card = findById(data, id);
  if (!card || !card.children) return [];
  return getOrderedChildren(card.children);
}

/**
 * List cards: root cards (no arg) or children of parentId.
 * @param {object} data - Root data object
 * @param {string} [parentId] - Optional parent ID
 * @returns {Array<object>} Ordered cards
 */
function listCards(data, parentId) {
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
  addCard,
  editCard,
  deleteCard,
  moveCard,
  getChildren,
  listCards,
  recompact,
  getOrderedChildren,
};
