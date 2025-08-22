import { json } from '@sveltejs/kit';
import { existsSync } from 'fs';
import path from 'path';
import type { RequestHandler } from './$types';

const DEFAULT_VIDEO_PATH = 'static/uploads/backgrounds/background.mp4';

export const GET: RequestHandler = async () => {
  try {
    const exists = existsSync(DEFAULT_VIDEO_PATH);
    
    return json({
      exists,
      path: exists ? '/uploads/backgrounds/background.mp4' : null
    });
  } catch (error) {
    console.error('Error checking video:', error);
    return json({
      exists: false,
      path: null
    });
  }
};