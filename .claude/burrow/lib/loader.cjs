'use strict';

const fs = require('node:fs');
const config = require('./config.cjs');
const warren = require('./warren.cjs');
const mongoose = require('./mongoose.cjs');
const { commandsForEnvelope } = require('./commands.cjs');

/**
 * Universal load dispatcher. Reads config, determines mode, returns JSON envelope.
 * Per D-04, D-05, D-06, D-07.
 *
 * @param {string} cwd - Working directory
 * @returns {object} Envelope: { mode, cardCount, commands, data? }
 */
function load(cwd) {
  const cfg = config.load(cwd);
  let resolvedMode = cfg.loadMode;

  // For auto mode, check file size to decide (D-01, D-02, D-03)
  if (resolvedMode === 'auto') {
    const cardsPath = warren.dataPath(cwd);
    let fileSizeBytes = 0;
    try {
      const stat = fs.statSync(cardsPath);
      fileSizeBytes = stat.size;
    } catch (err) {
      if (err.code === 'ENOENT') {
        fileSizeBytes = 0;
      } else {
        throw err;
      }
    }
    const estimatedTokens = Math.floor(fileSizeBytes / 4);
    resolvedMode = estimatedTokens < cfg.autoThreshold ? 'full' : 'index';
  }

  // Dispatch based on resolved mode
  if (resolvedMode === 'none') {
    // D-07, D-11: no data, but include cardCount
    const data = warren.load(cwd);
    const cardCount = countCards(data.cards);
    return { mode: 'none', cardCount, commands: commandsForEnvelope() };
  }

  if (resolvedMode === 'full') {
    // D-07, WFL-02: full read
    const data = warren.load(cwd);
    const cardCount = countCards(data.cards);
    return { mode: 'full', cardCount, commands: commandsForEnvelope(), data };
  }

  // index mode (D-07, WFL-03, D-15)
  const data = warren.load(cwd);
  const cardCount = countCards(data.cards);
  const indexOpts = { depth: cfg.indexDepth || 0, includeArchived: false };
  const indexData = mongoose.buildIndex(data, indexOpts);
  return { mode: 'index', cardCount, commands: commandsForEnvelope(), data: indexData };
}

/**
 * Count all cards recursively.
 * @param {Array} cards
 * @returns {number}
 */
function countCards(cards) {
  let count = 0;
  for (const card of cards) {
    count += 1;
    if (card.children && card.children.length) {
      count += countCards(card.children);
    }
  }
  return count;
}

module.exports = { load };
