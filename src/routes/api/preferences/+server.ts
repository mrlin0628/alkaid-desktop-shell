import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { preferencesRepository } from '$lib/db/preferences';

// GET /api/preferences - Get user desktop preferences
export const GET: RequestHandler = async ({ url }) => {
  try {
    const userId = url.searchParams.get('userId') || 'default';
    const format = url.searchParams.get('format') || 'array';
    const key = url.searchParams.get('key');
    
    if (key) {
      // Get single preference
      const preference = preferencesRepository.getPreference(key, userId);
      if (!preference) {
        return error(404, {
          message: `Preference "${key}" not found for user "${userId}"`
        });
      }
      return json({
        success: true,
        data: preference
      });
    }
    
    if (format === 'object') {
      // Return as key-value object
      const preferences = preferencesRepository.getPreferencesAsObject(userId);
      return json({
        success: true,
        data: preferences
      });
    } else {
      // Return as array of preference objects
      const preferences = preferencesRepository.getUserPreferences(userId);
      return json({
        success: true,
        data: preferences,
        count: preferences.length
      });
    }
  } catch (err) {
    console.error('Error fetching preferences:', err);
    return error(500, {
      message: 'Failed to fetch preferences',
      error: err instanceof Error ? err.message : 'Unknown error'
    });
  }
};

// PUT /api/preferences - Update user preferences
export const PUT: RequestHandler = async ({ request, url }) => {
  try {
    const userId = url.searchParams.get('userId') || 'default';
    const body = await request.json();
    
    if (body.key && body.value !== undefined) {
      // Single preference update
      const preference = preferencesRepository.setPreference(body.key, body.value, userId);
      return json({
        success: true,
        data: preference,
        message: 'Preference updated successfully'
      });
    } else if (body.preferences && typeof body.preferences === 'object') {
      // Multiple preferences update
      const preferences = preferencesRepository.setPreferences(body.preferences, userId);
      return json({
        success: true,
        data: preferences,
        count: preferences.length,
        message: 'Preferences updated successfully'
      });
    } else {
      return error(400, {
        message: 'Invalid request body. Expected { key, value } or { preferences: {...} }'
      });
    }
  } catch (err) {
    console.error('Error updating preferences:', err);
    return error(500, {
      message: 'Failed to update preferences',
      error: err instanceof Error ? err.message : 'Unknown error'
    });
  }
};

// DELETE /api/preferences - Delete user preferences
export const DELETE: RequestHandler = async ({ url }) => {
  try {
    const userId = url.searchParams.get('userId') || 'default';
    const key = url.searchParams.get('key');
    
    if (key) {
      // Delete single preference
      const success = preferencesRepository.deletePreference(key, userId);
      if (!success) {
        return error(404, {
          message: `Preference "${key}" not found for user "${userId}"`
        });
      }
      return json({
        success: true,
        message: 'Preference deleted successfully'
      });
    } else {
      // Delete all preferences for user
      const deletedCount = preferencesRepository.deleteUserPreferences(userId);
      return json({
        success: true,
        deletedCount,
        message: `Deleted ${deletedCount} preferences for user "${userId}"`
      });
    }
  } catch (err) {
    console.error('Error deleting preferences:', err);
    return error(500, {
      message: 'Failed to delete preferences',
      error: err instanceof Error ? err.message : 'Unknown error'
    });
  }
};