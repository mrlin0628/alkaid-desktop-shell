import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'data', 'alkaid.db');
const db = new Database(dbPath);

const toolsToRemove = [
    'calculator',
    'text-editor',
    'system-monitor',
    'notepad',
    'web-browser'
];

console.log('Cleaning up tools...');

const deleteStmt = db.prepare('DELETE FROM tools WHERE id = ?');

toolsToRemove.forEach(id => {
    const info = deleteStmt.run(id);
    if (info.changes > 0) {
        console.log(`Deleted tool: ${id}`);
    } else {
        console.log(`Tool not found or already deleted: ${id}`);
    }
});

console.log('Cleanup complete.');
