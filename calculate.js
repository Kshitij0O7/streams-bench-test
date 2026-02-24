const fs = require("fs");
const path = require("path");

function num(x) {
  if (x === "" || x === undefined) return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function calculateQuality() {
  const filePath = path.join(__dirname, "ohlcv_quality.csv");

  const lines = fs.readFileSync(filePath, "utf8")
    .split("\n")
    .slice(1)
    .filter(Boolean);

  let total = 0;
  let paired = 0;
  let exactMatch = 0;

  const diffs = {
    open: { sum: 0, count: 0 },
    high: { sum: 0, count: 0 },
    low:  { sum: 0, count: 0 },
    close:{ sum: 0, count: 0 },
  };

  for (const line of lines) {
    total++;

    const [
      startTime,
      bO, bH, bL, bC,
      qO, qH, qL, qC
    ] = line.split(",");

    const b = { o: num(bO), h: num(bH), l: num(bL), c: num(bC) };
    const q = { o: num(qO), h: num(qH), l: num(qL), c: num(qC) };

    const hasBoth = [b.o,b.h,b.l,b.c,q.o,q.h,q.l,q.c].every(v => v !== null);
    if (!hasBoth) continue;

    paired++;

    const isExact =
      b.o === q.o &&
      b.h === q.h &&
      b.l === q.l &&
      b.c === q.c;

    if (isExact) exactMatch++;

    const addDiff = (k, a, b) => {
      diffs[k].sum += Math.abs(a - b);
      diffs[k].count += 1;
    };

    addDiff("open", b.o, q.o);
    addDiff("high", b.h, q.h);
    addDiff("low",  b.l, q.l);
    addDiff("close",b.c, q.c);
  }

  console.log("\n===== OHLCV QUALITY RESULTS =====");
  console.log("Total rows:", total);
  console.log("Paired rows:", paired);
  console.log(
    "Exact OHLC match rate:",
    paired ? ((exactMatch / paired) * 100).toFixed(2) + "%" : "N/A"
  );

  const avg = (k) => diffs[k].count ? (diffs[k].sum / diffs[k].count).toFixed(10) : "N/A";

  console.log("Avg |Open diff| :", avg("open"));
  console.log("Avg |High diff| :", avg("high"));
  console.log("Avg |Low diff|  :", avg("low"));
  console.log("Avg |Close diff|:", avg("close"));
}

module.exports = calculateQuality;
