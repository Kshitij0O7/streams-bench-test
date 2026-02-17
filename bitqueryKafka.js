const { Kafka } = require("kafkajs");
const { loadProto } = require("bitquery-protobuf-schema");
const { CompressionTypes, CompressionCodecs } = require("kafkajs");
const bs58 = require("bs58");
const LZ4 = require("kafkajs-lz4");
require("dotenv").config();

CompressionCodecs[CompressionTypes.LZ4] = new LZ4().codec;

const convertBytes = (buffer, encoding = "base58") => {
    if (encoding === "base58") {
      return bs58.default.encode(buffer);
    }
    return buffer.toString("hex");
};

const printProtobufMessage = (msg, indent = 0, encoding = "base58") => {
    const prefix = " ".repeat(indent);
    for (const [key, value] of Object.entries(msg)) {
      if (Array.isArray(value)) {
        console.log(`${prefix}${key} (repeated):`);
        value.forEach((item, idx) => {
          if (typeof item === "object" && item !== null) {
            console.log(`${prefix}  [${idx}]:`);
            printProtobufMessage(item, indent + 4, encoding);
          } else {
            console.log(`${prefix}  [${idx}]: ${item}`);
          }
        });
      } else if (value && typeof value === "object" && Buffer.isBuffer(value)) {
        console.log(`${prefix}${key}: ${convertBytes(value, encoding)}`);
      } else if (value && typeof value === "object") {
        console.log(`${prefix}${key}:`);
        printProtobufMessage(value, indent + 4, encoding);
      } else {
        console.log(`${prefix}${key}: ${value}`);
      }
    }
  };

function startKafkaStream(onData) {

  const username = process.env.KAFKA_USERNAME;
  const password = process.env.KAFKA_PASSWORD;
  const topic = "solana.transactions.proto";
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
          const buffer = message.value;
          const decoded = ParsedMessage.decode(buffer);
          const msgObj = ParsedMessage.toObject(decoded, {
            bytes: Buffer,
          });

          const transactions = msgObj.Transactions;
          if (!transactions || !Array.isArray(transactions)) return;

          for (const transaction of transactions) {
              
            const program = transaction?.ParsedIdlInstructions[0]?.Program;
            const methods = ["create", "create_v2", "set_creator"];
            const programAddress = convertBytes(program.Address)

            if (programAddress != "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P" || !methods.includes(program.Method)) continue;
              
            const accounts = transaction.ParsedIdlInstructions[0].Accounts;
            const token = accounts[0].Address;
            
            onData({
                  provider: "kafka",
                  token,
            });
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

// startKafkaStream();
module.exports = startKafkaStream;
