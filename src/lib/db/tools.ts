import { getDatabase, transaction } from './index.js';
import type { Tool } from '../types/index.js';

// Database operations for tools
export class ToolsRepository {
  private db;

  constructor() {
    this.db = getDatabase();
  }

  // Get all active tools
  getAllTools(): Tool[] {
    const stmt = this.db.prepare(`
      SELECT * FROM tools 
      WHERE is_active = 1 
      ORDER BY sort_order ASC, name ASC
    `);
    return stmt.all().map(this.mapDbToTool);
  }

  // Get tools by category
  getToolsByCategory(category: string): Tool[] {
    const stmt = this.db.prepare(`
      SELECT * FROM tools 
      WHERE category = ? AND is_active = 1 
      ORDER BY sort_order ASC, name ASC
    `);
    return stmt.all(category).map(this.mapDbToTool);
  }

  // Get visible tools (not hidden)
  getVisibleTools(): Tool[] {
    const stmt = this.db.prepare(`
      SELECT * FROM tools 
      WHERE is_active = 1 AND hidden = 0
      ORDER BY sort_order ASC, name ASC
    `);
    return stmt.all().map(this.mapDbToTool);
  }

  // Get tool by ID
  getToolById(id: string): Tool | undefined {
    const stmt = this.db.prepare('SELECT * FROM tools WHERE id = ?');
    const result = stmt.get(id);
    return result ? this.mapDbToTool(result) : undefined;
  }

  // Create new tool
  createTool(tool: Tool): Tool {
    return transaction(() => {
      // Validate required fields
      this.validateTool(tool);

      const stmt = this.db.prepare(`
        INSERT INTO tools (
          id, name, icon, description, type, source, category, 
          sort_order, is_active, hidden
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      try {
        stmt.run(
          tool.id,
          tool.name,
          tool.icon,
          tool.description || null,
          tool.type,
          tool.source,
          tool.category || 'general',
          tool.sortOrder || 0,
          tool.isActive !== false ? 1 : 0,
          tool.hidden ? 1 : 0
        );

        return this.getToolById(tool.id)!;
      } catch (error: any) {
        if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
          throw new Error(`Tool with id "${tool.id}" already exists`);
        }
        throw error;
      }
    });
  }

  // Update existing tool
  updateTool(id: string, updates: Partial<Tool>): Tool {
    return transaction(() => {
      const existingTool = this.getToolById(id);
      if (!existingTool) {
        throw new Error(`Tool with id "${id}" not found`);
      }

      // Prevent ID changes
      const { id: _, ...allowedUpdates } = updates;

      const setClause = Object.keys(allowedUpdates)
        .map(key => `${this.camelToSnake(key)} = ?`)
        .join(', ');
      
      if (setClause) {
        const stmt = this.db.prepare(`
          UPDATE tools 
          SET ${setClause}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `);

        const values = Object.keys(allowedUpdates).map(key => {
          const value = (updates as any)[key];
          if (key === 'isActive' || key === 'hidden') {
            return value ? 1 : 0;
          }
          return value;
        });

        stmt.run(...values, id);
      }

      return this.getToolById(id)!;
    });
  }

  // Soft delete tool (set is_active to false)
  deleteTool(id: string): boolean {
    const stmt = this.db.prepare(`
      UPDATE tools 
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // Hard delete tool (permanent removal)
  permanentDeleteTool(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM tools WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // Seed default tools
  seedDefaultTools(): void {
    const defaultTools: Tool[] = [
      {
        id: 'file-manager',
        name: 'File Manager',
        icon: 'folder',
        description: 'Browse and manage files',
        type: 'component',
        source: '/src/tools/FileManager.svelte',
        category: 'system',
        sortOrder: 1
      },
      {
        id: 'terminal',
        name: 'Terminal',
        icon: 'terminal',
        description: 'Command line interface',
        type: 'component',
        source: '/src/tools/Terminal.svelte',
        category: 'system',
        sortOrder: 2
      },
      {
        id: 'calculator',
        name: 'Calculator',
        icon: 'calculator',
        description: 'Basic calculator',
        type: 'component',
        source: '/src/tools/Calculator.svelte',
        category: 'utilities',
        sortOrder: 3
      },
      {
        id: 'text-editor',
        name: 'Text Editor',
        icon: 'file-text',
        description: 'Simple text editor',
        type: 'component',
        source: '/src/tools/TextEditor.svelte',
        category: 'utilities',
        sortOrder: 4
      }
    ];

    transaction(() => {
      for (const tool of defaultTools) {
        try {
          this.createTool(tool);
          console.log(`Seeded tool: ${tool.name}`);
        } catch (error: any) {
          if (!error.message.includes('already exists')) {
            console.warn(`Failed to seed tool ${tool.name}:`, error);
          }
        }
      }
    });
  }

  // Helper methods
  private validateTool(tool: Tool): void {
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
  }

  private mapDbToTool(row: any): Tool {
    return {
      id: row.id,
      name: row.name,
      icon: row.icon,
      description: row.description,
      type: row.type,
      source: row.source,
      category: row.category,
      sortOrder: row.sort_order,
      isActive: row.is_active === 1,
      hidden: row.hidden === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

// Export singleton instance
export const toolsRepository = new ToolsRepository();