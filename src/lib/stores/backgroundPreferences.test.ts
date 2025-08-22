import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { backgroundPreferences, updateBackgroundPreference, resetToDefaults } from './backgroundPreferences';

describe('Background Preferences Store', () => {
  beforeEach(() => {
    resetToDefaults();
  });

  it('initializes with default preferences', () => {
    const prefs = get(backgroundPreferences);
    
    expect(prefs.type).toBe('color');
    expect(prefs.source).toBe('');
    expect(prefs.color).toBe('#0a0a0a');
    expect(prefs.opacity).toBe(1);
  });

  it('updates background type preference', () => {
    updateBackgroundPreference('type', 'video');
    
    const prefs = get(backgroundPreferences);
    expect(prefs.type).toBe('video');
  });

  it('updates background source preference', () => {
    const videoSource = '/uploads/background.mp4';
    updateBackgroundPreference('source', videoSource);
    
    const prefs = get(backgroundPreferences);
    expect(prefs.source).toBe(videoSource);
  });

  it('updates background color preference', () => {
    const newColor = '#ff0000';
    updateBackgroundPreference('color', newColor);
    
    const prefs = get(backgroundPreferences);
    expect(prefs.color).toBe(newColor);
  });

  it('updates opacity preference', () => {
    updateBackgroundPreference('opacity', 0.8);
    
    const prefs = get(backgroundPreferences);
    expect(prefs.opacity).toBe(0.8);
  });

  it('maintains other preferences when updating single preference', () => {
    updateBackgroundPreference('type', 'video');
    updateBackgroundPreference('source', '/test.mp4');
    
    const prefs = get(backgroundPreferences);
    expect(prefs.type).toBe('video');
    expect(prefs.source).toBe('/test.mp4');
    expect(prefs.color).toBe('#0a0a0a'); // Should remain default
    expect(prefs.opacity).toBe(1); // Should remain default
  });

  it('resets all preferences to defaults', () => {
    // Modify preferences
    updateBackgroundPreference('type', 'video');
    updateBackgroundPreference('source', '/test.mp4');
    updateBackgroundPreference('color', '#ff0000');
    updateBackgroundPreference('opacity', 0.5);
    
    // Reset
    resetToDefaults();
    
    const prefs = get(backgroundPreferences);
    expect(prefs.type).toBe('color');
    expect(prefs.source).toBe('');
    expect(prefs.color).toBe('#0a0a0a');
    expect(prefs.opacity).toBe(1);
  });
});