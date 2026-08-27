import pg from "pg";

const { Pool } = pg;

let pool = null;

function isEnabled() {
  return pool != null;
}

export async function initDb() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error("Нет DATABASE_URL в .env — бот без Postgres");
    return;
  }

  const next = new Pool({ connectionString: url });
  try {
    await next.query("SELECT 1");
    await next.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id BIGINT PRIMARY KEY,
        username TEXT,
        first_name TEXT,
        last_name TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await next.query(`
      CREATE TABLE IF NOT EXISTS updates (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    pool = next;
    console.log("Postgres: таблицы users и updates готовы");
  } catch (err) {
    console.error("Postgres при старте:", err.message);
    pool = null;
    try {
      await next.end();
    } catch {
      /* ignore */
    }
  }
}

export async function insertUpdate(userId, update) {
  if (!isEnabled()) return;
  try {
    await pool.query(
      "INSERT INTO updates (user_id, data) VALUES ($1, $2::jsonb)",
      [userId ?? null, JSON.stringify(update)]
    );
  } catch (err) {
    console.error("Postgres INSERT updates:", err.message);
  }
}

export async function upsertUser(from) {
  if (!isEnabled() || from?.id == null) return;
  try {
    await pool.query(
      `INSERT INTO users (user_id, username, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET
         username = EXCLUDED.username,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name`,
      [
        from.id,
        from.username ?? null,
        from.first_name ?? null,
        from.last_name ?? null,
      ]
    );
  } catch (err) {
    console.error("Postgres UPSERT users:", err.message);
  }
}
