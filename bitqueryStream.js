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
              Pairs(
                where: {Interval: {Time: {Duration: {eq: 1}}}, Token: {Address: {is: "4nURS6qxY9bCEhramG2VZfnphJZyzis5EE86w5qLpump"}}, QuoteToken: {Address: {is: "So11111111111111111111111111111111111111112"}}}
              ) {
                Block {
                  Timestamp
                }
                Interval {
                  Time {
                    Start
                    Duration
                  }
                }
                Price {
                  Ohlc {
                    Open
                    High
                    Low
                    Close
                  }
                }
                Volume {
                  Usd
                }
              }
            }
          }
          `
        }
      }));
    }

    if (response.type === "data") {
      const receivedAt = Date.now();
      const startTime = response.payload.data.Trading.Pairs[0].Interval.Time.Start;
      const timestamp = new Date(startTime).getTime();

      const latency = receivedAt - timestamp;

      const bucketSecond = Math.floor(timestamp / 1000);

      onData({
        provider: "bitquery",
        bucketSecond,
        latency
      });
    }
  });
}

module.exports = startBitqueryStream;
