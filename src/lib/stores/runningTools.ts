import { writable, derived } from 'svelte/store';
import type { RunningToolState } from '../types';

// Store for tracking running tool states
export const runningTools = writable<RunningToolState[]>([]);

// Add a running tool
export function addRunningTool(toolId: string, windowId: string): void {
  runningTools.update(tools => {
    // Check if tool is already running
    const existing = tools.find(t => t.toolId === toolId);
    if (existing) {
      return tools;
    }

    return [...tools, {
      toolId,
      windowId,
      isMinimized: false,
      isVisible: true
    }];
  });
}

// Remove a running tool
export function removeRunningTool(toolId: string): void {
  runningTools.update(tools => 
    tools.filter(t => t.toolId !== toolId)
  );
}

// Update running tool state
export function updateRunningToolState(
  toolId: string, 
  updates: Partial<Omit<RunningToolState, 'toolId' | 'windowId'>>
): void {
  runningTools.update(tools => 
    tools.map(tool => 
      tool.toolId === toolId 
        ? { ...tool, ...updates }
        : tool
    )
  );
}

// Get running tool by tool ID
export function getRunningTool(toolId: string): RunningToolState | undefined {
  let tool: RunningToolState | undefined;
  runningTools.subscribe(tools => {
    tool = tools.find(t => t.toolId === toolId);
  })();
  return tool;
}

// Derived store for minimized tools (for taskbar indicators)
export const minimizedTools = derived(runningTools, $runningTools => 
  $runningTools.filter(tool => tool.isMinimized)
);

// Derived store for visible tools count
export const visibleToolsCount = derived(runningTools, $runningTools => 
  $runningTools.filter(tool => tool.isVisible).length
);

// Check if tool is running
export function isToolRunning(toolId: string): boolean {
  let running = false;
  runningTools.subscribe(tools => {
    running = tools.some(t => t.toolId === toolId);
  })();
  return running;
}