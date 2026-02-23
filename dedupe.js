const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'coverage1.csv');

function normalizeBool(value) {
  return value && value.trim().toLowerCase() === 'true';
}

function main() {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.trim().split('\n');

  if (lines.length === 0) {
    console.log('File is empty.');
    return;
  }

  const header = lines[0];
  const rows = lines.slice(1);

  const map = new Map();

  for (const line of rows) {
    if (!line.trim()) continue;

    const parts = line.split(',');
    const token = parts[0];
    const birdeyeRaw = parts[1] || '';
    const bitqueryRaw = parts[2] || '';

    const birdeye = normalizeBool(birdeyeRaw);
    const bitquery = normalizeBool(bitqueryRaw);

    if (!map.has(token)) {
      map.set(token, {
        Birdeye: birdeye,
        Bitquery: bitquery,
      });
    } else {
      const existing = map.get(token);
      existing.Birdeye = existing.Birdeye || birdeye;
      existing.Bitquery = existing.Bitquery || bitquery;
    }
  }

  let missingBirdeye = 0;
  let missingBitquery = 0;

  const outputLines = [header];

  for (const [token, values] of map.entries()) {
    const birdeyeStr = values.Birdeye ? 'true' : '';
    const bitqueryStr = values.Bitquery ? 'true' : '';

    if (!values.Birdeye) missingBirdeye++;
    if (!values.Bitquery) missingBitquery++;

    outputLines.push(`${token},${birdeyeStr},${bitqueryStr}`);
  }

  // 🔥 Overwrite original file
  fs.writeFileSync(filePath, outputLines.join('\n'), 'utf8');

  console.log('✅ Deduplication complete (file overwritten)');
  console.log(`Total unique tokens: ${map.size}`);
  console.log(`Missing Birdeye: ${missingBirdeye}`);
  console.log(`Missing Bitquery: ${missingBitquery}`);
}

main();
