const { Kafka } = require("kafkajs");
const { loadProto } = require("bitquery-protobuf-schema");
const { CompressionTypes, CompressionCodecs } = require("kafkajs");
const LZ4 = require("kafkajs-lz4");
require("dotenv").config();

CompressionCodecs[CompressionTypes.LZ4] = new LZ4().codec;

function startKafkaStream(onData) {

  const username = process.env.KAFKA_USERNAME;
  const password = process.env.KAFKA_PASSWORD;
  const topic = "trading.prices";
  const groupId = `${username}-${Date.now()}`;

  const kafka = new Kafka({
    clientId: username,
    brokers: [
      "rpk0.bitquery.io:9092",
      "rpk1.bitquery.io:9092",
      "rpk2.bitquery.io:9092",
    ],
    sasl: {
      mechanism: "scram-sha-512",
      username,
      password,
    },
  });

  const consumer = kafka.consumer({ groupId });

  const run = async () => {

    const ParsedMessage = await loadProto(topic);

    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: false });

    await consumer.run({
      autoCommit: false,
      eachMessage: async ({ message }) => {
        try {

          const receivedAt = Date.now();

          const buffer = message.value;
          const decoded = ParsedMessage.decode(buffer);
          const msgObj = ParsedMessage.toObject(decoded, {
            bytes: Buffer,
          });

          const tokenUpdates = msgObj.TokenUpdates;
          if (!tokenUpdates || !Array.isArray(tokenUpdates)) return;

          for (const tokenUpdate of tokenUpdates) {

            const token = tokenUpdate?.Token?.Address;
            if (token !== process.env.TOKEN_ADDRESS) continue;

            const interval =
              tokenUpdate?.PriceUpdate?.PriceByTimeIntervals?.[0];

            if (!interval?.TimeInterval?.Start) continue;

            // Start is in seconds → convert to ms
            const startTimeMs = interval.TimeInterval.Start * 1000;

            const latency = receivedAt - startTimeMs;

            const bucketSecond = Math.floor(startTimeMs / 1000);

            onData({
              provider: "kafka",
              bucketSecond,
              latency,
            });

            // Only first interval per message needed
            break;
          }

        } catch (err) {
          console.error("Kafka decode error:", err);
        }
      },
    });
  };

  run().catch(console.error);

  return async () => {
    try {
      await consumer.disconnect();
    } catch (e) {}
  };
}

module.exports = startKafkaStream;
