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
                TokenSupplyUpdates(
                  where: {Instruction: {Program: {Address: {is: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"}, Method: {in: ["create","create_v2"]}}}}
                ) {
                  Block{
                    Time
                  }
                  TokenSupplyUpdate {
                    Currency {
                      Symbol
                      Name
                      MintAddress
                      Decimals
                    }
                    PostBalance
                  }
                }
              }
            }
          `
        }
      }));
    }

    if (response.type === "data") {
      const token = response.payload.data.Solana.TokenSupplyUpdates[0].TokenSupplyUpdate.Currency.MintAddress;

      onData({
        provider: "bitquery",
        token,
      });
    }
  });
}

module.exports = startBitqueryStream;
