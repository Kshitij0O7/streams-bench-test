const { WebSocket } = require("ws");

function startBitqueryStream(onData) {

  const token = process.env.BITQUERY_TOKEN;
  const tokenAddress = process.env.TOKEN_ADDRESS;

  const bitqueryConnection = new WebSocket(
    `wss://streaming.bitquery.io/eap?token=${token}`,
    ["graphql-ws"]
  );

  bitqueryConnection.on("open", () => {
    bitqueryConnection.send(JSON.stringify({ type: "connection_init" }));
  });

  bitqueryConnection.on("message", (data) => {
    const response = JSON.parse(data);

    if (response.type === "connection_ack") {
      bitqueryConnection.send(JSON.stringify({
        type: "start",
        id: "1",
        payload: {
          query: `
          subscription {
            Trading {
              Tokens(
                where: {
                  Token: {
                    Network: {is: "Solana"},
                    Address: {is: "${tokenAddress}"}
                  },
                  Interval: {Time: {Duration: {eq: 60}}}
                }
              ) {
                Block { Timestamp }
              }
            }
          }
          `
        }
      }));
    }

    if (response.type === "data") {
      const receivedAt = Date.now();
      const timestamp =
        response.payload.data.Trading.Tokens[0].Block.Timestamp;

      const blockTime = Number(timestamp) / 1e6; // ns → ms
      const latency = receivedAt - blockTime;

      onData({
        provider: "bitquery",
        blockTime,
        latency
      });
    }
  });
}

module.exports = startBitqueryStream;
