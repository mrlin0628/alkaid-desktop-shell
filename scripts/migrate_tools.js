
import Database from 'better-sqlite3';

const dbPath = 'data/alkaid.db';
console.log(`Migrating database at ${dbPath}...`);

try {
    const db = new Database(dbPath);

    // 1. Add columns if they don't exist
    try {
        db.prepare('ALTER TABLE tools ADD COLUMN default_width INTEGER DEFAULT 400').run();
        console.log('Added default_width column');
    } catch (e) {
        if (!e.message.includes('duplicate column')) console.log('default_width column already exists or error:', e.message);
    }

    try {
        db.prepare('ALTER TABLE tools ADD COLUMN default_height INTEGER DEFAULT 300').run();
        console.log('Added default_height column');
    } catch (e) {
        if (!e.message.includes('duplicate column')) console.log('default_height column already exists or error:', e.message);
    }

    // 2. Update Audio Converter size
    const updateStmt = db.prepare("UPDATE tools SET default_width = ?, default_height = ? WHERE id = ?");
    const result = updateStmt.run(800, 600, 'audio-converter');
    console.log(`Updated Audio Converter size: ${result.changes} changes`);

    // 3. Ensure Audio Result Viewer exists (upsert logic roughly)
    // Since 'seedDefaultTools' only runs on empty DB or ignores existing, we might need to insert it manually here if we want immediate effect without reset
    const checkStmt = db.prepare("SELECT id FROM tools WHERE id = ?");
    if (!checkStmt.get('audio-result-viewer')) {
        const insertStmt = db.prepare(`
        INSERT INTO tools (
          id, name, icon, description, type, source, category, 
          default_width, default_height, sort_order, is_active, hidden
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

        insertStmt.run(
            'audio-result-viewer',
            'Audio Result Viewer',
            'file-text',
            'View audio transcription results',
            'component',
            '/src/tools/AudioResultViewer.svelte',
            'utilities',
            800,
            600,
            99,
            1,
            1
        );
        console.log('Inserted Audio Result Viewer tool');
    } else {
        console.log('Audio Result Viewer tool already exists');
        // Update it just in case
        db.prepare("UPDATE tools SET default_width = 800, default_height = 600 WHERE id = 'audio-result-viewer'").run();
    }

    console.log('Migration completed successfully.');

} catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
}
