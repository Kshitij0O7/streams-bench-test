const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "coverage.csv");

// Create file if not exists
if (!fs.existsSync(filePath)) {
  fs.writeFileSync(filePath, "TokenAddress,Birdeye,Bitquery\n");
}

function appendRow(tokenAddress, birdeye, bitquery) {
  const row = `${tokenAddress},${birdeye || ""},${bitquery || ""}\n`;
  fs.appendFileSync(filePath, row);
}

module.exports = appendRow;
