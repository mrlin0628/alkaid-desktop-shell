import { writable } from 'svelte/store';
import type { BackgroundPreferences } from '../types';

const defaultPreferences: BackgroundPreferences = {
  type: 'color',
  source: '',
  color: '#0a0a0a',
  opacity: 1
};

// Check if we have a default video background
const DEFAULT_VIDEO_PATH = '/uploads/backgrounds/background.mp4';

// Load preferences from localStorage or check for default video
function loadPreferences(): BackgroundPreferences {
  if (typeof window === 'undefined') return defaultPreferences;

  try {
    const stored = localStorage.getItem('backgroundPreferences');
    if (stored) {
      const prefs = JSON.parse(stored);
      // If video type was saved, always use the default video path
      if (prefs.type === 'video') {
        prefs.source = DEFAULT_VIDEO_PATH;
      }
      return prefs;
    }

    // Check if we have uploaded a video before
    const hasUploadedVideo = localStorage.getItem('hasUploadedVideo') === 'true';
    if (hasUploadedVideo) {
      return {
        ...defaultPreferences,
        type: 'video',
        source: DEFAULT_VIDEO_PATH
      };
    }
  } catch (error) {
    console.error('Failed to load preferences:', error);
  }

  return defaultPreferences;
}

export const backgroundPreferences = writable<BackgroundPreferences>(loadPreferences());

// Subscribe to changes and save to localStorage
if (typeof window !== 'undefined') {
  backgroundPreferences.subscribe(value => {
    try {
      localStorage.setItem('backgroundPreferences', JSON.stringify(value));
      // Mark that we have uploaded a video if video type is selected
      if (value.type === 'video' && value.source) {
        localStorage.setItem('hasUploadedVideo', 'true');
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  });

  // Check if default video exists on client initialization
  fetch('/api/check-video')
    .then(res => res.json())
    .then(data => {
      if (data.exists) {
        const currentPrefs = localStorage.getItem('backgroundPreferences');
        if (currentPrefs) {
          const prefs = JSON.parse(currentPrefs);
          // If we previously had video selected but no source, update it
          if (prefs.type === 'video' && !prefs.source) {
            updateBackgroundPreference('source', DEFAULT_VIDEO_PATH);
          }
        } else {
          // If no preferences saved but video exists, default to video
          updateBackgroundPreference('type', 'video');
          updateBackgroundPreference('source', DEFAULT_VIDEO_PATH);
        }
      }
    })
    .catch(error => {
      console.error('Failed to check video existence:', error);
    });
}

export function updateBackgroundPreference<K extends keyof BackgroundPreferences>(
  key: K,
  value: BackgroundPreferences[K]
) {
  backgroundPreferences.update(prefs => ({
    ...prefs,
    [key]: value
  }));
}

export function resetToDefaults() {
  backgroundPreferences.set({ ...defaultPreferences });
}