const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'alkaid.db');
console.log(`Opening DB: ${dbPath}`);
const db = new Database(dbPath);

const info = db.prepare("DELETE FROM tools WHERE id = ?").run('file-manager');
console.log(`Deleted ${info.changes} rows for 'file-manager'.`);
