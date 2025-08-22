import { writable } from 'svelte/store';
import type { WindowState } from '../types';

export const windows = writable<WindowState[]>([]);

let nextZIndex = 1000;

export function getNextZIndex(): number {
  return ++nextZIndex;
}

export function createWindow(config: {
  id: string;
  title: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  content: {
    type: 'component' | 'iframe';
    source: string;
  };
}): void {
  const x = config.x ?? 50;
  const y = config.y ?? 50;
  const width = config.width ?? 400;
  const height = config.height ?? 300;

  const newWindow: WindowState = {
    id: config.id,
    title: config.title,
    x,
    y,
    width,
    height,
    originalX: x,
    originalY: y,
    originalWidth: width,
    originalHeight: height,
    zIndex: getNextZIndex(),
    isMinimized: false,
    isMaximized: false,
    isVisible: true,
    content: config.content
  };

  windows.update(windowList => [...windowList, newWindow]);
}

export function closeWindow(windowId: string): void {
  windows.update(windowList => 
    windowList.filter(window => window.id !== windowId)
  );
}

export function minimizeWindow(windowId: string): void {
  windows.update(windowList =>
    windowList.map(window =>
      window.id === windowId
        ? { 
            ...window, 
            isMinimized: true, 
            isVisible: false
            // Keep isMaximized state unchanged
          }
        : window
    )
  );
}

export function restoreWindow(windowId: string): void {
  windows.update(windowList =>
    windowList.map(window =>
      window.id === windowId
        ? { 
            ...window, 
            isMinimized: false, 
            isVisible: true,
            // Keep the isMaximized state and position/size as they were
            zIndex: getNextZIndex()
          }
        : window
    )
  );
}

export function maximizeWindow(windowId: string): void {
  windows.update(windowList =>
    windowList.map(window => {
      if (window.id !== windowId) return window;
      
      if (window.isMaximized) {
        // Restore to original size
        return {
          ...window,
          x: window.originalX,
          y: window.originalY,
          width: window.originalWidth,
          height: window.originalHeight,
          isMaximized: false,
          isMinimized: false,
          isVisible: true
        };
      } else {
        // Store current position as original before maximizing
        const updatedWindow = {
          ...window,
          originalX: window.x,
          originalY: window.y,
          originalWidth: window.width,
          originalHeight: window.height,
          x: 0,
          y: 0,
          width: globalThis.innerWidth || 1920,
          height: globalThis.innerHeight || 1080,
          isMaximized: true,
          isMinimized: false,
          isVisible: true,
          zIndex: getNextZIndex()
        };
        return updatedWindow;
      }
    })
  );
}

export function focusWindow(windowId: string): void {
  windows.update(windowList =>
    windowList.map(window =>
      window.id === windowId
        ? { ...window, zIndex: getNextZIndex() }
        : window
    )
  );
}

export function updateWindowPosition(windowId: string, x: number, y: number): void {
  windows.update(windowList =>
    windowList.map(window =>
      window.id === windowId
        ? { 
            ...window, 
            x, 
            y,
            // Update original position if not maximized
            originalX: window.isMaximized ? window.originalX : x,
            originalY: window.isMaximized ? window.originalY : y
          }
        : window
    )
  );
}

export function updateWindowSize(windowId: string, width: number, height: number): void {
  windows.update(windowList =>
    windowList.map(window =>
      window.id === windowId
        ? { 
            ...window, 
            width, 
            height,
            // Update original size if not maximized
            originalWidth: window.isMaximized ? window.originalWidth : width,
            originalHeight: window.isMaximized ? window.originalHeight : height
          }
        : window
    )
  );
}

// For testing only
export function resetZIndex(): void {
  nextZIndex = 1000;
}

export function toggleMaximize(windowId: string): void {
  windows.update(windowList =>
    windowList.map(window => {
      if (window.id !== windowId) return window;
      
      if (window.isMaximized) {
        // Restore to previous size/position (simplified - could store previous state)
        return {
          ...window,
          x: 50,
          y: 50,
          width: 400,
          height: 300,
          isMaximized: false
        };
      } else {
        // Maximize
        return {
          ...window,
          x: 0,
          y: 0,
          width: window.innerWidth || 1920,
          height: window.innerHeight || 1080,
          isMaximized: true,
          zIndex: getNextZIndex()
        };
      }
    })
  );
}