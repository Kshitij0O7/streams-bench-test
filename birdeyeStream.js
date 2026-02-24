const WebSocketClient = require('websocket').client;

function startBirdeyeStream(onData) {
  const client = new WebSocketClient();

  const apiKey = process.env.BIRDEYE_API_KEY;
  const chain = process.env.CHAIN;

  client.on('connect', function (connection) {

    connection.on('message', function (message) {
      if (message.type === 'utf8') {
        const data = JSON.parse(message.utf8Data);

        try {
          const message = data.data;
          const startTime = new Date(message.unixTime * 1000).toISOString();
          const open = message.o;
          const high = message.h;
          const low = message.l;
          const close = message.c;

          onData({
            provider: "birdeye",
            startTime,
            open,
            high,
            low,
            close
          })
        } catch (error) {
          console.error(error);
        }
      }
    });

    const msg = {
      "type": "SUBSCRIBE_PRICE",
      "data": {
          "queryType": "simple",
          "chartType": "1s",
          "address": "DMYNp65mub3i7LRpBdB66CgBAceLcQnv4gsWeCi6pump",
          "currency": "usd"
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
