const fs = require("fs");
const path = require("path");

function calculateAverages() {
  const filePath = path.join(__dirname, "latencyKafka.csv");

  const lines = fs
    .readFileSync(filePath, "utf8")
    .split("\n")
    .slice(1)
    .filter(Boolean);

  let wsTotal = 0;
  let wsCount = 0;
  let kafkaTotal = 0;
  let kafkaCount = 0;

  lines.forEach(line => {
    const [, websocket, kafka] = line.split(",");

    if (websocket !== "") {
      wsTotal += Number(websocket);
      wsCount++;
    }

    if (kafka !== "") {
      kafkaTotal += Number(kafka);
      kafkaCount++;
    }
  });

  console.log("\n===== LATENCY RESULTS =====");

  console.log(
    "WebSocket Avg Latency:",
    wsCount ? (wsTotal / wsCount).toFixed(2) : "N/A",
    "ms"
  );

  console.log(
    "Kafka Avg Latency:",
    kafkaCount ? (kafkaTotal / kafkaCount).toFixed(2) : "N/A",
    "ms"
  );
}

module.exports = calculateAverages;
