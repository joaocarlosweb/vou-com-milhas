const { neon } = require('@neondatabase/serverless');

let sql = null;
function getSql() {
  if (sql) return sql;
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED;
  if (!url) return null;
  sql = neon(url);
  return sql;
}

async function ensureTables() {
  const s = getSql();
  if (!s) return false;
  try {
    await s`CREATE TABLE IF NOT EXISTS kv_store (k TEXT PRIMARY KEY, v JSONB, updated_at TIMESTAMPTZ DEFAULT NOW())`;
    return true;
  } catch (e) {
    console.warn('ensureTables failed', e.message);
    return false;
  }
}

async function kvGet(key) {
  const s = getSql();
  if (!s) return null;
  try {
    await ensureTables();
    const rows = await s`SELECT v FROM kv_store WHERE k = ${key} LIMIT 1`;
    if (rows.length) return rows[0].v;
  } catch (e) {
    console.warn('kvGet failed', key, e.message);
  }
  return null;
}

async function kvSet(key, value) {
  const s = getSql();
  if (!s) return false;
  try {
    await ensureTables();
    await s`INSERT INTO kv_store (k, v, updated_at) VALUES (${key}, ${JSON.stringify(value)}::jsonb, NOW()) ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v, updated_at = NOW()`;
    return true;
  } catch (e) {
    console.warn('kvSet failed', key, e.message);
    return false;
  }
}

module.exports = { getSql, kvGet, kvSet, ensureTables };
