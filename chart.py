# data_visualization.py
# This script reads deviations.csv and produces specialized charts
# to help infer meaningful patterns in OHLC deviations.

import pandas as pd
import matplotlib.pyplot as plt
import os

FILE_PATH = "deviations7hrsNative.csv"

if not os.path.exists(FILE_PATH):
    raise FileNotFoundError("deviations.csv not found in current directory")

# Load data
df = pd.read_csv(FILE_PATH)

if df.empty:
    raise ValueError("deviations.csv is empty")

# Convert numeric columns
df["DeviationPct"] = pd.to_numeric(df["DeviationPct"], errors="coerce")
df["TimestampISO"] = pd.to_datetime(df["TimestampISO"], errors="coerce")

# Drop invalid rows
df = df.dropna(subset=["DeviationPct", "TimestampISO"])

# --------------------------------------------------
# 1️⃣ Deviation Distribution Histogram
# --------------------------------------------------
plt.figure()
plt.hist(df["DeviationPct"], bins=50)
plt.title("Distribution of % Deviations")
plt.xlabel("Deviation (%)")
plt.ylabel("Frequency")
plt.show()

# --------------------------------------------------
# 2️⃣ Deviation Over Time (Scatter)
# --------------------------------------------------
plt.figure()
plt.scatter(df["TimestampISO"], df["DeviationPct"])
plt.title("Deviation Over Time")
plt.xlabel("Time")
plt.ylabel("Deviation (%)")
plt.xticks(rotation=45)
plt.tight_layout()
plt.show()

# --------------------------------------------------
# 3️⃣ Field-wise Average Deviation Bar Chart
# --------------------------------------------------
field_avg = df.groupby("Field")["DeviationPct"].mean()

plt.figure()
field_avg.plot(kind="bar")
plt.title("Average Deviation by OHLC Field")
plt.xlabel("Field")
plt.ylabel("Average Deviation (%)")
plt.tight_layout()
plt.show()

# --------------------------------------------------
# 4️⃣ Rolling Mean of Deviation (Trend Detection)
# --------------------------------------------------
df_sorted = df.sort_values("TimestampISO")
df_sorted["RollingMean"] = df_sorted["DeviationPct"].rolling(window=20).mean()

plt.figure()
plt.plot(df_sorted["TimestampISO"], df_sorted["RollingMean"])
plt.title("Rolling Mean (20-Window) of Deviations")
plt.xlabel("Time")
plt.ylabel("Rolling Mean Deviation (%)")
plt.xticks(rotation=45)
plt.tight_layout()
plt.show()

print("\nCharts generated successfully. Use these to infer:")
print("- Whether deviations are random noise or clustered")
print("- Whether specific OHLC fields deviate more frequently")
print("- Whether deviations increase during specific time windows")
print("- Whether there is systematic bias (consistent drift)")
