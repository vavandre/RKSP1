import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { config } from "./config.js";

function resolvePoolConfig() {
  const ssl = config.dbSsl ? { rejectUnauthorized: false } : false;
  if (config.databaseUrl) {
    return {
      connectionString: config.databaseUrl,
      ssl
    };
  }

  return {
    host: config.dbHost,
    port: config.dbPort,
    database: config.dbName,
    user: config.dbUser,
    password: config.dbPassword,
    ssl
  };
}

const pool = new Pool(resolvePoolConfig());

export async function query(text, params = []) {
  const result = await pool.query(text, params);
  return result;
}

export async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'engineer', 'viewer')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS assets (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('active', 'maintenance', 'retired')),
      location TEXT NOT NULL,
      owner_id INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY(owner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      priority TEXT NOT NULL CHECK(priority IN ('low', 'medium', 'high', 'critical')),
      status TEXT NOT NULL CHECK(status IN ('open', 'in_progress', 'resolved', 'closed')),
      asset_id INTEGER NOT NULL,
      assignee_id INTEGER,
      created_by INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY(asset_id) REFERENCES assets(id),
      FOREIGN KEY(assignee_id) REFERENCES users(id),
      FOREIGN KEY(created_by) REFERENCES users(id)
    );
  `);
}

export async function seedDb() {
  const usersCountResult = await query("SELECT COUNT(*)::int AS count FROM users");
  const usersCount = usersCountResult.rows[0]?.count ?? 0;
  if (usersCount > 0) {
    return;
  }

  const adminHash = bcrypt.hashSync("Admin123!", 10);
  const engineerHash = bcrypt.hashSync("Engineer123!", 10);
  const viewerHash = bcrypt.hashSync("Viewer123!", 10);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const adminResult = await client.query(
      `INSERT INTO users (username, full_name, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ["admin", "System Administrator", adminHash, "admin"]
    );
    const adminId = adminResult.rows[0].id;

    const engineerResult = await client.query(
      `INSERT INTO users (username, full_name, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ["engineer", "Infrastructure Engineer", engineerHash, "engineer"]
    );
    const engineerId = engineerResult.rows[0].id;

    const viewerResult = await client.query(
      `INSERT INTO users (username, full_name, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ["viewer", "Read Only User", viewerHash, "viewer"]
    );
    const viewerId = viewerResult.rows[0].id;

    const routerResult = await client.query(
      `INSERT INTO assets (name, type, status, location, owner_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ["Core Router R1", "network", "active", "DC-01", adminId]
    );
    const routerId = routerResult.rows[0].id;

    const vmHostResult = await client.query(
      `INSERT INTO assets (name, type, status, location, owner_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ["VM Host H-12", "server", "maintenance", "DC-02", engineerId]
    );
    const vmHostId = vmHostResult.rows[0].id;

    await client.query(
      `INSERT INTO assets (name, type, status, location, owner_id)
       VALUES ($1, $2, $3, $4, $5)`,
      ["Laptop LT-77", "workstation", "active", "HQ-3F", viewerId]
    );

    await client.query(
      `INSERT INTO tickets (title, description, priority, status, asset_id, assignee_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        "Packet loss on main channel",
        "Loss above 5% during peak hours",
        "high",
        "in_progress",
        routerId,
        engineerId,
        adminId
      ]
    );

    await client.query(
      `INSERT INTO tickets (title, description, priority, status, asset_id, assignee_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        "Hypervisor update",
        "Upgrade host to latest security patch",
        "medium",
        "open",
        vmHostId,
        engineerId,
        adminId
      ]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
