import { initializeDatabase } from './index';
import { toolsRepository } from './tools';
import { preferencesRepository } from './preferences';

/**
 * Seed the database with default data
 */
export async function seedDatabase() {
  console.log('Starting database seeding...');

  try {
    // Initialize database
    initializeDatabase();

    // Seed default tools
    await seedDefaultTools();

    // Seed default preferences
    await seedDefaultPreferences();

    console.log('Database seeding completed successfully');
  } catch (error) {
    console.error('Database seeding failed:', error);
    throw error;
  }
}

/**
 * Seed default tools
 */
async function seedDefaultTools() {
  console.log('Seeding default tools...');

  toolsRepository.seedDefaultTools();

  // Additional tools for demo
  const additionalTools: import('../types').Tool[] = [];

  for (const tool of additionalTools) {
    try {
      toolsRepository.createTool(tool);
      console.log(`Seeded additional tool: ${tool.name}`);
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        console.warn(`Failed to seed tool ${tool.name}:`, error);
      }
    }
  }
}

/**
 * Seed default preferences
 */
async function seedDefaultPreferences() {
  console.log('Seeding default preferences...');

  preferencesRepository.seedDefaultPreferences();

  // Additional preferences for tool launcher
  const additionalPreferences = {
    'toolLauncher.gridColumns': '4',
    'toolLauncher.showLabels': 'true',
    'toolLauncher.showCategories': 'true',
    'taskbar.autoHide': 'false',
    'taskbar.position': 'bottom',
    'window.snapToGrid': 'false',
    'window.minimumWidth': '400',
    'window.minimumHeight': '300'
  };

  try {
    preferencesRepository.setPreferences(additionalPreferences);
    console.log('Seeded additional preferences');
  } catch (error) {
    console.warn('Failed to seed additional preferences:', error);
  }
}

/**
 * Reset database (for development/testing)
 */
export async function resetDatabase() {
  console.log('Resetting database...');

  try {
    const db = initializeDatabase();

    // Clear existing data
    db.exec('DELETE FROM tools');
    db.exec('DELETE FROM user_preferences');

    console.log('Database reset completed');

    // Re-seed with defaults
    await seedDatabase();
  } catch (error) {
    console.error('Database reset failed:', error);
    throw error;
  }
}

// Auto-seed on first run if tables are empty
export async function autoSeedIfEmpty() {
  try {
    const tools = toolsRepository.getAllTools();

    if (tools.length === 0) {
      console.log('Database appears empty, auto-seeding...');
      await seedDatabase();
    }
  } catch (error) {
    console.warn('Auto-seed check failed:', error);
  }
}