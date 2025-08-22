import { toolRegistry, registerTool as storeRegisterTool, getVisibleTools } from '$lib/stores/toolRegistry';
import type { Tool } from '$lib/types';

/**
 * Tool Service - Centralized tool registration and management
 * Handles both client-side store updates and server-side API calls
 */
export class ToolService {
  private apiBase = '/api/tools';

  /**
   * Register a new tool with comprehensive validation
   */
  async registerTool(tool: Tool): Promise<Tool> {
    // Validate tool metadata
    this.validateToolMetadata(tool);
    
    try {
      // First register in API (server-side validation and persistence)
      const response = await fetch(this.apiBase, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tool)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to register tool');
      }

      const result = await response.json();
      const registeredTool = result.data;

      // Update client-side store
      storeRegisterTool(registeredTool);

      console.log(`Tool registered successfully: ${registeredTool.name}`);
      return registeredTool;
    } catch (error) {
      console.error('Failed to register tool:', error);
      throw error;
    }
  }

  /**
   * Update an existing tool
   */
  async updateTool(toolId: string, updates: Partial<Tool>): Promise<Tool> {
    // Validate updates
    if (updates.id && updates.id !== toolId) {
      throw new Error('Cannot change tool ID');
    }

    if (updates.type && !['component', 'iframe'].includes(updates.type)) {
      throw new Error('Tool type must be "component" or "iframe"');
    }

    try {
      const response = await fetch(`${this.apiBase}/${toolId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update tool');
      }

      const result = await response.json();
      const updatedTool = result.data;

      // Update client-side store
      toolRegistry.update(registry => {
        registry.set(toolId, updatedTool);
        return registry;
      });

      console.log(`Tool updated successfully: ${updatedTool.name}`);
      return updatedTool;
    } catch (error) {
      console.error('Failed to update tool:', error);
      throw error;
    }
  }

  /**
   * Remove a tool (soft delete)
   */
  async removeTool(toolId: string, permanent = false): Promise<boolean> {
    try {
      const url = permanent ? `${this.apiBase}/${toolId}?permanent=true` : `${this.apiBase}/${toolId}`;
      const response = await fetch(url, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove tool');
      }

      // Update client-side store
      if (permanent) {
        toolRegistry.update(registry => {
          registry.delete(toolId);
          return registry;
        });
      } else {
        toolRegistry.update(registry => {
          const tool = registry.get(toolId);
          if (tool) {
            registry.set(toolId, { ...tool, isActive: false });
          }
          return registry;
        });
      }

      console.log(`Tool removed successfully: ${toolId}`);
      return true;
    } catch (error) {
      console.error('Failed to remove tool:', error);
      throw error;
    }
  }

  /**
   * Load all tools from API
   */
  async loadTools(): Promise<Tool[]> {
    try {
      const response = await fetch(this.apiBase);
      
      if (!response.ok) {
        throw new Error('Failed to fetch tools');
      }

      const result = await response.json();
      const tools = result.data || [];

      // Update client-side store
      toolRegistry.update(registry => {
        const newRegistry = new Map<string, Tool>();
        tools.forEach((tool: Tool) => {
          newRegistry.set(tool.id, tool);
        });
        return newRegistry;
      });

      return tools;
    } catch (error) {
      console.error('Failed to load tools:', error);
      // Return current store data as fallback
      return getVisibleTools();
    }
  }

  /**
   * Get tools by category
   */
  async getToolsByCategory(category: string): Promise<Tool[]> {
    try {
      const response = await fetch(`${this.apiBase}?category=${encodeURIComponent(category)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch tools by category');
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Failed to get tools by category:', error);
      throw error;
    }
  }

  /**
   * Validate tool component source exists
   */
  async validateComponentSource(source: string): Promise<boolean> {
    try {
      // For Svelte components, check if the file exists
      if (source.endsWith('.svelte')) {
        // In a real implementation, you might check file existence
        // For now, just validate the path format
        return source.startsWith('/src/') && source.includes('/');
      }
      
      // For iframe sources, validate URL
      if (source.startsWith('http://') || source.startsWith('https://')) {
        try {
          new URL(source);
          return true;
        } catch {
          return false;
        }
      }
      
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Comprehensive tool metadata validation
   */
  private validateToolMetadata(tool: Tool): void {
    // Required fields validation
    if (!tool.id || typeof tool.id !== 'string' || tool.id.trim() === '') {
      throw new Error('Tool ID is required and must be a non-empty string');
    }

    if (!tool.name || typeof tool.name !== 'string' || tool.name.trim() === '') {
      throw new Error('Tool name is required and must be a non-empty string');
    }

    if (!tool.type || !['component', 'iframe'].includes(tool.type)) {
      throw new Error('Tool type must be either "component" or "iframe"');
    }

    if (!tool.source || typeof tool.source !== 'string' || tool.source.trim() === '') {
      throw new Error('Tool source is required and must be a non-empty string');
    }

    // ID format validation
    if (!/^[a-z0-9-_]+$/i.test(tool.id)) {
      throw new Error('Tool ID must contain only alphanumeric characters, hyphens, and underscores');
    }

    // Name length validation
    if (tool.name.length > 50) {
      throw new Error('Tool name must be 50 characters or less');
    }

    // Description validation
    if (tool.description && tool.description.length > 200) {
      throw new Error('Tool description must be 200 characters or less');
    }

    // Category validation
    if (tool.category && typeof tool.category !== 'string') {
      throw new Error('Tool category must be a string');
    }

    // Sort order validation
    if (tool.sortOrder !== undefined && (!Number.isInteger(tool.sortOrder) || tool.sortOrder < 0)) {
      throw new Error('Tool sort order must be a non-negative integer');
    }

    // Source validation based on type
    if (tool.type === 'component') {
      if (!tool.source.endsWith('.svelte')) {
        throw new Error('Component tool source must be a .svelte file path');
      }
      if (!tool.source.startsWith('/') && !tool.source.startsWith('./') && !tool.source.startsWith('../')) {
        throw new Error('Component tool source must be a valid file path');
      }
    } else if (tool.type === 'iframe') {
      try {
        const url = new URL(tool.source);
        if (!['http:', 'https:'].includes(url.protocol)) {
          throw new Error('iframe tool source must be a valid HTTP or HTTPS URL');
        }
      } catch {
        throw new Error('iframe tool source must be a valid URL');
      }
    }

    // Icon validation (if provided)
    if (tool.icon && typeof tool.icon !== 'string') {
      throw new Error('Tool icon must be a string');
    }
  }

  /**
   * Get available tool categories
   */
  getToolCategories(): string[] {
    return [
      'system',
      'utilities', 
      'development',
      'communication',
      'productivity',
      'media',
      'games',
      'education',
      'finance',
      'health',
      'general'
    ];
  }

  /**
   * Validate tool permissions (placeholder for future security features)
   */
  validateToolPermissions(tool: Tool): boolean {
    // Future implementation could check:
    // - User permissions
    // - Tool safety ratings
    // - Domain whitelists for iframe tools
    // - Component code analysis
    return true;
  }
}

// Export singleton instance
export const toolService = new ToolService();