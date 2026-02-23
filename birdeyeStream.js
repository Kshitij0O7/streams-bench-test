const WebSocketClient = require('websocket').client;

function startBirdeyeStream(onData) {
  const client = new WebSocketClient();

  const apiKey = process.env.BIRDEYE_API_KEY;
  const chain = process.env.CHAIN;

  client.on('connect', function (connection) {

    connection.on('message', function (message) {
      if (message.type === 'utf8') {
        const data = JSON.parse(message.utf8Data);

        if (data?.data?.txHash) {
          const token = data.data.txHash;

          onData({
            provider: "birdeye",
            token,
          });
        }
      }
    });

    const msg = {
      "type": "SUBSCRIBE_TXS",
      "data": {
          "queryType": "simple",
          "address": "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
          "txsType": "swap"
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
