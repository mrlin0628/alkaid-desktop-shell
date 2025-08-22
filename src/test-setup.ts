import { expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { vi } from 'vitest';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Mock HTMLMediaElement methods
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  writable: true,
  value: vi.fn().mockImplementation(() => Promise.resolve())
});

Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  writable: true,
  value: vi.fn()
});

Object.defineProperty(HTMLMediaElement.prototype, 'load', {
  writable: true,
  value: vi.fn()
});

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn(cb => setTimeout(cb, 16));
global.cancelAnimationFrame = vi.fn();

// Mock globalThis for window dimensions
Object.defineProperty(globalThis, 'innerWidth', { value: 1920, writable: true });
Object.defineProperty(globalThis, 'innerHeight', { value: 1080, writable: true });

// Mock fetch for API calls
global.fetch = vi.fn().mockImplementation((url) => {
  if (url === '/api/check-video') {
    return Promise.resolve({
      json: () => Promise.resolve({ exists: false }),
      ok: true,
      status: 200,
    });
  }
  return Promise.resolve({
    json: () => Promise.resolve({}),
    ok: true,
    status: 200,
  });
});