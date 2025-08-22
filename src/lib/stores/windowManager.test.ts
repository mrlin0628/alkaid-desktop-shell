import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { 
  windows, 
  createWindow, 
  closeWindow, 
  minimizeWindow,
  maximizeWindow,
  focusWindow,
  updateWindowPosition,
  updateWindowSize,
  getNextZIndex,
  resetZIndex
} from './windowManager';
import type { WindowState } from '../types';

describe('Window Manager Store', () => {
  beforeEach(() => {
    // Reset windows store
    windows.set([]);
    // Reset zIndex counter for consistent testing
    resetZIndex();
  });

  it('initializes with empty windows array', () => {
    const windowList = get(windows);
    expect(windowList).toEqual([]);
  });

  it('creates a new window with correct default properties', () => {
    const windowConfig = {
      id: 'test-window',
      title: 'Test Window',
      content: { type: 'component' as const, source: 'TestComponent' }
    };

    createWindow(windowConfig);
    const windowList = get(windows);

    expect(windowList).toHaveLength(1);
    expect(windowList[0]).toMatchObject({
      id: 'test-window',
      title: 'Test Window',
      x: 50,
      y: 50,
      width: 400,
      height: 300,
      zIndex: 1001, // First call to getNextZIndex() returns 1001
      isMinimized: false,
      isMaximized: false,
      isVisible: true,
      content: { type: 'component', source: 'TestComponent' }
    });
  });

  it('creates window with custom position and size', () => {
    const windowConfig = {
      id: 'custom-window',
      title: 'Custom Window',
      x: 100,
      y: 150,
      width: 500,
      height: 400,
      content: { type: 'iframe' as const, source: 'https://example.com' }
    };

    createWindow(windowConfig);
    const windowList = get(windows);

    expect(windowList[0]).toMatchObject({
      x: 100,
      y: 150,
      width: 500,
      height: 400
    });
  });

  it('closes window by removing it from the store', () => {
    createWindow({
      id: 'window-1',
      title: 'Window 1',
      content: { type: 'component', source: 'Test1' }
    });
    createWindow({
      id: 'window-2',
      title: 'Window 2',
      content: { type: 'component', source: 'Test2' }
    });

    expect(get(windows)).toHaveLength(2);

    closeWindow('window-1');
    const windowList = get(windows);

    expect(windowList).toHaveLength(1);
    expect(windowList[0].id).toBe('window-2');
  });

  it('minimizes window by setting isMinimized to true', () => {
    createWindow({
      id: 'test-window',
      title: 'Test Window',
      content: { type: 'component', source: 'Test' }
    });

    minimizeWindow('test-window');
    const windowList = get(windows);

    expect(windowList[0].isMinimized).toBe(true);
    expect(windowList[0].isVisible).toBe(false);
  });

  it('maximizes window by setting isMaximized to true and full viewport size', () => {
    // Mock viewport size
    Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true });

    createWindow({
      id: 'test-window',
      title: 'Test Window',
      content: { type: 'component', source: 'Test' }
    });

    maximizeWindow('test-window');
    const windowList = get(windows);

    expect(windowList[0].isMaximized).toBe(true);
    expect(windowList[0].x).toBe(0);
    expect(windowList[0].y).toBe(0);
    expect(windowList[0].width).toBe(1920);
    expect(windowList[0].height).toBe(1080);
  });

  it('focuses window by bringing it to front (highest z-index)', () => {
    createWindow({
      id: 'window-1',
      title: 'Window 1',
      content: { type: 'component', source: 'Test1' }
    });
    createWindow({
      id: 'window-2',
      title: 'Window 2',
      content: { type: 'component', source: 'Test2' }
    });

    focusWindow('window-1');
    const windowList = get(windows);

    const window1 = windowList.find(w => w.id === 'window-1');
    const window2 = windowList.find(w => w.id === 'window-2');

    expect(window1?.zIndex).toBeGreaterThan(window2?.zIndex || 0);
  });

  it('updates window position', () => {
    createWindow({
      id: 'test-window',
      title: 'Test Window',
      content: { type: 'component', source: 'Test' }
    });

    updateWindowPosition('test-window', 200, 300);
    const windowList = get(windows);

    expect(windowList[0].x).toBe(200);
    expect(windowList[0].y).toBe(300);
  });

  it('updates window size', () => {
    createWindow({
      id: 'test-window',
      title: 'Test Window',
      content: { type: 'component', source: 'Test' }
    });

    updateWindowSize('test-window', 600, 500);
    const windowList = get(windows);

    expect(windowList[0].width).toBe(600);
    expect(windowList[0].height).toBe(500);
  });

  it('generates incrementing z-index values', () => {
    const z1 = getNextZIndex();
    const z2 = getNextZIndex();
    const z3 = getNextZIndex();

    expect(z2).toBeGreaterThan(z1);
    expect(z3).toBeGreaterThan(z2);
  });

  it('handles focusing non-existent window gracefully', () => {
    expect(() => focusWindow('non-existent')).not.toThrow();
  });

  it('handles closing non-existent window gracefully', () => {
    expect(() => closeWindow('non-existent')).not.toThrow();
  });
});