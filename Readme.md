# Websocket Streams Latency Benchmark — Bitquery vs Birdeye

This repository contains a reproducible benchmark framework for comparing **websocket streams latency** between:

* **Birdeye WebSocket OHLCV Stream**
* **Bitquery Trading Stream**

The goal is to measure **end-to-end latency** in a fair, technically defensible way under identical system and network conditions.

# 📌 What This Benchmark Measures


For each 1-second OHLCV interval, we measure:

```
Latency = Time message received by client - Interval start time
```

Where:

* **Birdeye**

  * Uses `unixTime` (seconds) from `PRICE_DATA`
  * Converted to milliseconds

* **Bitquery**

  * Uses `Interval.Time.Start` (ISO format)
  * Converted to Unix milliseconds

Both providers are normalized to a common:

```
bucketSecond = epoch second
```

Each second is treated as a unique key.

---

# 🧠 Why This Methodology Matters

Naively measuring latency using block timestamps can be misleading due to:

* Candle start vs candle close semantics
* Nanoseconds vs seconds mismatch
* Multiple updates per interval
* Aggregation timing differences

This benchmark:

* Aligns timestamps properly
* Uses 1-second OHLCV interval start time
* Ensures one entry per provider per second
* Handles duplicate emissions safely
* Uses timeout-based flush for incomplete seconds

This makes the results:

✔ Fair

✔ Comparable

✔ Reproducible

✔ Publishable

---

# 📂 Project Structure

```
.
├── index.js               # Entry point
├── birdeyeStream.js       # Birdeye WebSocket stream logic
├── bitqueryStream.js      # Bitquery Websocket stream logic
├── saveFile.js            # CSV writer
├── calculate.js           # Average latency calculator
├── .env                   # API keys (not committed)
└── latency.csv            # Output file (auto-generated)
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
TOKEN_ADDRESS=token_address_here
CHAIN=solana
```

> ⚠️ WebSocket streaming on Birdeye requires a paid plan.

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

* Flush remaining interval data
* Calculate and print average latency
* Preserve full dataset in `latency.csv`

---

# 📊 Output Format

`latency.csv`:

```
BucketSecond,BirdeyeLatency,BitqueryLatency
1770817574,2477,1089
1770817580,,1015
1770817583,2872,1567
...
```

Where:

* `BucketSecond` = epoch second
* Latencies = milliseconds

---

# 📈 What To Expect

Typical observations:

* Bitquery may emit multiple updates per second
* Only first latency per provider per second is recorded
* Birdeye may skip seconds with no trades
* Network jitter can influence results

Latency ranges depend on:

* Network conditions
* Token activity
* Provider internal aggregation logic
* System clock accuracy

---

# 🔬 Methodology Notes

To ensure fair comparison:

* Both streams run simultaneously
* Same machine
* Same network
* Same token
* Same interval (1s)
* Timestamp normalization applied
* Duplicate second emissions ignored
* Timeout flush prevents missing rows

---

# ⚠️ Important Considerations

### 1️⃣ 1-Second OHLC Support

Birdeye currently supports 1s OHLC primarily on Solana.

### 2️⃣ Timestamp Semantics

* Birdeye `unixTime` = interval start (seconds)
* Bitquery `Interval.Time.Start` = ISO timestamp

Both are normalized to epoch seconds.

### 3️⃣ Not Measuring:

* Ping time
* WebSocket handshake latency
* Raw block propagation delay

Only **application-level OHLCV streaming latency**.

---

# 🧪 Suggested Advanced Experiments

You may extend this benchmark to:

* Measure P50 / P95 / P99
* Compare first-arrival per interval
* Benchmark trade stream latency
* Test under load (multiple tokens)
* Run long-duration (30+ min)
* Deploy on VPS for cleaner network conditions

---

# 📌 Results

```
===== LATENCY RESULTS =====
Birdeye Avg Latency: 2330.80 ms
Bitquery Avg Latency: 1664.10 ms
```

After correcting timestamp alignment to interval start time:

Expected values are typically much closer and more realistic.

---

# 🧾 License

MIT License

---

# 🤝 Contributing

Pull requests welcome.

If you improve methodology (e.g., percentile calculation, statistical tests, visualization), contributions are appreciated.

---

# 📣 Disclaimer

This benchmark measures latency under specific conditions and should not be interpreted as a universal performance guarantee. Results vary based on:

* Network
* Token
* Chain
* Time of day
* Provider infrastructure

Always run independent tests for your own production evaluation.

