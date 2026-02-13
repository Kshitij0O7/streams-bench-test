# Token Listing Coverage Benchmark — Bitquery vs Birdeye

This repository contains a benchmark framework for comparing **token listing detection coverage** between:

* **Birdeye WebSocket Token New Listing Stream**
* **Bitquery Token Supply Updates Stream**

The goal is to measure which provider detects new token listings (specifically from pump.fun) first and how comprehensive their coverage is.

# 📌 What This Benchmark Measures

This benchmark tracks which provider detects new token listings from pump.fun:

* **Birdeye**: Subscribes to `SUBSCRIBE_TOKEN_NEW_LISTING` with `meme_platform_enabled: true` and `sources: ["pump_dot_fun"]`
* **Bitquery**: Subscribes to `TokenSupplyUpdates` for tokens created via the pump.fun program (`6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`)

For each token detected, the benchmark records:
- Whether Birdeye detected it (`true` or empty)
- Whether Bitquery detected it (`true` or empty)

The system uses a token-based matching approach:
- Each token address serves as a unique key
- Both providers' responses are matched by token address
- A 4-second timeout ensures incomplete matches are still recorded
- Periodic cleanup prevents memory leaks

---

# 🧠 Why This Methodology Matters

Comparing token listing detection across providers requires:

* **Fair matching**: Both providers must detect the same token for a valid comparison
* **Timeout handling**: Some tokens may only be detected by one provider
* **Deduplication**: The same token may be detected multiple times
* **Normalization**: Raw CSV output may contain duplicates that need cleaning

This benchmark:
- Matches tokens by address across both providers
- Handles cases where only one provider detects a token
- Uses timeout-based flush to prevent missing data
- Includes a deduplication script to normalize results

This makes the results:

✔ Fair

✔ Comparable

✔ Reproducible

✔ Normalized (after running dedupe.js)

---

# 📂 Project Structure

```
.
├── index.js               # Entry point and token matching logic
├── birdeyeStream.js       # Birdeye WebSocket stream logic
├── bitqueryStream.js      # Bitquery WebSocket stream logic
├── saveFile.js            # CSV writer
├── dedupe.js              # CSV normalization and deduplication script
├── .env                   # API keys (not committed)
└── coverage.csv           # Output file (auto-generated)
```

---

# ⚙️ Setup Instructions

## 1️⃣ Clone Repository

```bash
git clone https://github.com/Kshitij0O7/streams-bench-test
cd streams-bench-test
```

## 2️⃣ Install Dependencies

```bash
npm install
```

Dependencies used:

* `ws`
* `websocket`
* `dotenv`

---

## 3️⃣ Create `.env` File

```env
BIRDEYE_API_KEY=your_birdeye_key
BITQUERY_TOKEN=your_bitquery_token
CHAIN=solana
```

> ⚠️ WebSocket streaming on Birdeye requires a paid plan.

> ⚠️ Note: `TOKEN_ADDRESS` is no longer required as we're subscribing to new listings, not a specific token.

---

## 4️⃣ Run Benchmark

```bash
npm start
```

Stop using:

```
CTRL + C
```

On exit, the script will:

* Flush any remaining token data
* Preserve full dataset in `coverage.csv`

---

## 5️⃣ Normalize CSV Output

**Important**: After ending the program, run the deduplication script to normalize the CSV file:

```bash
node dedupe.js
```

This script will:
- Remove duplicate token entries
- Merge coverage data for the same token (if detected multiple times)
- Overwrite `coverage.csv` with normalized data
- Display statistics about missing coverage

---

# 📊 Output Format

`coverage.csv` (before deduplication):

```
TokenAddress,Birdeye,Bitquery
7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU,true,
7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU,true,true
AbC123...,true,true
...
```

`coverage.csv` (after running `dedupe.js`):

```
TokenAddress,Birdeye,Bitquery
7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU,true,true
AbC123...,true,true
...
```

Where:

* `TokenAddress` = Solana token mint address
* `Birdeye` = `true` if Birdeye detected the token, empty otherwise
* `Bitquery` = `true` if Bitquery detected the token, empty otherwise

---

# 📈 What To Expect

Typical observations:

* Some tokens may be detected by both providers
* Some tokens may only be detected by one provider
* The same token may appear multiple times in the raw CSV (before deduplication)
* Network conditions and provider processing times can affect detection order
* Timeout mechanism (4 seconds) ensures incomplete matches are still recorded

Coverage differences depend on:

* Provider indexing speed
* Network conditions
* Token creation volume
* Provider filtering logic
* System processing delays

---

# 🔬 Methodology Notes

To ensure fair comparison:

* Both streams run simultaneously
* Same machine
* Same network
* Same source (pump.fun token listings)
* Token-based matching (not time-based)
* Timeout flush (4 seconds) prevents missing rows
* Deduplication script normalizes final results

---

# ⚠️ Important Considerations

### 1️⃣ Pump.fun Token Listings

This benchmark specifically tests detection of new tokens created via pump.fun on Solana.

### 2️⃣ Token Matching

* Tokens are matched by their mint address
* Both providers must detect the same token for a complete match
* Incomplete matches (only one provider) are still recorded

### 3️⃣ Deduplication Required

The raw `coverage.csv` file may contain duplicate entries for the same token. Always run `node dedupe.js` after ending the program to get normalized results.

### 4️⃣ Not Measuring:

* Latency between detection times
* Block propagation delay
* WebSocket handshake time

Only **token listing detection coverage** is measured.

---

# 🧪 Suggested Advanced Experiments

You may extend this benchmark to:

* Measure detection latency (time difference between providers)
* Compare coverage across different meme platforms
* Test under high-volume conditions
* Run long-duration tests (hours/days)
* Analyze false positives/negatives
* Compare detection rates by token characteristics

---

# 📌 Example Results

After running the benchmark and `dedupe.js`:

```
✅ Deduplication complete (file overwritten)
Total unique tokens: 1523
Missing Birdeye: 45
Missing Bitquery: 89
```

This indicates:
- 1523 unique tokens were detected
- 45 tokens were only detected by Bitquery
- 89 tokens were only detected by Birdeye
- The remaining tokens were detected by both providers

---

# 🧾 License

MIT License

---

# 🤝 Contributing

Pull requests welcome.

If you improve methodology (e.g., detection latency measurement, statistical analysis, visualization), contributions are appreciated.

---

# 📣 Disclaimer

This benchmark measures coverage under specific conditions and should not be interpreted as a universal performance guarantee. Results vary based on:

* Network conditions
* Token creation volume
* Chain activity
* Time of day
* Provider infrastructure
* Filtering and indexing logic

Always run independent tests for your own production evaluation.
