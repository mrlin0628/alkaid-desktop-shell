import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { toolsRepository } from '$lib/db/tools';
import type { Tool } from '$lib/types';

// GET /api/tools - Retrieve active tools with optional category filtering
export const GET: RequestHandler = async ({ url }) => {
  try {
    const category = url.searchParams.get('category');
    const includeHidden = url.searchParams.get('includeHidden') === 'true';
    
    let tools: Tool[];
    
    if (category) {
      tools = toolsRepository.getToolsByCategory(category);
    } else if (includeHidden) {
      tools = toolsRepository.getAllTools();
    } else {
      tools = toolsRepository.getVisibleTools();
    }
    
    return json({
      success: true,
      data: tools,
      count: tools.length
    });
  } catch (err) {
    console.error('Error fetching tools:', err);
    return error(500, {
      message: 'Failed to fetch tools',
      error: err instanceof Error ? err.message : 'Unknown error'
    });
  }
};

// POST /api/tools - Register new tool with validation
export const POST: RequestHandler = async ({ request }) => {
  try {
    const toolData: Tool = await request.json();
    
    // Validate required fields
    if (!toolData.id || !toolData.name || !toolData.type || !toolData.source) {
      return error(400, {
        message: 'Missing required fields: id, name, type, source'
      });
    }
    
    // Validate type
    if (!['component', 'iframe'].includes(toolData.type)) {
      return error(400, {
        message: 'Tool type must be "component" or "iframe"'
      });
    }
    
    const newTool = toolsRepository.createTool(toolData);
    
    return json({
      success: true,
      data: newTool,
      message: 'Tool registered successfully'
    }, { status: 201 });
  } catch (err: any) {
    console.error('Error creating tool:', err);
    
    if (err.message.includes('already exists')) {
      return error(409, {
        message: err.message
      });
    }
    
    return error(500, {
      message: 'Failed to register tool',
      error: err.message
    });
  }
};