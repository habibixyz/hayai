const { Pool } = require("pg");
let pool = null;

function getPool() {
  if (!pool && process.env.DATABASE_URL) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
    pool.on("error", (e) => console.error("[DB]", e.message));
  }
  return pool;
}

async function query(sql, params) {
  const p = getPool();
  if (!p) return null;
  try { return await p.query(sql, params); }
  catch (e) { console.error("[DB query]", e.message); return null; }
}

module.exports = { getPool, query };
