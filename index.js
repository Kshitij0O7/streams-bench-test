require("dotenv").config();

const startBirdeyeStream = require("./birdeyeStream");
const startBitqueryStream = require("./bitqueryStream");
const appendRow = require("./saveFile");
const calculateAverages = require("./calculate");

/*
  store structure:

  {
    [bucketSecond]: {
        createdAt: timestamp,
        birdeye: latency,
        bitquery: latency
    }
  }
*/

const store = {};
const TIMEOUT_MS = 4000; // Flush bucket after 4 seconds if incomplete

function handleData({ provider, bucketSecond, latency }) {

  // Initialize bucket if not present
  if (!store[bucketSecond]) {
    store[bucketSecond] = {
      createdAt: Date.now()
    };
  }

  // Only store first latency per provider per second
  if (store[bucketSecond][provider] === undefined) {
    store[bucketSecond][provider] = latency;
  }

  checkAndFlush(bucketSecond);
}

function checkAndFlush(bucketSecond) {
  const entry = store[bucketSecond];
  if (!entry) return;

  const hasBirdeye = entry.birdeye !== undefined;
  const hasBitquery = entry.bitquery !== undefined;
  const isTimedOut = Date.now() - entry.createdAt > TIMEOUT_MS;

  // Flush if both providers responded OR timeout reached
  if ((hasBirdeye && hasBitquery) || isTimedOut) {

    appendRow(
      bucketSecond,
      entry.birdeye,
      entry.bitquery
    );

    delete store[bucketSecond];
  }
}

// Periodic cleanup in case flush not triggered automatically
setInterval(() => {
  Object.keys(store).forEach(bucketSecond => {
    checkAndFlush(bucketSecond);
  });
}, 1000);

// Start both streams simultaneously
startBirdeyeStream(handleData);
startBitqueryStream(handleData);

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nStopping benchmark...");

  // Flush any remaining buckets
  Object.keys(store).forEach(bucketSecond => {
    const entry = store[bucketSecond];
    appendRow(
      bucketSecond,
      entry.birdeye,
      entry.bitquery
    );
  });

  calculateAverages();
  process.exit();
});
