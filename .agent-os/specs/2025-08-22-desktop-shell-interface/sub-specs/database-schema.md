# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-08-22-desktop-shell-interface/spec.md

## Schema Changes

### New Tables

#### tools
Stores registered tool metadata for the desktop shell interface.

```sql
CREATE TABLE tools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('component', 'iframe')),
    source TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tools_category ON tools(category);
CREATE INDEX idx_tools_sort_order ON tools(sort_order);
CREATE INDEX idx_tools_active ON tools(is_active);
```

#### user_preferences
Stores user settings for desktop customization.

```sql
CREATE TABLE user_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'default',
    preference_key TEXT NOT NULL,
    preference_value TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, preference_key)
);

CREATE INDEX idx_preferences_user_key ON user_preferences(user_id, preference_key);
```

### Initial Data

#### Default Tools
```sql
INSERT INTO tools (id, name, icon, description, type, source, category) VALUES
('file-manager', 'File Manager', 'folder', 'Browse and manage files', 'component', '/src/tools/FileManager.svelte', 'system'),
('terminal', 'Terminal', 'terminal', 'Command line interface', 'component', '/src/tools/Terminal.svelte', 'system'),
('calculator', 'Calculator', 'calculator', 'Basic calculator', 'component', '/src/tools/Calculator.svelte', 'utilities');
```

#### Default Preferences
```sql
INSERT INTO user_preferences (preference_key, preference_value) VALUES
('desktop_background_type', 'video'),
('desktop_background_source', ''),
('theme_variant', 'cyberpunk'),
('window_animation_speed', 'normal');
```

## Rationale

### Tool Registry Design
- **Primary key as text**: Allows human-readable tool IDs for easier debugging and component mapping
- **Type constraint**: Enforces valid content rendering methods (component/iframe)
- **Category system**: Enables future tool organization and filtering
- **Sort order**: Allows custom arrangement of tool launcher buttons
- **Active flag**: Soft delete for temporarily disabled tools

### User Preferences Design
- **Key-value structure**: Flexible storage for various preference types without schema changes
- **Single user support**: Uses default user_id since this is a personal utility system
- **JSON-compatible values**: All stored as TEXT to support complex preference objects

### Performance Considerations
- **Indexed lookups**: Fast retrieval of active tools by category and order
- **Minimal joins**: Direct preference lookups without complex relationships
- **SQLite optimization**: Schema designed for SQLite's strengths with simple data types