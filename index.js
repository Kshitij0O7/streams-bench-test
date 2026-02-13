require("dotenv").config();

const startBirdeyeStream = require("./birdeyeStream");
const startBitqueryStream = require("./bitqueryStream");
const appendRow = require("./saveFile");
// const calculateAverages = require("./calculate");

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

function handleData({ provider, token, recieveAt }) {

  // Initialize bucket if not present
  if (!store[token]) {
    store[token] = {
      createdAt: Date.now()
    };
  }

  if (store[token][provider] === undefined) {
    store[token][provider] = true;
  }

  checkAndFlush(token);
}

function checkAndFlush(token) {
  const entry = store[token];
  if (!entry) return;

  const hasBirdeye = entry.birdeye !== undefined;
  const hasBitquery = entry.bitquery !== undefined;
  const isTimedOut = Date.now() - entry.createdAt > TIMEOUT_MS;

  // Flush if both providers responded OR timeout reached
  if ((hasBirdeye && hasBitquery) || isTimedOut) {

    appendRow(
      token,
      entry.birdeye,
      entry.bitquery
    );

    delete store[token];
  }
}

// Periodic cleanup in case flush not triggered automatically
setInterval(() => {
  Object.keys(store).forEach(token => {
    checkAndFlush(token);
  });
}, 1000);

// Start both streams simultaneously
startBirdeyeStream(handleData);
startBitqueryStream(handleData);

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nStopping benchmark...");

  // Flush any remaining buckets
  Object.keys(store).forEach(token => {
    const entry = store[token];
    appendRow(
      token,
      entry.birdeye,
      entry.bitquery
    );
  });

  // calculateAverages();
  process.exit();
});
