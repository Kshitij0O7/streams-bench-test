const fs = require("fs");
const path = require("path");

function calculateAverages() {
  const filePath = path.join(__dirname, "latency.csv");

  const lines = fs.readFileSync(filePath, "utf8")
    .split("\n")
    .slice(1) // skip header
    .filter(Boolean);

  let birdeyeTotal = 0;
  let bitqueryTotal = 0;
  let birdeyeCount = 0;
  let bitqueryCount = 0;

  lines.forEach(line => {
    const [, birdeye, bitquery] = line.split(",");

    if (birdeye) {
      birdeyeTotal += Number(birdeye);
      birdeyeCount++;
    }

    if (bitquery) {
      bitqueryTotal += Number(bitquery);
      bitqueryCount++;
    }
  });

  console.log("\n===== LATENCY RESULTS =====");
  console.log("Birdeye Avg Latency:",
    (birdeyeTotal / birdeyeCount).toFixed(2), "ms");
  console.log("Bitquery Avg Latency:",
    (bitqueryTotal / bitqueryCount).toFixed(2), "ms");
}

module.exports = calculateAverages;
