const fs = require("fs");
const path = require("path");

function calculateAverages() {
  const filePath = path.join(__dirname, "latency.csv");

  const lines = fs.readFileSync(filePath, "utf8")
    .split("\n")
    .slice(1) // skip header
    .filter(Boolean);

  // Group rows by startTime
  const grouped = {};

  lines.forEach(line => {
    const [startTime, birdeye, bitquery] = line.split(",");

    if (!grouped[startTime]) {
      grouped[startTime] = [];
    }

    grouped[startTime].push({
      birdeye: birdeye ? Number(birdeye) : null,
      bitquery: bitquery ? Number(bitquery) : null,
    });
  });

  let birdeyeTotal = 0;
  let bitqueryTotal = 0;
  let birdeyeCount = 0;
  let bitqueryCount = 0;

  Object.values(grouped).forEach(entries => {

    let selected = null;

    // 1️⃣ Prefer entry where both latencies exist
    for (const entry of entries) {
      if (entry.birdeye !== null && entry.bitquery !== null) {
        selected = entry;
        break;
      }
    }

    // 2️⃣ Otherwise take first entry
    if (!selected) {
      selected = entries[0];
    }

    if (selected.birdeye !== null) {
      birdeyeTotal += selected.birdeye;
      birdeyeCount++;
    }

    if (selected.bitquery !== null) {
      bitqueryTotal += selected.bitquery;
      bitqueryCount++;
    }
  });

  console.log("\n===== LATENCY RESULTS =====");
  console.log(
    "Birdeye Avg Latency:",
    birdeyeCount ? (birdeyeTotal / birdeyeCount).toFixed(2) : "N/A",
    "ms"
  );

  console.log(
    "Bitquery Avg Latency:",
    bitqueryCount ? (bitqueryTotal / bitqueryCount).toFixed(2) : "N/A",
    "ms"
  );
}

module.exports = calculateAverages;
