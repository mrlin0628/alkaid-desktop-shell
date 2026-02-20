import { getDatabase, transaction } from './index.js';
import type { UserPreference } from '../types/index.js';

// Database operations for user preferences
export class PreferencesRepository {
  constructor() {
    // Lazy initialization in methods
  }

  private get db() {
    return getDatabase();
  }

  // Get all preferences for a user
  getUserPreferences(userId: string = 'default'): UserPreference[] {
    const stmt = this.db.prepare(`
      SELECT * FROM user_preferences 
      WHERE user_id = ? 
      ORDER BY preference_key ASC
    `);
    return stmt.all(userId).map(this.mapDbToPreference);
  }

  // Get specific preference by key
  getPreference(key: string, userId: string = 'default'): UserPreference | undefined {
    const stmt = this.db.prepare(`
      SELECT * FROM user_preferences 
      WHERE user_id = ? AND preference_key = ?
    `);
    const result = stmt.get(userId, key);
    return result ? this.mapDbToPreference(result) : undefined;
  }

  // Get preference value directly
  getPreferenceValue(key: string, userId: string = 'default'): string | undefined {
    const preference = this.getPreference(key, userId);
    return preference?.preferenceValue;
  }

  // Set or update a preference
  setPreference(key: string, value: string, userId: string = 'default'): UserPreference {
    return transaction(() => {
      const stmt = this.db.prepare(`
        INSERT INTO user_preferences (user_id, preference_key, preference_value)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, preference_key)
        DO UPDATE SET 
          preference_value = excluded.preference_value,
          updated_at = CURRENT_TIMESTAMP
      `);

      stmt.run(userId, key, value);
      return this.getPreference(key, userId)!;
    });
  }

  // Set multiple preferences at once
  setPreferences(preferences: { [key: string]: string }, userId: string = 'default'): UserPreference[] {
    return transaction(() => {
      const results: UserPreference[] = [];
      for (const [key, value] of Object.entries(preferences)) {
        results.push(this.setPreference(key, value, userId));
      }
      return results;
    });
  }

  // Delete a preference
  deletePreference(key: string, userId: string = 'default'): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM user_preferences 
      WHERE user_id = ? AND preference_key = ?
    `);
    const result = stmt.run(userId, key);
    return result.changes > 0;
  }

  // Delete all preferences for a user
  deleteUserPreferences(userId: string = 'default'): number {
    const stmt = this.db.prepare(`
      DELETE FROM user_preferences WHERE user_id = ?
    `);
    const result = stmt.run(userId);
    return result.changes;
  }

  // Get preferences as a simple key-value object
  getPreferencesAsObject(userId: string = 'default'): { [key: string]: string } {
    const preferences = this.getUserPreferences(userId);
    const result: { [key: string]: string } = {};
    for (const pref of preferences) {
      result[pref.preferenceKey] = pref.preferenceValue;
    }
    return result;
  }

  // Seed default preferences
  seedDefaultPreferences(userId: string = 'default'): void {
    const defaultPreferences: { [key: string]: string } = {
      'desktop.background.type': 'color',
      'desktop.background.color': '#0a0a0a',
      'desktop.background.opacity': '1.0',
      'desktop.theme': 'cyberpunk',
      'tools.launcher.columns': '4',
      'tools.launcher.showLabels': 'true',
      'window.defaultWidth': '800',
      'window.defaultHeight': '600'
    };

    transaction(() => {
      for (const [key, value] of Object.entries(defaultPreferences)) {
        try {
          // Only set if not already exists
          const existing = this.getPreference(key, userId);
          if (!existing) {
            this.setPreference(key, value, userId);
            console.log(`Seeded preference: ${key} = ${value}`);
          }
        } catch (error) {
          console.warn(`Failed to seed preference ${key}:`, error);
        }
      }
    });
  }

  // Helper methods
  private mapDbToPreference(row: any): UserPreference {
    return {
      id: row.id,
      userId: row.user_id,
      preferenceKey: row.preference_key,
      preferenceValue: row.preference_value,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

// Export singleton instance
export const preferencesRepository = new PreferencesRepository();