import { toolsRepository } from '../src/lib/db/tools.js';

console.log("Cleaning up database...");
try {
    const deleted = toolsRepository.deleteTool('file-manager');
    if (deleted) {
        console.log("Successfully removed 'file-manager' from database.");
    } else {
        console.log("'file-manager' not found or already removed.");
    }
} catch (e) {
    console.error("Error cleaning DB:", e);
}
