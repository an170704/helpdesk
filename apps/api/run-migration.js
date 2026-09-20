require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const pool = require('./src/config/db');

async function run() {
  const file = process.argv[2];
  if (!file) {
    throw new Error('Missing migration file path');
  }

  const sql = fs.readFileSync(path.resolve(file), 'utf8');
  await pool.query(sql);
  console.log('migration OK: ' + file);
  await pool.end();
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
