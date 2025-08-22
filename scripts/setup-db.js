#!/usr/bin/env node

/**
 * Database setup script
 * Run with: npm run db:setup
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function setupDatabase() {
  try {
    console.log('🗄️  Setting up Alkaid database...');
    
    // Ensure data directory exists
    const dataDir = join(__dirname, '..', 'data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
      console.log('📁 Created data directory');
    }
    
    // Import and run seeding (dynamic import for ES modules)
    const { seedDatabase } = await import('../src/lib/db/seed.ts');
    await seedDatabase();
    
    console.log('✅ Database setup completed successfully!');
    console.log('🚀 You can now run "npm run dev" to start the application');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Run setup
setupDatabase();