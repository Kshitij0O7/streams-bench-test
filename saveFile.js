const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "latencyKafka.csv");

// Create file with header if not exists
if (!fs.existsSync(filePath)) {
  fs.writeFileSync(
    filePath,
    "BucketSecond,WebsocketLatency,KafkaLatency\n"
  );
}

function appendRow(bucketSecond, websocketLatency, kafkaLatency) {
  const row = `${bucketSecond},${websocketLatency ?? ""},${kafkaLatency ?? ""}\n`;
  fs.appendFileSync(filePath, row);
}

module.exports = appendRow;
