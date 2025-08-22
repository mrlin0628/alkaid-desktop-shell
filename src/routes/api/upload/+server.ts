import { json } from '@sveltejs/kit';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import type { RequestHandler } from './$types';

const UPLOAD_DIR = 'static/uploads/backgrounds';
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.formData();
    const file = data.get('video') as File;

    if (!file) {
      return json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return json(
        { success: false, error: 'Invalid file type. Only MP4, WebM, and OGG videos are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return json(
        { success: false, error: 'File too large. Maximum size is 100MB.' },
        { status: 400 }
      );
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Always use the same filename to overwrite previous video
    const filename = 'background.mp4';
    const filepath = path.join(UPLOAD_DIR, filename);

    // Write file to disk (overwrites if exists)
    const buffer = await file.arrayBuffer();
    await writeFile(filepath, new Uint8Array(buffer));

    // Return public URL with timestamp to bypass cache
    const publicUrl = `/uploads/backgrounds/${filename}?t=${Date.now()}`;

    return json({
      success: true,
      url: publicUrl,
      filename,
      size: file.size,
      type: file.type
    });

  } catch (error) {
    console.error('Upload error:', error);
    return json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    );
  }
};