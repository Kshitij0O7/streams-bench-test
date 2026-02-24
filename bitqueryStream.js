const { WebSocket } = require("ws");

function startBitqueryStream(onData) {

  const token = process.env.BITQUERY_TOKEN;

  const bitqueryConnection = new WebSocket(
    `wss://streaming.bitquery.io/graphql?token=${token}`,
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
                    Interval: {Time: {Duration: {eq: 1}}},
                    Token: {Address: {is: "DMYNp65mub3i7LRpBdB66CgBAceLcQnv4gsWeCi6pump"}}}
                ) {
                  Token {
                    Address
                    Symbol
                  }
                  Interval {
                    Time {
                      Start
                    }
                  }
                  Volume {
                    Usd
                  }
                  Price {
                    Ohlc {
                      Close
                      High
                      Low
                      Open
                    }
                  }
                }
              }
            }
          `
        }
      }));
    }

    if (response.type === "data") {
      const message = response.payload.data.Trading.Tokens[0];
      
      try {
        const startTime = message.Interval.Time.Start;
        const open = message.Price.Ohlc.Open;
        const high = message.Price.Ohlc.High;
        const low = message.Price.Ohlc.Low;
        const close = message.Price.Ohlc.Close;

        // console.log({
        //   provider: "bitquery",
        //   startTime,
        //   open,
        //   high,
        //   low,
        //   close
        // });
        onData({
          provider: "bitquery",
          startTime,
          open,
          high,
          low,
          close
        });
      } catch (error) {
        console.error(error);
      }
    }
  });
}
// startBitqueryStream();
module.exports = startBitqueryStream;
