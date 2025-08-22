# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-08-22-desktop-shell-interface/spec.md

## Endpoints

### GET /api/tools

**Purpose:** Retrieve all active tools for the desktop launcher
**Parameters:** 
- `category` (optional): Filter by tool category
- `active` (optional): Filter by active status (default: true)
**Response:** 
```json
{
  "tools": [
    {
      "id": "file-manager",
      "name": "File Manager", 
      "icon": "folder",
      "description": "Browse and manage files",
      "type": "component",
      "source": "/src/tools/FileManager.svelte",
      "category": "system"
    }
  ]
}
```
**Errors:** 500 Internal Server Error

### POST /api/tools

**Purpose:** Register a new tool in the system
**Parameters:** 
```json
{
  "id": "string",
  "name": "string",
  "icon": "string",
  "description": "string", 
  "type": "component|iframe",
  "source": "string",
  "category": "string"
}
```
**Response:** 
```json
{
  "success": true,
  "tool": { /* tool object */ }
}
```
**Errors:** 400 Bad Request (invalid data), 409 Conflict (ID exists)

### PUT /api/tools/:id

**Purpose:** Update existing tool metadata
**Parameters:** Path: `id` (tool ID), Body: partial tool object
**Response:** 
```json
{
  "success": true,
  "tool": { /* updated tool object */ }
}
```
**Errors:** 404 Not Found, 400 Bad Request

### DELETE /api/tools/:id

**Purpose:** Deactivate a tool (soft delete)
**Parameters:** Path: `id` (tool ID)
**Response:** 
```json
{
  "success": true
}
```
**Errors:** 404 Not Found

### GET /api/preferences

**Purpose:** Retrieve all user preferences for desktop customization
**Parameters:** None
**Response:** 
```json
{
  "preferences": {
    "desktop_background_type": "video",
    "desktop_background_source": "/uploads/background.mp4",
    "theme_variant": "cyberpunk",
    "window_animation_speed": "normal"
  }
}
```
**Errors:** 500 Internal Server Error

### PUT /api/preferences

**Purpose:** Update user preferences (batch update)
**Parameters:** 
```json
{
  "preferences": {
    "desktop_background_source": "/uploads/new-background.mp4",
    "theme_variant": "minimal"
  }
}
```
**Response:** 
```json
{
  "success": true,
  "preferences": { /* updated preferences object */ }
}
```
**Errors:** 400 Bad Request

### POST /api/background-upload

**Purpose:** Upload video file for desktop background
**Parameters:** FormData with video file
**Response:** 
```json
{
  "success": true,
  "url": "/uploads/backgrounds/video-123.mp4"
}
```
**Errors:** 400 Bad Request (invalid file), 413 Payload Too Large

## Controllers

### ToolsController
- **getTools()**: Query database with filters, return JSON response
- **createTool()**: Validate input, check uniqueness, insert into database
- **updateTool()**: Validate ID exists, update database record
- **deleteTool()**: Set is_active to false instead of hard delete

### PreferencesController  
- **getPreferences()**: Convert key-value pairs to object format
- **updatePreferences()**: Validate keys, upsert preference records
- **uploadBackground()**: Handle file validation, storage, update preference

### ErrorHandling
- Input validation using Zod schemas for type safety
- Database transaction rollback on errors
- Standardized error response format with status codes
- File upload size limits and type validation