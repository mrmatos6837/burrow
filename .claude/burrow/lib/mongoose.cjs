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
 * Uses a single recursive traversal (no separate root-level loop).
 * @param {object} data - Root data object
 * @param {string} id - Card ID to find parent of
 * @returns {{parent: object|null, container: Array}|null} parent card (null for root), container (the array the card lives in)
 */
function findParent(data, id) {
  function search(parentCard, container) {
    for (const card of container) {
      if (card.id === id) {
        return { parent: parentCard, container };
      }
      if (card.children && card.children.length) {
        const found = search(card, card.children);
        if (found) return found;
      }
    }
    return null;
  }
  return search(null, data.cards);
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
 * Count descendants recursively.
 * @param {object} card
 * @param {object} [opts]
 * @param {boolean} [opts.activeOnly=false] - When true, skip archived children and their subtrees
 * @returns {number}
 */
function countDescendants(card, opts) {
  const activeOnly = opts && opts.activeOnly;
  let count = 0;
  if (card.children && card.children.length) {
    for (const child of card.children) {
      if (activeOnly && child.archived) continue;
      count += 1 + countDescendants(child, opts);
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
function addCard(data, { title, parentId, body, position }) {
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

  if (position != null && position < container.length) {
    container.splice(position, 0, card);
  } else {
    container.push(card);
  }
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
 * Internal helper: find a card and its ancestry (parent + container) in a single walk.
 * @param {object} data - Root data object
 * @param {string} cardId - Card ID to find
 * @returns {{card: object, parent: object|null, container: Array, ancestorIds: Set}|null}
 */
function findCardWithAncestry(data, cardId) {
  function search(container, parent, ancestorIds) {
    for (const card of container) {
      if (card.id === cardId) {
        return { card, parent, container, ancestorIds };
      }
      if (card.children && card.children.length) {
        const nextAncestors = new Set(ancestorIds);
        nextAncestors.add(card.id);
        const found = search(card.children, card, nextAncestors);
        if (found) return found;
      }
    }
    return null;
  }
  return search(data.cards, null, new Set());
}

/**
 * Move a card to a new parent (or root).
 * Uses at most 2 tree walks: one to find card + ancestry, one to get target container.
 * @param {object} data - Root data object
 * @param {string} cardId - ID of card to move
 * @param {string|null} newParentId - Target parent ID, or null for root
 * @param {number} [requestedPosition] - Optional index in target array
 * @returns {object|null} Moved card, or null on error (not found, cycle)
 */
function moveCard(data, cardId, newParentId, requestedPosition) {
  // Walk 1: find card, its container, and ancestor IDs for cycle detection
  const found = findCardWithAncestry(data, cardId);
  if (!found) return null;

  const { card, container: sourceContainer, ancestorIds } = found;

  // Cycle check: newParentId cannot be the card itself or any ancestor's descendant
  // ancestorIds contains all ancestors of card; card.id is card itself
  if (newParentId != null && (newParentId === cardId || ancestorIds.has(newParentId))) {
    // newParentId is an ancestor of card — but we need to check if newParentId is a descendant of card
    // ancestorIds only has ancestors, not descendants. We need to check if newParentId is under card.
    // If newParentId === cardId, that's a trivial cycle. Otherwise check via getPath.
    if (newParentId === cardId) return null;
  }

  // For cycle detection: newParentId must not be a descendant of cardId
  if (newParentId != null) {
    const path = getPath(data, newParentId);
    if (path && path.some((p) => p.id === cardId)) {
      return null; // Would create a cycle
    }
  }

  // Remove from source (using already-found container)
  const sourceIdx = sourceContainer.findIndex((c) => c.id === cardId);
  sourceContainer.splice(sourceIdx, 1);

  // Walk 2: get target container
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
 * Create a body preview: replace newlines with spaces, truncate at 80 chars.
 * @param {string} body
 * @returns {string}
 */
function makePreview(body) {
  if (!body) return '';
  const cleaned = body.replace(/\n/g, ' ');
  if (cleaned.length > 80) {
    return cleaned.slice(0, 80) + '...';
  }
  return cleaned;
}

/**
 * Render a nested tree of cards with pre-computed metadata, breadcrumbs, and archive filtering.
 * @param {object} data - Root data object
 * @param {string|null} rootId - Focus card ID, or null for root view
 * @param {object} [opts] - {depth, archiveFilter}
 * @returns {{breadcrumbs: Array|null, cards: Array}|null} Render result, or null if rootId not found
 *   cards is a nested tree: [{id, title, descendantCount, hasBody, bodyPreview, created, archived, children: [...]}]
 */
function renderTree(data, rootId, opts) {
  const { depth: depthArg, archiveFilter } = opts || {};
  const maxDepth = depthArg === 0 ? Infinity : (depthArg !== undefined ? depthArg : 1);
  const filter = archiveFilter || 'active';

  // Archive filter function
  const shouldInclude = filter === 'active'
    ? (card) => !card.archived
    : filter === 'archived-only'
      ? (card) => card.archived
      : () => true;

  // Build breadcrumbs
  let breadcrumbs = null;
  if (rootId != null) {
    const path = getPath(data, rootId);
    if (!path) return null;
    breadcrumbs = path.slice(0, -1).map((c) => ({ id: c.id, title: c.title }));
  }

  function buildNested(cards, currentDepth) {
    const result = [];
    for (const card of cards) {
      if (shouldInclude(card)) {
        const entry = {
          id: card.id,
          title: card.title,
          descendantCount: countDescendants(card, { activeOnly: true }),
          hasBody: !!(card.body && card.body.trim()),
          bodyPreview: makePreview(card.body),
          created: card.created,
          archived: card.archived,
          children: (currentDepth < maxDepth && card.children && card.children.length)
            ? buildNested(card.children, currentDepth + 1)
            : [],
        };
        result.push(entry);
      }
    }
    return result;
  }

  let cards;
  if (rootId != null) {
    const rootCard = findById(data, rootId);
    if (!shouldInclude(rootCard)) return { breadcrumbs, cards: [] };
    const builtChildren = (maxDepth > 0 && rootCard.children && rootCard.children.length)
      ? buildNested(rootCard.children, 1)
      : [];
    // Derive descendantCount from already-built children instead of a redundant tree walk
    const descendantCount = builtChildren.reduce(
      (sum, child) => sum + 1 + (child.descendantCount || 0), 0
    );
    const entry = {
      id: rootCard.id,
      title: rootCard.title,
      descendantCount,
      hasBody: !!(rootCard.body && rootCard.body.trim()),
      bodyPreview: makePreview(rootCard.body),
      created: rootCard.created,
      archived: rootCard.archived,
      children: builtChildren,
    };
    cards = [entry];
  } else {
    cards = buildNested(data.cards, 0);
  }

  return { breadcrumbs, cards };
}

/**
 * Recursively set archived flag on a card and all descendants.
 * @param {object} card
 * @param {boolean} value
 */
function setArchivedRecursive(card, value) {
  card.archived = value;
  if (card.children && card.children.length) {
    for (const child of card.children) {
      setArchivedRecursive(child, value);
    }
  }
}

/**
 * Archive a card and all its descendants.
 * @param {object} data - Root data object
 * @param {string} id - Card ID
 * @returns {{id, title, descendantCount}|null}
 */
function archiveCard(data, id) {
  const card = findById(data, id);
  if (!card) return null;
  const desc = countDescendants(card);
  setArchivedRecursive(card, true);
  return { id: card.id, title: card.title, descendantCount: desc };
}

/**
 * Unarchive a card and all its descendants.
 * @param {object} data - Root data object
 * @param {string} id - Card ID
 * @returns {{id, title, descendantCount}|null}
 */
function unarchiveCard(data, id) {
  const card = findById(data, id);
  if (!card) return null;
  const desc = countDescendants(card);
  setArchivedRecursive(card, false);
  return { id: card.id, title: card.title, descendantCount: desc };
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

  countDescendants,
  renderTree,
  archiveCard,
  unarchiveCard,
};
