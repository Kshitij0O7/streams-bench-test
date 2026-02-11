const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "latency.csv");

// Create file if not exists
if (!fs.existsSync(filePath)) {
  fs.writeFileSync(filePath, "BlockTime,BirdeyeLatency,BitqueryLatency\n");
}

function appendRow(blockTime, birdeyeLatency, bitqueryLatency) {
  const row = `${blockTime},${birdeyeLatency || ""},${bitqueryLatency || ""}\n`;
  fs.appendFileSync(filePath, row);
}

module.exports = appendRow;
