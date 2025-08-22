import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { 
  runningTools, 
  addRunningTool, 
  removeRunningTool, 
  updateRunningToolState,
  getRunningTool,
  minimizedTools,
  visibleToolsCount,
  isToolRunning
} from './runningTools';

describe('Running Tools Store', () => {
  beforeEach(() => {
    // Reset the store before each test
    runningTools.set([]);
  });

  it('initializes with empty array', () => {
    const tools = get(runningTools);
    expect(tools).toHaveLength(0);
  });

  it('adds a running tool', () => {
    addRunningTool('file-manager', 'window-1');
    
    const tools = get(runningTools);
    expect(tools).toHaveLength(1);
    expect(tools[0]).toEqual({
      toolId: 'file-manager',
      windowId: 'window-1',
      isMinimized: false,
      isVisible: true
    });
  });

  it('prevents duplicate running tools', () => {
    addRunningTool('calculator', 'window-1');
    addRunningTool('calculator', 'window-2'); // Same tool ID
    
    const tools = get(runningTools);
    expect(tools).toHaveLength(1); // Should not add duplicate
    expect(tools[0].windowId).toBe('window-1'); // First one remains
  });

  it('removes a running tool', () => {
    addRunningTool('terminal', 'window-1');
    addRunningTool('calculator', 'window-2');
    
    expect(get(runningTools)).toHaveLength(2);
    
    removeRunningTool('terminal');
    
    const tools = get(runningTools);
    expect(tools).toHaveLength(1);
    expect(tools[0].toolId).toBe('calculator');
  });

  it('updates running tool state', () => {
    addRunningTool('file-manager', 'window-1');
    
    updateRunningToolState('file-manager', { 
      isMinimized: true, 
      isVisible: false 
    });
    
    const tools = get(runningTools);
    expect(tools[0].isMinimized).toBe(true);
    expect(tools[0].isVisible).toBe(false);
    // Should not affect toolId and windowId
    expect(tools[0].toolId).toBe('file-manager');
    expect(tools[0].windowId).toBe('window-1');
  });

  it('gets running tool by tool ID', () => {
    addRunningTool('calculator', 'window-calc');
    
    const runningTool = getRunningTool('calculator');
    expect(runningTool).toBeDefined();
    expect(runningTool?.toolId).toBe('calculator');
    expect(runningTool?.windowId).toBe('window-calc');
    
    expect(getRunningTool('non-existent')).toBeUndefined();
  });

  it('checks if tool is running', () => {
    expect(isToolRunning('file-manager')).toBe(false);
    
    addRunningTool('file-manager', 'window-1');
    expect(isToolRunning('file-manager')).toBe(true);
    
    removeRunningTool('file-manager');
    expect(isToolRunning('file-manager')).toBe(false);
  });

  it('tracks minimized tools', () => {
    addRunningTool('tool1', 'window-1');
    addRunningTool('tool2', 'window-2'); 
    addRunningTool('tool3', 'window-3');
    
    // Minimize some tools
    updateRunningToolState('tool1', { isMinimized: true });
    updateRunningToolState('tool3', { isMinimized: true });
    
    const minimized = get(minimizedTools);
    expect(minimized).toHaveLength(2);
    expect(minimized.map(t => t.toolId).sort()).toEqual(['tool1', 'tool3']);
  });

  it('counts visible tools', () => {
    addRunningTool('tool1', 'window-1');
    addRunningTool('tool2', 'window-2');
    addRunningTool('tool3', 'window-3');
    
    expect(get(visibleToolsCount)).toBe(3);
    
    // Hide one tool
    updateRunningToolState('tool2', { isVisible: false });
    expect(get(visibleToolsCount)).toBe(2);
    
    // Hide another
    updateRunningToolState('tool1', { isVisible: false });
    expect(get(visibleToolsCount)).toBe(1);
  });

  it('handles multiple state updates correctly', () => {
    addRunningTool('multi-tool', 'window-multi');
    
    // Multiple updates
    updateRunningToolState('multi-tool', { isMinimized: true });
    updateRunningToolState('multi-tool', { isVisible: false });
    updateRunningToolState('multi-tool', { isMinimized: false });
    
    const tool = getRunningTool('multi-tool');
    expect(tool?.isMinimized).toBe(false);
    expect(tool?.isVisible).toBe(false);
  });

  it('handles updates for non-existent tools gracefully', () => {
    updateRunningToolState('non-existent', { isMinimized: true });
    
    // Should not throw error, just have no effect
    expect(get(runningTools)).toHaveLength(0);
  });

  it('maintains tool order when updating states', () => {
    addRunningTool('first-tool', 'window-1');
    addRunningTool('second-tool', 'window-2');
    addRunningTool('third-tool', 'window-3');
    
    updateRunningToolState('second-tool', { isMinimized: true });
    
    const tools = get(runningTools);
    expect(tools).toHaveLength(3);
    expect(tools[0].toolId).toBe('first-tool');
    expect(tools[1].toolId).toBe('second-tool');
    expect(tools[1].isMinimized).toBe(true);
    expect(tools[2].toolId).toBe('third-tool');
  });
});