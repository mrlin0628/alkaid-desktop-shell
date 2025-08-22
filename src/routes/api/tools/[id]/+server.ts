import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { toolsRepository } from '$lib/db/tools';
import type { Tool } from '$lib/types';

// GET /api/tools/:id - Get specific tool by ID
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;
    const tool = toolsRepository.getToolById(id);
    
    if (!tool) {
      return error(404, {
        message: `Tool with id "${id}" not found`
      });
    }
    
    return json({
      success: true,
      data: tool
    });
  } catch (err) {
    console.error('Error fetching tool:', err);
    return error(500, {
      message: 'Failed to fetch tool',
      error: err instanceof Error ? err.message : 'Unknown error'
    });
  }
};

// PUT /api/tools/:id - Update tool metadata
export const PUT: RequestHandler = async ({ params, request }) => {
  try {
    const { id } = params;
    const updates: Partial<Tool> = await request.json();
    
    // Prevent ID changes
    if (updates.id && updates.id !== id) {
      return error(400, {
        message: 'Cannot change tool ID'
      });
    }
    
    // Validate type if provided
    if (updates.type && !['component', 'iframe'].includes(updates.type)) {
      return error(400, {
        message: 'Tool type must be "component" or "iframe"'
      });
    }
    
    const updatedTool = toolsRepository.updateTool(id, updates);
    
    return json({
      success: true,
      data: updatedTool,
      message: 'Tool updated successfully'
    });
  } catch (err: any) {
    console.error('Error updating tool:', err);
    
    if (err.message.includes('not found')) {
      return error(404, {
        message: err.message
      });
    }
    
    return error(500, {
      message: 'Failed to update tool',
      error: err.message
    });
  }
};

// DELETE /api/tools/:id - Soft delete (deactivate) tool
export const DELETE: RequestHandler = async ({ params, url }) => {
  try {
    const { id } = params;
    const permanent = url.searchParams.get('permanent') === 'true';
    
    let success: boolean;
    let message: string;
    
    if (permanent) {
      success = toolsRepository.permanentDeleteTool(id);
      message = success ? 'Tool permanently deleted' : 'Tool not found';
    } else {
      success = toolsRepository.deleteTool(id);
      message = success ? 'Tool deactivated' : 'Tool not found';
    }
    
    if (!success) {
      return error(404, {
        message: `Tool with id "${id}" not found`
      });
    }
    
    return json({
      success: true,
      message
    });
  } catch (err) {
    console.error('Error deleting tool:', err);
    return error(500, {
      message: 'Failed to delete tool',
      error: err instanceof Error ? err.message : 'Unknown error'
    });
  }
};