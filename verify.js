// verify.js
// Usage: node verify.js
// Expects: coverage.csv in same folder (or set COVERAGE_CSV path in env)
// Writes: missingTokens.txt (one mint address per line)
//
// Env vars:
//   BITQUERY_TOKEN=ory_at_...
//   COVERAGE_CSV=./coverage.csv          (optional)
//   MISSING_OUT=./missingTokens.txt      (optional)
//   CONCURRENCY=5                        (optional)
//   RETRIES=2                            (optional)
require("dotenv").config();

const fs = require("fs");
const path = require("path");

const COVERAGE_CSV = path.join(__dirname, "coverage1.csv");
const MISSING_OUT = path.join(__dirname, "missingTokens.txt");
const BITQUERY_TOKEN = process.env.BITQUERY_TOKEN || ""; // put token in env, not hardcoded

const ENDPOINT = "https://streaming.bitquery.io/graphql";
const CREATE_PROGRAM = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
const CREATE_METHODS = ["create", "create_v2"];

if (!fs.existsSync(COVERAGE_CSV)) {
  console.error(`coverage.csv not found at: ${COVERAGE_CSV}`);
  process.exit(1);
}
if (!BITQUERY_TOKEN) {
  console.error("Missing BITQUERY_TOKEN in environment.");
  process.exit(1);
}

// Minimal CSV parser (handles commas + quoted fields)
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      cur += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && ch === ",") {
      row.push(cur);
      cur = "";
      continue;
    }
    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && next === "\n") i++;
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
      continue;
    }
    cur += ch;
  }

  if (cur.length > 0 || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }

  return rows;
}

function normHeader(h) {
  return String(h || "").trim().toLowerCase().replace(/\s+/g, "");
}

function sanitizeCell(s) {
  return String(s || "").trim().replace(/^"|"$/g, "");
}

function buildQuery(mint) {
  return `
{
  Solana {
    DEXPools(
      where: {Pool: {Market: {BaseCurrency: {MintAddress: {is: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN"}}}}, Transaction: {Result: {Success: true}, Signature: {is: "${mint}"}}}
    ) {
      Block {
        Time
      }
      Transaction {
        Signature
      }
      Pool {
        Market {
          MarketAddress
          BaseCurrency {
            MintAddress
            Symbol
            Name
            Decimals
          }
          QuoteCurrency {
            MintAddress
            Symbol
            Name
            Decimals
          }
        }
        Dex {
          ProgramAddress
          ProtocolName
          ProtocolFamily
        }
        Base {
          ChangeAmount
          ChangeAmountInUSD
          PostAmount
          PostAmountInUSD
          Price
          PriceInUSD
        }
        Quote {
          ChangeAmount
          ChangeAmountInUSD
          PostAmount
          PostAmountInUSD
          Price
          PriceInUSD
        }
      }
      Instruction {
        Program {
          Method
        }
      }
    }
  }
}
`.trim();
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function postBitquery(query, attempt = 0) {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BITQUERY_TOKEN}`,
      },
      body: JSON.stringify({ query, variables: {} }),
    });

    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Non-JSON response: ${text.slice(0, 200)}`);
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
    }

    if (json.errors?.length) {
      throw new Error(`Bitquery errors: ${JSON.stringify(json.errors).slice(0, 300)}`);
    }

    return json;
  } catch (e) {
    const retries = Number(process.env.RETRIES || 2);
    if (attempt < retries) {
      await sleep(500 * Math.pow(2, attempt));
      return postBitquery(query, attempt + 1);
    }
    throw e;
  }
}

async function isMissingByQuery(mint) {
  const query = buildQuery(mint);
  const json = await postBitquery(query);
  const updates = json?.data?.Solana?.DEXPools;
  return !Array.isArray(updates) || updates.length === 0;
}

async function main() {
  const csvText = fs.readFileSync(COVERAGE_CSV, "utf8");
  const rows = parseCSV(csvText);

  if (rows.length < 2) {
    console.error("coverage.csv appears empty (need header + rows).");
    process.exit(1);
  }

  const headers = rows[0].map(normHeader);

  const tokenIdx = headers.indexOf("tokenaddress");
  const bitqueryIdx = headers.indexOf("bitquery");

  if (tokenIdx === -1 || bitqueryIdx === -1) {
    console.error(
      `Expected headers "TokenAddress" and "Bitquery". Found: ${rows[0].join(", ")}`
    );
    process.exit(1);
  }

  // Only tokens with empty Bitquery column
  const candidates = rows
    .slice(1)
    .map((r) => ({
      token: sanitizeCell(r[tokenIdx]),
      bitquery: sanitizeCell(r[bitqueryIdx]),
    }))
    .filter((x) => x.token && !x.bitquery);

  // Deduplicate candidates
  const seen = new Set();
  const tokensToVerify = [];
  for (const c of candidates) {
    if (!seen.has(c.token)) {
      seen.add(c.token);
      tokensToVerify.push(c.token);
    }
  }

  fs.writeFileSync(MISSING_OUT, "", "utf8");

  const concurrency = Math.max(1, Number(process.env.CONCURRENCY || 5));
  let cursor = 0;

  console.log(`Loaded ${rows.length - 1} rows from ${COVERAGE_CSV}`);
  console.log(`Tokens requiring verification (Bitquery empty): ${tokensToVerify.length}`);
  console.log(`Concurrency: ${concurrency}`);
  console.log(`Output: ${MISSING_OUT}\n`);

  let missingCount = 0;
  let okCount = 0;
  let errCount = 0;

  async function worker(id) {
    while (true) {
      const i = cursor++;
      if (i >= tokensToVerify.length) return;

      const mint = tokensToVerify[i];

      try {
        const missing = await isMissingByQuery(mint);
        if (missing) {
          fs.appendFileSync(MISSING_OUT, mint + "\n", "utf8");
          missingCount++;
          console.log(`[${id}] MISSING ${mint}`);
        } else {
          okCount++;
          // console.log(`[${id}] FOUND   ${mint}`);
        }
      } catch (e) {
        errCount++;
        console.error(`[${id}] ERROR  ${mint} -> ${e.message}`);
        // policy: don't mark missing on error
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, (_, i) => worker(i + 1)));

  console.log("\n===== SUMMARY =====");
  console.log("Checked:", tokensToVerify.length);
  console.log("Found (non-empty response):", okCount);
  console.log("Missing (empty response):  ", missingCount);
  console.log("Errors:", errCount);
  console.log("Saved missing tokens to:", MISSING_OUT);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
