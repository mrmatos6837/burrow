'use strict';

const { generateId, collectAllIds } = require('./core.cjs');

// --- Helpers ---

/**
 * Recursively find a card by ID in the tree.
 * @param {object} data - Root data object
 * @param {string} id - Card ID to find
 * @returns {object|null} The card, or null if not found
 */
function findById(data, id) {
  function search(cards) {
    for (const card of cards) {
      if (card.id === id) return card;
      if (card.children && card.children.length) {
        const found = search(card.children);
        if (found) return found;
      }
    }
    return null;
  }
  return search(data.cards);
}

/**
 * Find the parent of a card by ID.
 * @param {object} data - Root data object
 * @param {string} id - Card ID to find parent of
 * @returns {{parent: object|null, container: Array}|null} parent card (null for root), container (the array the card lives in)
 */
function findParent(data, id) {
  // Check root level
  for (const card of data.cards) {
    if (card.id === id) {
      return { parent: null, container: data.cards };
    }
  }
  // Check nested
  function search(parentCard) {
    if (!parentCard.children || !parentCard.children.length) return null;
    for (const card of parentCard.children) {
      if (card.id === id) {
        return { parent: parentCard, container: parentCard.children };
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
 * Get the array to push into for adding/listing cards.
 * @param {object} data - Root data object
 * @param {string|null|undefined} parentId - Parent ID, or null/undefined for root
 * @returns {Array|null} The array to operate on, or null if parentId not found
 */
function getContainer(data, parentId) {
  if (parentId == null) return data.cards;
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
      if (card.children && card.children.length) {
        const found = search(card.children, currentPath);
        if (found) return found;
      }
    }
    return null;
  }
  return search(data.cards, []);
}

/**
 * Count all descendants recursively.
 * @param {object} card
 * @returns {number}
 */
function countDescendants(card) {
  let count = 0;
  if (card.children && card.children.length) {
    for (const child of card.children) {
      count += 1 + countDescendants(child);
    }
  }
  return count;
}

// --- Public API ---

/**
 * Add a new card to the tree.
 * @param {object} data - Root data object
 * @param {object} opts - {title, parentId, body}
 * @returns {object} The created card
 */
function addCard(data, { title, parentId, body }) {
  const container = getContainer(data, parentId);
  if (!container) return null;

  const existingIds = collectAllIds(data);
  const id = generateId(existingIds);

  const card = {
    id,
    title,
    created: new Date().toISOString(),
    archived: false,
    body: body || '',
    children: [],
  };

  container.push(card);
  return card;
}

/**
 * Edit an existing card's title or body.
 * @param {object} data - Root data object
 * @param {string} id - Card ID
 * @param {object} changes - {title, body}
 * @returns {object|null} Updated card, or null if not found
 */
function editCard(data, id, { title, body }) {
  const card = findById(data, id);
  if (!card) return null;

  if (title !== undefined) card.title = title;
  if (body !== undefined) card.body = body;

  return card;
}

/**
 * Delete a card and all its descendants.
 * @param {object} data - Root data object
 * @param {string} id - Card ID to delete
 * @returns {{id, title, descendantCount}|null} Deleted card info, or null if not found
 */
function deleteCard(data, id) {
  const parentResult = findParent(data, id);
  if (!parentResult) return null;

  const { container } = parentResult;
  const idx = container.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  const card = container[idx];
  const descendantCount = countDescendants(card);

  container.splice(idx, 1);

  return { id: card.id, title: card.title, descendantCount };
}

/**
 * Move a card to a new parent (or root).
 * @param {object} data - Root data object
 * @param {string} cardId - ID of card to move
 * @param {string|null} newParentId - Target parent ID, or null for root
 * @param {number} [requestedPosition] - Optional index in target array
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
  const sourceIdx = sourceContainer.findIndex((c) => c.id === cardId);
  sourceContainer.splice(sourceIdx, 1);

  // Insert into target
  const targetContainer = getContainer(data, newParentId);
  if (!targetContainer) return null;

  if (requestedPosition != null) {
    targetContainer.splice(requestedPosition, 0, card);
  } else {
    targetContainer.push(card);
  }

  return card;
}

/**
 * Get children of a card.
 * @param {object} data - Root data object
 * @param {string} id - Card ID
 * @returns {Array<object>} Children array
 */
function getChildren(data, id) {
  const card = findById(data, id);
  if (!card || !card.children) return [];
  return card.children;
}

/**
 * List cards: root cards (no arg) or children of parentId.
 * @param {object} data - Root data object
 * @param {string} [parentId] - Optional parent ID
 * @returns {Array<object>} Cards array
 */
function listCards(data, parentId) {
  if (parentId == null) {
    return data.cards;
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
};
