import { writable } from 'svelte/store';
import type { Tool, ToolRegistry } from '../types';

// Tool registry store using Map for O(1) lookup performance
export const toolRegistry = writable<ToolRegistry>(new Map());

// Helper functions for tool registry management
export function registerTool(tool: Tool): void {
  // Validate tool metadata
  if (!tool.id || tool.id.trim() === '') {
    throw new Error('Tool id is required');
  }
  if (!tool.name || tool.name.trim() === '') {
    throw new Error('Tool name is required');
  }
  if (!tool.type || !['component', 'iframe'].includes(tool.type)) {
    throw new Error('Tool type must be "component" or "iframe"');
  }
  if (!tool.source || tool.source.trim() === '') {
    throw new Error('Tool source is required');
  }
  if (!tool.category) {
    tool.category = 'general';
  }

  toolRegistry.update(registry => {
    // Check for duplicate IDs
    if (registry.has(tool.id)) {
      throw new Error(`Tool with id "${tool.id}" already exists`);
    }

    // Set default values
    const toolWithDefaults: Tool = {
      ...tool,
      isActive: tool.isActive ?? true,
      hidden: tool.hidden ?? false,
      sortOrder: tool.sortOrder ?? 0,
      createdAt: tool.createdAt ?? new Date().toISOString(),
      updatedAt: tool.updatedAt ?? new Date().toISOString()
    };

    registry.set(tool.id, toolWithDefaults);
    return registry;
  });
}

export function unregisterTool(toolId: string): void {
  toolRegistry.update(registry => {
    registry.delete(toolId);
    return registry;
  });
}

export function getToolById(toolId: string): Tool | undefined {
  let tool: Tool | undefined;
  toolRegistry.subscribe(registry => {
    tool = registry.get(toolId);
  })();
  return tool;
}

export function getVisibleTools(): Tool[] {
  let tools: Tool[] = [];
  toolRegistry.subscribe(registry => {
    tools = Array.from(registry.values()).filter(tool => 
      tool.isActive !== false && tool.hidden !== true
    );
  })();
  return tools.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
}

export function getToolsByCategory(category: string): Tool[] {
  let tools: Tool[] = [];
  toolRegistry.subscribe(registry => {
    tools = Array.from(registry.values()).filter(tool => 
      tool.category === category && tool.isActive !== false && tool.hidden !== true
    );
  })();
  return tools.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
}

export function updateTool(toolId: string, updates: Partial<Tool>): void {
  toolRegistry.update(registry => {
    const existingTool = registry.get(toolId);
    if (!existingTool) {
      throw new Error(`Tool with id "${toolId}" not found`);
    }

    const updatedTool: Tool = {
      ...existingTool,
      ...updates,
      id: existingTool.id, // Prevent ID changes
      updatedAt: new Date().toISOString()
    };

    registry.set(toolId, updatedTool);
    return registry;
  });
}

// Initialize with empty registry
toolRegistry.set(new Map());