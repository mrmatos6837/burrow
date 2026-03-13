'use strict';

// --- Constants ---

const HR = '\u2500'.repeat(40);
const CHECKMARK = '\u2713';
const CROSSMARK = '\u2717';
const BRANCH = '\u251c\u2500';
const CORNER = '\u2514\u2500';
const PIPE = '\u2502';
const DOT = '\u2022';
const ARROW = '\u2192';
const BREADCRUMB_SEP = ' \u203a ';
const BODY_TRUNCATE_LENGTH = 200;
const DIFF_TRUNCATE_LENGTH = 40;

// --- Internal Helpers ---

/**
 * Produce a relative age string from an ISO date string.
 * @param {string} isoString
 * @returns {string}
 */
function formatAge(isoString) {
  if (!isoString) return '???';
  const now = Date.now();
  const then = new Date(isoString).getTime();
  if (isNaN(then)) return '???';
  const diffMs = Math.max(0, now - then);
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 52) return `${diffWeeks}w ago`;
  const diffYears = Math.floor(diffWeeks / 52);
  return `${diffYears}y ago`;
}

/**
 * Format created date: "YYYY-MM-DD (Xd ago)"
 * @param {string} isoString
 * @returns {string}
 */
function formatCreatedDate(isoString) {
  if (!isoString) return `??? (???)`;
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return `??? (???)`;
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} (${formatAge(isoString)})`;
}

/**
 * Format breadcrumb: "burrow > ancestors > card name"
 * @param {Array<{id, title}>} ancestors - Ancestor breadcrumbs (not including card)
 * @param {string} cardTitle
 * @param {string} [context] - Optional context string after dot separator
 * @returns {string}
 */
function formatBreadcrumb(ancestors, cardTitle, context) {
  const safeCardTitle = (cardTitle && cardTitle.trim()) ? cardTitle : '(untitled)';
  const parts = ['burrow'];
  for (const a of ancestors) {
    parts.push(a.title);
  }
  parts.push(safeCardTitle);
  let result = parts.join(BREADCRUMB_SEP);
  if (context) {
    result += ` \u00b7 ${context}`;
  }
  return result;
}

/**
 * Truncate string with ellipsis if over maxLen.
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
function truncate(str, maxLen) {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '\u2026';
}


/**
 * Format a single card line for tree listing.
 * @param {object} card - {id, title, created, archived, body, children, hasBody, descendantCount}
 * @param {string} prefix - Box-drawing prefix (branch or corner)
 * @param {number} termWidth - Terminal width
 * @returns {string}
 */
function formatCardLine(card, prefix, termWidth) {
  const tw = termWidth || 80;
  const id = `[${card.id}]`;
  const hasBody = card.hasBody !== undefined ? card.hasBody : !!(card.body && card.body.trim());
  const bodyMarker = hasBody ? ' +' : '';
  const age = formatAge(card.created);
  const descCount = card.descendantCount || 0;
  const countStr = descCount > 0 ? ` (${descCount})` : '';
  const archivedLabel = card.archived ? ' [archived]' : '';
  const safeTitle = (card.title && card.title.trim()) ? card.title : '(untitled)';

  // Left side without title: prefix + space + id + space
  const leftFixedParts = `  ${prefix} ${id} `;
  // Right side: just age
  const rightSide = age;
  // Indicators after title
  const indicators = `${countStr}${bodyMarker}${archivedLabel}`;

  // Available space for title
  const availableForTitle = tw - leftFixedParts.length - indicators.length - 2 - rightSide.length;
  const title = availableForTitle > 0 ? truncate(safeTitle, availableForTitle) : safeTitle;

  // Pad middle to right-align age
  const leftContent = `${leftFixedParts}${title}${indicators}`;
  const totalContentLen = leftContent.length + 2 + rightSide.length;
  const padding = Math.max(1, tw - totalContentLen);

  return `${leftContent}${' '.repeat(padding)}${rightSide}`;
}

/**
 * Recursively render tree lines with proper indentation.
 * @param {Array} children - Array of card objects (may have nested children)
 * @param {number} depth - Current nesting depth (0 = top-level children)
 * @param {string} indent - Accumulated indent prefix for this level
 * @param {number} tw - Terminal width
 * @returns {string[]} Array of formatted lines
 */
function renderTreeLines(children, depth, indent, tw) {
  const result = [];
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const isLast = i === children.length - 1;
    const prefix = indent + (isLast ? CORNER : BRANCH);
    result.push(formatCardLine(child, prefix, tw));

    if (child.children && child.children.length > 0) {
      const nextIndent = indent + (isLast ? '    ' : `${PIPE}   `);
      const subLines = renderTreeLines(child.children, depth + 1, nextIndent, tw);
      for (const sl of subLines) {
        result.push(sl);
      }
    }
  }
  return result;
}

// --- Exported Functions ---

/**
 * Render a card in full detail format.
 * @param {object} card - Full card object
 * @param {Array<{id, title}>} breadcrumbs - Ancestor breadcrumbs
 * @param {object} opts - {full, termWidth, archiveFilter}
 * @returns {string}
 */
function renderCard(card, breadcrumbs, opts) {
  const { full, termWidth } = opts || {};
  const tw = termWidth || 80;
  const lines = [];
  const safeTitle = (card.title && card.title.trim()) ? card.title : '(untitled)';

  // Breadcrumb header
  if (card.id === '(root)') {
    lines.push('burrow');
  } else {
    lines.push(formatBreadcrumb(breadcrumbs || [], safeTitle));
  }
  lines.push('');

  // Title section
  lines.push(HR);
  lines.push(safeTitle);
  lines.push(HR);

  // Metadata
  lines.push(`id:       ${card.id}`);
  lines.push(`created:  ${formatCreatedDate(card.created)}`);
  lines.push(`archived: ${card.archived ? 'yes' : 'no'}`);
  lines.push(HR);

  // Children section — pre-filtered by renderTree, trust the data
  const children = card.children || [];

  if (children.length === 0) {
    lines.push('children: (none)');
  } else {
    const activeCount = children.length;
    const totalDescendants = children.reduce(
      (sum, c) => sum + 1 + (c.descendantCount || 0), 0
    );
    lines.push(`children: ${activeCount} cards (${totalDescendants} total)`);
    const treeLines = renderTreeLines(children, 0, '', tw);
    for (const tl of treeLines) {
      lines.push(tl);
    }
  }
  lines.push(HR);

  // Body section
  const body = card.body || '';
  if (!body.trim()) {
    lines.push('body:     (empty)');
  } else {
    lines.push('body:');
    let displayBody = body;
    if (!full && displayBody.length > BODY_TRUNCATE_LENGTH) {
      displayBody = displayBody.slice(0, BODY_TRUNCATE_LENGTH) +
        '\u2026(truncated \u2014 use --full for complete body)';
    }
    const bodyLines = displayBody.split('\n');
    for (const bl of bodyLines) {
      lines.push(`  ${bl}`);
    }
  }
  lines.push(HR);

  return lines.join('\n');
}

/**
 * Render mutation output.
 * @param {string} type - 'add'|'edit'|'remove'|'move'|'archive'|'unarchive'
 * @param {object} result - Command result
 * @param {object} opts - {breadcrumbs, card, oldTitle, oldBody, fromParentTitle, termWidth}
 * @returns {string}
 */
function renderMutation(type, result, opts) {
  const { breadcrumbs, card, oldTitle, oldBody, fromParentTitle, toParentTitle, termWidth } = opts || {};

  switch (type) {
    case 'add': {
      const cardToRender = card || result;
      const detail = renderCard(cardToRender, breadcrumbs || [], { termWidth });
      return `${CHECKMARK} Added card\n\n${detail}`;
    }

    case 'edit': {
      const cardToRender = card || result;
      const diffLines = [];

      if (oldTitle !== undefined && oldTitle !== cardToRender.title) {
        diffLines.push(
          `  title: ${truncate(oldTitle, DIFF_TRUNCATE_LENGTH)} ${ARROW} ${truncate(cardToRender.title, DIFF_TRUNCATE_LENGTH)}`
        );
      }

      if (oldBody !== undefined && oldBody !== cardToRender.body) {
        const oldBodyClean = oldBody.replace(/\n/g, ' ');
        const newBodyClean = (cardToRender.body || '').replace(/\n/g, ' ');
        diffLines.push(
          `  body: ${truncate(oldBodyClean, DIFF_TRUNCATE_LENGTH)} ${ARROW} ${truncate(newBodyClean, DIFF_TRUNCATE_LENGTH)}`
        );
      }

      const detail = renderCard(cardToRender, breadcrumbs || [], { termWidth });
      const diffSection = diffLines.length > 0 ? '\n' + diffLines.join('\n') + '\n' : '';
      return `${CHECKMARK} Edited card${diffSection}\n${detail}`;
    }

    case 'remove': {
      const childPart = result.descendantCount > 0
        ? ` (and ${result.descendantCount} children)`
        : '';
      return `${CHECKMARK} Removed "${result.title}" [${result.id}]${childPart}`;
    }

    case 'move': {
      const from = fromParentTitle || 'root';
      const to = toParentTitle || 'root';
      return `${CHECKMARK} Moved "${result.title}" [${result.id}]: ${from} ${ARROW} ${to}`;
    }

    case 'archive': {
      const childPart = result.descendantCount > 0
        ? ` (and ${result.descendantCount} children)`
        : '';
      return `${CHECKMARK} Archived "${result.title}" [${result.id}]${childPart}`;
    }

    case 'unarchive': {
      const childPart = result.descendantCount > 0
        ? ` (and ${result.descendantCount} children)`
        : '';
      return `${CHECKMARK} Unarchived "${result.title}" [${result.id}]${childPart}`;
    }

    default:
      return `${CHECKMARK} ${type} completed`;
  }
}

/**
 * Render a breadcrumb path string.
 * @param {Array<{id, title}>} pathArray - From root to target
 * @returns {string}
 */
function renderPath(pathArray) {
  if (!pathArray || pathArray.length === 0) return 'burrow';
  const parts = ['burrow'];
  for (const entry of pathArray) {
    parts.push(entry.title);
  }
  const lastEntry = pathArray[pathArray.length - 1];
  // Replace last part with "title [id]"
  parts[parts.length - 1] = `${lastEntry.title} [${lastEntry.id}]`;
  return parts.join(BREADCRUMB_SEP);
}

/**
 * Render an error message.
 * @param {string} message
 * @returns {string}
 */
function renderError(message) {
  return `${CROSSMARK} ${message}`;
}

module.exports = { renderCard, renderMutation, renderPath, renderError };
