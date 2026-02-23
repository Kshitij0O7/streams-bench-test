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
              Solana {
                Transfers(
                  where: {Transfer: {Currency: {MintAddress: {is: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN"}}}}
                ) {
                  Transaction {
                    Signature
                  }
                }
              }
            }
          `
        }
      }));
    }

    if (response.type === "data") {
      const token = response.payload.data.Solana.Transfers[0].Transaction.Signature;

      onData({
        provider: "bitquery",
        token,
      });
    }
  });
}

module.exports = startBitqueryStream;
