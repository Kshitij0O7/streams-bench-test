require("dotenv").config();

const startBitqueryStream = require("./bitqueryStream");
const startKafkaStream = require("./kafkaStream");
const appendRow = require("./saveFile");
const calculateAverages = require("./calculate");

const store = {};
const TIMEOUT_MS = 6000; // Give Kafka + WS enough sync time

/*
  store structure:

  {
    [bucketSecond]: {
        createdAt: timestamp,
        websocket: latency,
        kafka: latency
    }
  }
*/

function handleData({ provider, bucketSecond, latency }) {
  if (!store[bucketSecond]) {
    store[bucketSecond] = {
      createdAt: Date.now(),
    };
  }

  // Only record first latency per provider per second
  if (store[bucketSecond][provider] === undefined) {
    store[bucketSecond][provider] = latency;
  }

  checkAndFlush(bucketSecond);
}

function checkAndFlush(bucketSecond) {
  const entry = store[bucketSecond];
  if (!entry) return;

  const hasWebsocket = entry.websocket !== undefined;
  const hasKafka = entry.kafka !== undefined;
  const isTimedOut = Date.now() - entry.createdAt > TIMEOUT_MS;

  if ((hasWebsocket && hasKafka) || isTimedOut) {
    appendRow(bucketSecond, entry.websocket, entry.kafka);
    delete store[bucketSecond];
  }
}

// Periodic cleanup to avoid stale buckets
setInterval(() => {
  Object.keys(store).forEach(bucketSecond => {
    checkAndFlush(bucketSecond);
  });
}, 1000);

// Start both streams simultaneously
startBitqueryStream(handleData);
const stopKafka = startKafkaStream(handleData);

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nStopping benchmark...");

  // Flush remaining entries
  Object.keys(store).forEach(bucketSecond => {
    const entry = store[bucketSecond];
    appendRow(bucketSecond, entry.websocket, entry.kafka);
  });

  if (stopKafka) {
    await stopKafka();
  }

  calculateAverages();
  process.exit();
});
