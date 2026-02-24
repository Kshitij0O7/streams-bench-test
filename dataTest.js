require("dotenv").config();
const fs = require("fs");
const path = require("path");

const TOKEN = process.env.TOKEN_ADDRESS; // set in .env
const CHAIN = "solana";
const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;
const BITQUERY_TOKEN = process.env.BITQUERY_TOKEN;

const HOURS = 48;
const DURATION_SECONDS = 60;
const DEVIATION_THRESHOLD = 0.02; // 2% deviation considered anomaly

const OUT_FILE = path.join(__dirname, "deviations2days.csv");

// Create file only if it does not exist
if (!fs.existsSync(OUT_FILE)) {
  fs.writeFileSync(
    OUT_FILE,
    [
      "TimestampISO",
      "Field",
      "DeviationPct",
      "BirdeyeValue",
      "BitqueryValue",
      "Token",
    ].join(",") + "\n"
  );
}

// ----------------------------------
// Utility
// ----------------------------------

function toUnixSeconds(date) {
  return Math.floor(date.getTime() / 1000);
}

function normalizeMinute(ts) {
  return Math.floor(new Date(ts).getTime() / 60000) * 60000;
}

function pctDiff(a, b) {
  if (!a || !b) return null;
  return Math.abs(a - b) / ((a + b) / 2);
}

function appendDeviationRow({ ts, field, diff, birdeyeVal, bitqueryVal }) {
  const iso = new Date(Number(ts)).toISOString();
  const row = [
    iso,
    field,
    (diff * 100).toFixed(6),
    birdeyeVal,
    bitqueryVal,
    TOKEN,
  ].join(",") + "\n";

  fs.appendFileSync(OUT_FILE, row);
}

// ----------------------------------
// Fetch Birdeye
// ----------------------------------

async function fetchBirdeye() {
  const to = toUnixSeconds(new Date());
  const from = to - HOURS * 3600;

  const url = `https://public-api.birdeye.so/defi/ohlcv?address=${TOKEN}&type=1m&currency=usd&time_from=${from}&time_to=${to}&ui_amount_mode=raw`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "x-chain": CHAIN,
      accept: "application/json",
      "X-API-KEY": BIRDEYE_API_KEY,
    },
  });

  const json = await res.json();

  const map = {};
  for (const item of json.data.items) {
    const ts = normalizeMinute(item.unixTime * 1000);
    map[ts] = {
      open: Number(item.o),
      high: Number(item.h),
      low: Number(item.l),
      close: Number(item.c),
    };
  }

  return map;
}

// ----------------------------------
// Fetch Bitquery
// ----------------------------------

async function fetchBitquery() {
  const query = `
    query {
      Trading {
        Tokens(
          where: {
            Interval: {Time: {Start: {since_relative: {hours_ago: ${HOURS}}} Duration: {eq: ${DURATION_SECONDS}}}},
            Token: {Address: {is: "${TOKEN}"}}
          }
          orderBy: {ascending: Interval_Time_Start}
        ) {
          Interval {
            Time {
              Start
            }
          }
          Price {
            Ohlc {
              Open
              High
              Low
              Close
            }
          }
        }
      }
    }
  `;

  const res = await fetch("https://streaming.bitquery.io/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${BITQUERY_TOKEN}`,
    },
    body: JSON.stringify({ query }),
  });

  const json = await res.json();

  const map = {};
  const items = json.data?.Trading?.Tokens || [];

  for (const item of items) {
    const ts = normalizeMinute(item.Interval.Time.Start);
    map[ts] = {
      open: Number(item.Price.Ohlc.Open),
      high: Number(item.Price.Ohlc.High),
      low: Number(item.Price.Ohlc.Low),
      close: Number(item.Price.Ohlc.Close),
    };
  }

  return map;
}

// ----------------------------------
// Compare
// ----------------------------------

function compare(birdeye, bitquery) {
  const allTimestamps = new Set([
    ...Object.keys(birdeye),
    ...Object.keys(bitquery),
  ]);

  let matched = 0;
  let birdeyeMissing = 0;
  let bitqueryMissing = 0;

  let totalDiff = { open: 0, high: 0, low: 0, close: 0 };
  let countDiff = 0;

  let maxDiff = 0;
  let anomalies = 0;

  for (const ts of allTimestamps) {
    const b = birdeye[ts];
    const q = bitquery[ts];

    if (!b) {
      birdeyeMissing++;
      continue;
    }
    if (!q) {
      bitqueryMissing++;
      continue;
    }

    matched++;

    const fields = ["open", "high", "low", "close"];

    for (const f of fields) {
      const diff = pctDiff(b[f], q[f]);
      if (diff === null) continue;

      totalDiff[f] += diff;
      maxDiff = Math.max(maxDiff, diff);

      if (diff > DEVIATION_THRESHOLD) {
        anomalies++;
        appendDeviationRow({
          ts,
          field: f,
          diff,
          birdeyeVal: b[f],
          bitqueryVal: q[f],
        });
      }
    }

    countDiff++;
  }

  console.log("\n===== DATA QUALITY REPORT =====\n");
  console.log("Matched candles:", matched);
  console.log("Birdeye missing:", birdeyeMissing);
  console.log("Bitquery missing:", bitqueryMissing);

  if (countDiff > 0) {
    console.log("\nAverage % deviation:");
    console.log("Open :", (totalDiff.open / countDiff * 100).toFixed(4) + "%");
    console.log("High :", (totalDiff.high / countDiff * 100).toFixed(4) + "%");
    console.log("Low  :", (totalDiff.low / countDiff * 100).toFixed(4) + "%");
    console.log("Close:", (totalDiff.close / countDiff * 100).toFixed(4) + "%");
  }

  console.log("\nMax deviation observed:", (maxDiff * 100).toFixed(4) + "%");
  console.log("Total deviation anomalies (>2%):", anomalies);
  console.log("Saved anomalies to:", OUT_FILE);
}

// ----------------------------------
// Main
// ----------------------------------

(async () => {
  try {
    console.log("Fetching Birdeye...");
    const birdeye = await fetchBirdeye();

    console.log("Fetching Bitquery...");
    const bitquery = await fetchBitquery();

    compare(birdeye, bitquery);
  } catch (err) {
    console.error("Error:", err);
  }
})();
