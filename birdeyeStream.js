const WebSocketClient = require('websocket').client;

function startBirdeyeStream(onData) {
  const client = new WebSocketClient();

  const apiKey = process.env.BIRDEYE_API_KEY;
  const tokenAddress = process.env.TOKEN_ADDRESS;
  const chain = process.env.CHAIN;

  client.on('connect', function (connection) {

    connection.on('message', function (message) {
      if (message.type === 'utf8') {
        const receivedAt = Date.now();
        const data = JSON.parse(message.utf8Data);

        if (data?.data?.unixTime) {
          const blockTime = data.data.unixTime * 1000;
          const latency = receivedAt - blockTime;

          const bucketSecond = blockTime/1000;

          onData({
            provider: "birdeye",
            bucketSecond,
            latency
          });
        }
      }
    });

    const msg = {
      "type": "SUBSCRIBE_PRICE",
      "data": {
          "queryType": "simple",
          "chartType": "1s",
          "address": "7qbRF6YsyGuLUVs6Y1q64bdVrfe4ZcUUz1JRdoVNUJnm",
          "currency": "pair"
      }
    };

    connection.send(JSON.stringify(msg));
  });

  client.connect(
    `wss://public-api.birdeye.so/socket/${chain}?x-api-key=${apiKey}`,
    'echo-protocol',
    "https://birdeye.so"
  );
}

module.exports = startBirdeyeStream;
