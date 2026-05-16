import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { config } from "./config.js";

const dbFilePath = path.resolve(config.dbPath);
fs.mkdirSync(path.dirname(dbFilePath), { recursive: true });

export const db = new Database(dbFilePath);

db.pragma("journal_mode = WAL");

function hasColumn(tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.some((column) => column.name === columnName);
}

function resetSchemaIfIncompatible() {
  const hasUsersTable = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'")
    .get();

  if (!hasUsersTable) {
    return;
  }

  const schemaCompatible =
    hasColumn("users", "username") &&
    hasColumn("users", "password_hash") &&
    hasColumn("assets", "location") &&
    hasColumn("tickets", "asset_id");

  if (!schemaCompatible) {
    db.exec(`
      DROP TABLE IF EXISTS tickets;
      DROP TABLE IF EXISTS assets;
      DROP TABLE IF EXISTS users;
    `);
  }
}

export function initDb() {
  resetSchemaIfIncompatible();
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'engineer', 'viewer')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('active', 'maintenance', 'retired')),
      location TEXT NOT NULL,
      owner_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(owner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      priority TEXT NOT NULL CHECK(priority IN ('low', 'medium', 'high', 'critical')),
      status TEXT NOT NULL CHECK(status IN ('open', 'in_progress', 'resolved', 'closed')),
      asset_id INTEGER NOT NULL,
      assignee_id INTEGER,
      created_by INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(asset_id) REFERENCES assets(id),
      FOREIGN KEY(assignee_id) REFERENCES users(id),
      FOREIGN KEY(created_by) REFERENCES users(id)
    );
  `);
}

export function seedDb() {
  const usersCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
  if (usersCount > 0) {
    return;
  }

  const insertUser = db.prepare(`
    INSERT INTO users (username, full_name, password_hash, role)
    VALUES (@username, @full_name, @password_hash, @role)
  `);

  const adminHash = bcrypt.hashSync("Admin123!", 10);
  const engineerHash = bcrypt.hashSync("Engineer123!", 10);
  const viewerHash = bcrypt.hashSync("Viewer123!", 10);

  const transaction = db.transaction(() => {
    const adminId = insertUser.run({
      username: "admin",
      full_name: "System Administrator",
      password_hash: adminHash,
      role: "admin"
    }).lastInsertRowid;

    const engineerId = insertUser.run({
      username: "engineer",
      full_name: "Infrastructure Engineer",
      password_hash: engineerHash,
      role: "engineer"
    }).lastInsertRowid;

    const viewerId = insertUser.run({
      username: "viewer",
      full_name: "Read Only User",
      password_hash: viewerHash,
      role: "viewer"
    }).lastInsertRowid;

    const insertAsset = db.prepare(`
      INSERT INTO assets (name, type, status, location, owner_id)
      VALUES (?, ?, ?, ?, ?)
    `);

    const routerId = insertAsset.run("Core Router R1", "network", "active", "DC-01", adminId).lastInsertRowid;
    const vmHostId = insertAsset.run("VM Host H-12", "server", "maintenance", "DC-02", engineerId).lastInsertRowid;
    insertAsset.run("Laptop LT-77", "workstation", "active", "HQ-3F", viewerId);

    const insertTicket = db.prepare(`
      INSERT INTO tickets (title, description, priority, status, asset_id, assignee_id, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertTicket.run(
      "Packet loss on main channel",
      "Loss above 5% during peak hours",
      "high",
      "in_progress",
      routerId,
      engineerId,
      adminId
    );
    insertTicket.run(
      "Hypervisor update",
      "Upgrade host to latest security patch",
      "medium",
      "open",
      vmHostId,
      engineerId,
      adminId
    );
  });

  transaction();
}
