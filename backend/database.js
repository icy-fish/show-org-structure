const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

let db;

async function getDb() {
  if (db) return db;
  db = await open({
    filename: process.env.DB_PATH || path.join(__dirname, 'org_structure.db'),
    driver: sqlite3.Database,
  });
  await db.exec('PRAGMA foreign_keys = ON');
  await db.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      org_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      parent_dept_id INTEGER,
      owner_id INTEGER,
      pos_x REAL DEFAULT 0,
      pos_y REAL DEFAULT 0,
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS persons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      org_id INTEGER NOT NULL,
      dept_id INTEGER,
      name TEXT NOT NULL,
      title TEXT,
      email TEXT,
      pos_x REAL DEFAULT 0,
      pos_y REAL DEFAULT 0,
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS department_relations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_dept_id INTEGER NOT NULL,
      to_dept_id INTEGER NOT NULL,
      label TEXT,
      relation_type TEXT DEFAULT 'custom',
      FOREIGN KEY (from_dept_id) REFERENCES departments(id) ON DELETE CASCADE,
      FOREIGN KEY (to_dept_id) REFERENCES departments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS person_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL,
      reports_to_id INTEGER NOT NULL,
      FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE,
      FOREIGN KEY (reports_to_id) REFERENCES persons(id) ON DELETE CASCADE
    );
  `);
  // Migrate: add description column to persons if it doesn't exist yet
  try { await db.exec('ALTER TABLE persons ADD COLUMN description TEXT'); } catch (_) {}
  return db;
}

module.exports = { getDb };
