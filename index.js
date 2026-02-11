require("dotenv").config();

const startBirdeyeStream = require("./birdeyeStream");
const startBitqueryStream = require("./bitqueryStream");
const appendRow = require("./saveFile");
const calculateAverages = require("./calculate");

const latencyStore = {};

// Unified handler
function handleData({ provider, blockTime, latency }) {
  if (!latencyStore[blockTime]) {
    latencyStore[blockTime] = {};
  }

  latencyStore[blockTime][provider] = latency;

  const entry = latencyStore[blockTime];

  if (entry.birdeye || entry.bitquery) {
    appendRow(
      blockTime,
      entry.birdeye,
      entry.bitquery
    );
  }
}

// Start both simultaneously
startBirdeyeStream(handleData);
startBitqueryStream(handleData);

// On exit → calculate averages
process.on("SIGINT", () => {
  console.log("\nStopping benchmark...");
  calculateAverages();
  process.exit();
});
