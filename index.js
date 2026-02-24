require("dotenv").config();

const startBirdeyeStream = require("./birdeyeStream");
const startBitqueryStream = require("./bitqueryStream");
const appendRow = require("./saveFile");
const calculateQuality = require("./calculate");

/**
 * store structure:
 * {
 *   [startTime]: {
 *     createdAt: number,
 *     birdeye: { open, high, low, close },
 *     bitquery:{ open, high, low, close }
 *   }
 * }
 */
const store = {};
const TIMEOUT_MS = 4000;

function normalizeOHLC({ open, high, low, close }) {
  // Convert to numbers to avoid string compare issues
  return {
    open: open !== undefined ? Number(open) : null,
    high: high !== undefined ? Number(high) : null,
    low: low !== undefined ? Number(low) : null,
    close: close !== undefined ? Number(close) : null,
  };
}

function handleData({ provider, startTime, open, high, low, close }) {
  if (!startTime) return;

  if (!store[startTime]) {
    store[startTime] = { createdAt: Date.now() };
  }

  // only store first update per provider per startTime
  if (store[startTime][provider] === undefined) {
    store[startTime][provider] = normalizeOHLC({ open, high, low, close });
  }

  checkAndFlush(startTime);
}

function checkAndFlush(startTime) {
  const entry = store[startTime];
  if (!entry) return;

  const hasBirdeye = entry.birdeye !== undefined;
  const hasBitquery = entry.bitquery !== undefined;
  const isTimedOut = Date.now() - entry.createdAt > TIMEOUT_MS;

  if ((hasBirdeye && hasBitquery) || isTimedOut) {
    appendRow(startTime, entry.birdeye, entry.bitquery);
    delete store[startTime];
  }
}

// periodic cleanup
setInterval(() => {
  Object.keys(store).forEach(checkAndFlush);
}, 1000);

// start both streams
startBirdeyeStream(handleData);
startBitqueryStream(handleData);

// graceful shutdown
process.on("SIGINT", () => {
  console.log("\nStopping quality benchmark...");

  // Flush remaining rows
  Object.keys(store).forEach((startTime) => {
    const entry = store[startTime];
    appendRow(startTime, entry.birdeye, entry.bitquery);
  });

  calculateQuality();
  process.exit();
});
