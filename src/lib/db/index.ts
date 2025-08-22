import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Database instance
let db: Database.Database | null = null;

// Get current directory for schema file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function initializeDatabase(dbPath?: string): Database.Database {
  if (db) {
    return db;
  }

  // Use provided path or default to data/alkaid.db
  const databasePath = dbPath || 'data/alkaid.db';
  
  try {
    db = new Database(databasePath);
    
    // Enable WAL mode for better concurrent access
    db.pragma('journal_mode = WAL');
    
    // Read and execute schema
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
    
    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// Utility function for transactions
export function transaction<T>(callback: () => T): T {
  const database = getDatabase();
  return database.transaction(callback)();
}

// Initialize database on module load for server environments
if (typeof window === 'undefined') {
  try {
    initializeDatabase();
  } catch (error) {
    console.warn('Could not initialize database during module load:', error);
  }
}