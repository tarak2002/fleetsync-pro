const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const client = new Client({
    connectionString: "postgresql://postgres.kmkrexwiiaklyovxapcb:qazmkp0192@db.kmkrexwiiaklyovxapcb.supabase.co:5432/postgres",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to DB');
    const sql = fs.readFileSync('../scratch/migration.sql', 'utf8');
    console.log('Executing SQL...');
    await client.query(sql);
    console.log('Migration successful!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
