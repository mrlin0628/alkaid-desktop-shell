import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { 
  toolRegistry, 
  registerTool, 
  unregisterTool, 
  getToolById, 
  getVisibleTools,
  getToolsByCategory,
  updateTool
} from './toolRegistry';
import type { Tool } from '../types';

describe('Tool Registry Store', () => {
  beforeEach(() => {
    // Reset the store before each test
    toolRegistry.set(new Map());
  });

  it('initializes with empty registry', () => {
    const registry = get(toolRegistry);
    expect(registry.size).toBe(0);
  });

  it('registers a new tool with defaults', () => {
    const tool: Tool = {
      id: 'test-tool',
      name: 'Test Tool',
      icon: '🔧',
      type: 'component',
      source: 'TestTool.svelte',
      category: 'utility'
    };

    registerTool(tool);
    const registry = get(toolRegistry);
    const registeredTool = registry.get('test-tool');
    
    expect(registry.size).toBe(1);
    expect(registeredTool).toBeDefined();
    expect(registeredTool?.isActive).toBe(true);
    expect(registeredTool?.hidden).toBe(false);
    expect(registeredTool?.sortOrder).toBe(0);
    expect(registeredTool?.createdAt).toBeDefined();
    expect(registeredTool?.updatedAt).toBeDefined();
  });

  it('validates required tool metadata', () => {
    const invalidTools = [
      { id: '', name: 'Test', icon: '🔧', type: 'component' as const, source: 'Test.svelte', category: 'utility' },
      { id: 'test', name: '', icon: '🔧', type: 'component' as const, source: 'Test.svelte', category: 'utility' },
      { id: 'test', name: 'Test', icon: '🔧', type: 'invalid' as any, source: 'Test.svelte', category: 'utility' },
      { id: 'test', name: 'Test', icon: '🔧', type: 'component' as const, source: '', category: 'utility' }
    ];

    const expectedErrors = [
      'Tool id is required',
      'Tool name is required', 
      'Tool type must be "component" or "iframe"',
      'Tool source is required'
    ];

    invalidTools.forEach((tool, index) => {
      expect(() => registerTool(tool)).toThrow(expectedErrors[index]);
    });
  });

  it('prevents duplicate tool registration', () => {
    const tool1: Tool = {
      id: 'duplicate-id',
      name: 'Tool 1',
      icon: '🔧',
      type: 'component',
      source: 'Tool1.svelte',
      category: 'utility'
    };
    
    const tool2: Tool = {
      id: 'duplicate-id',
      name: 'Tool 2',
      icon: '⚙️',
      type: 'iframe',
      source: 'https://example.com',
      category: 'web'
    };

    registerTool(tool1);
    expect(() => registerTool(tool2)).toThrow('Tool with id "duplicate-id" already exists');
  });

  it('unregisters a tool', () => {
    const tool: Tool = {
      id: 'removable-tool',
      name: 'Removable Tool',
      icon: '🗑️',
      type: 'component',
      source: 'RemovableTool.svelte',
      category: 'utility'
    };

    registerTool(tool);
    expect(get(toolRegistry).size).toBe(1);

    unregisterTool('removable-tool');
    expect(get(toolRegistry).size).toBe(0);
  });

  it('gets tool by id', () => {
    const tool: Tool = {
      id: 'findable-tool',
      name: 'Findable Tool',
      icon: '🔍',
      type: 'iframe',
      source: 'https://findme.com',
      category: 'web'
    };

    registerTool(tool);
    const foundTool = getToolById('findable-tool');
    expect(foundTool?.id).toBe('findable-tool');
    expect(foundTool?.name).toBe('Findable Tool');
    expect(getToolById('non-existent')).toBeUndefined();
  });

  it('gets visible tools excluding hidden and inactive', () => {
    const visibleTool: Tool = {
      id: 'visible-tool',
      name: 'Visible Tool',
      icon: '👁️',
      type: 'component',
      source: 'VisibleTool.svelte',
      category: 'utility',
      hidden: false,
      isActive: true
    };

    const hiddenTool: Tool = {
      id: 'hidden-tool',
      name: 'Hidden Tool',
      icon: '🫥',
      type: 'component',
      source: 'HiddenTool.svelte',
      category: 'utility',
      hidden: true
    };

    const inactiveTool: Tool = {
      id: 'inactive-tool',
      name: 'Inactive Tool',
      icon: '❌',
      type: 'component',
      source: 'InactiveTool.svelte',
      category: 'utility',
      isActive: false
    };

    registerTool(visibleTool);
    registerTool(hiddenTool);
    registerTool(inactiveTool);

    const visibleTools = getVisibleTools();
    expect(visibleTools).toHaveLength(1);
    expect(visibleTools[0].id).toBe('visible-tool');
  });

  it('sorts tools by sort order', () => {
    const tool1: Tool = {
      id: 'tool-1',
      name: 'Tool 1',
      icon: '1️⃣',
      type: 'component',
      source: 'Tool1.svelte',
      category: 'utility',
      sortOrder: 2
    };

    const tool2: Tool = {
      id: 'tool-2', 
      name: 'Tool 2',
      icon: '2️⃣',
      type: 'component',
      source: 'Tool2.svelte',
      category: 'utility',
      sortOrder: 1
    };

    registerTool(tool1);
    registerTool(tool2);

    const visibleTools = getVisibleTools();
    expect(visibleTools[0].id).toBe('tool-2'); // Lower sort order comes first
    expect(visibleTools[1].id).toBe('tool-1');
  });

  it('gets tools by category', () => {
    const utilityTool: Tool = {
      id: 'utility-tool',
      name: 'Utility Tool',
      icon: '🔧',
      type: 'component',
      source: 'UtilityTool.svelte',
      category: 'utility'
    };

    const systemTool: Tool = {
      id: 'system-tool',
      name: 'System Tool',
      icon: '⚙️',
      type: 'component',
      source: 'SystemTool.svelte',
      category: 'system'
    };

    registerTool(utilityTool);
    registerTool(systemTool);

    const utilityTools = getToolsByCategory('utility');
    const systemTools = getToolsByCategory('system');

    expect(utilityTools).toHaveLength(1);
    expect(utilityTools[0].id).toBe('utility-tool');
    expect(systemTools).toHaveLength(1);
    expect(systemTools[0].id).toBe('system-tool');
  });

  it('updates tool metadata', () => {
    const tool: Tool = {
      id: 'updatable-tool',
      name: 'Original Name',
      icon: '🔧',
      type: 'component',
      source: 'OriginalTool.svelte',
      category: 'utility'
    };

    registerTool(tool);

    const originalTool = getToolById('updatable-tool');
    
    updateTool('updatable-tool', { 
      name: 'Updated Name', 
      description: 'Updated description' 
    });

    const updatedTool = getToolById('updatable-tool');
    expect(updatedTool?.name).toBe('Updated Name');
    expect(updatedTool?.description).toBe('Updated description');
    expect(updatedTool?.updatedAt).toBeDefined();
    expect(updatedTool?.id).toBe('updatable-tool'); // ID should not change
  });

  it('throws error when updating non-existent tool', () => {
    expect(() => updateTool('non-existent', { name: 'New Name' }))
      .toThrow('Tool with id "non-existent" not found');
  });

  it('handles performance optimization for large registry', () => {
    // Register 1000 tools to test Map performance
    for (let i = 0; i < 1000; i++) {
      registerTool({
        id: `tool-${i}`,
        name: `Tool ${i}`,
        icon: '🔧',
        type: 'component',
        source: `Tool${i}.svelte`,
        category: 'utility'
      });
    }

    const registry = get(toolRegistry);
    expect(registry.size).toBe(1000);

    // Lookup should be O(1) - very fast even with 1000 tools
    const startTime = performance.now();
    const tool = getToolById('tool-500');
    const endTime = performance.now();

    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Tool 500');
    // Map lookup should be under 1ms even for large datasets
    expect(endTime - startTime).toBeLessThan(1);
  });

  it('sets default category when not provided', () => {
    const tool: Tool = {
      id: 'no-category-tool',
      name: 'No Category Tool',
      icon: '🔧',
      type: 'component',
      source: 'NoCategoryTool.svelte',
      category: '' // Will be set to 'general'
    };

    registerTool({ ...tool, category: '' });
    const registeredTool = getToolById('no-category-tool');
    expect(registeredTool?.category).toBe('general');
  });
});