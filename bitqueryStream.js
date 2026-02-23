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
                DEXPools(
                  where: {Pool: {Market: {BaseCurrency: {MintAddress: {is: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN"}}}}, Transaction: {Result: {Success: true}}, Instruction: {Program: {Method: {includesCaseInsensitive: "swap"}}}}
                ) {
                  Block {
                    Time
                  }
                  Transaction {
                    Signature
                  }
                  Pool {
                    Market {
                      MarketAddress
                      BaseCurrency {
                        MintAddress
                        Symbol
                        Name
                        Decimals
                      }
                      QuoteCurrency {
                        MintAddress
                        Symbol
                        Name
                        Decimals
                      }
                    }
                    Dex {
                      ProgramAddress
                      ProtocolName
                      ProtocolFamily
                    }
                    Base {
                      ChangeAmount
                      ChangeAmountInUSD
                      PostAmount
                      PostAmountInUSD
                      Price
                      PriceInUSD
                    }
                    Quote {
                      ChangeAmount
                      ChangeAmountInUSD
                      PostAmount
                      PostAmountInUSD
                      Price
                      PriceInUSD
                    }
                  }
                  Instruction {
                    Program {
                      Method
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
      const token = response.payload.data.Solana.DEXPools[0].Transaction.Signature;

      onData({
        provider: "bitquery",
        token,
      });
    }
  });
}

module.exports = startBitqueryStream;
