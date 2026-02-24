const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "ohlcv_quality.csv");

if (!fs.existsSync(filePath)) {
  fs.writeFileSync(
    filePath,
    [
      "StartTime",
      "BirdeyeOpen","BirdeyeHigh","BirdeyeLow","BirdeyeClose",
      "BitqueryOpen","BitqueryHigh","BitqueryLow","BitqueryClose"
    ].join(",") + "\n"
  );
}

function val(x) {
  return (x === null || x === undefined || Number.isNaN(x)) ? "" : x;
}

function appendRow(startTime, birdeye, bitquery) {
  const b = birdeye || {};
  const q = bitquery || {};

  const row = [
    startTime,
    val(b.open), val(b.high), val(b.low), val(b.close),
    val(q.open), val(q.high), val(q.low), val(q.close),
  ].join(",") + "\n";

  fs.appendFileSync(filePath, row);
}

module.exports = appendRow;
