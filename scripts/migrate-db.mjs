/**
 * Idempotent DB migration script — runs on cPanel startup before server.js.
 * Adds any columns that exist in the Prisma schema but may be missing from
 * the physical DB (happens when schema changes aren't followed by prisma db push).
 *
 * Safe to run multiple times — all statements use IF NOT EXISTS / DO NOTHING.
 */
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
});

async function run() {
  const client = await pool.connect();
  try {
    // VirtualWithdrawal.fee — added when withdrawal-fee fix was introduced
    await client.query(`
      ALTER TABLE "VirtualWithdrawal"
        ADD COLUMN IF NOT EXISTS fee DOUBLE PRECISION NOT NULL DEFAULT 0;
    `);

    // AppSettings.treasuryWallet — added for admin-configurable treasury wallet
    await client.query(`
      ALTER TABLE "AppSettings"
        ADD COLUMN IF NOT EXISTS "treasuryWallet" TEXT NOT NULL DEFAULT '';
    `);

    console.log('[migrate] schema up to date');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('[migrate] FAILED:', err.message);
  process.exit(1);
});
