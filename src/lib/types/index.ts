export interface BackgroundPreferences {
  type: 'color' | 'video';
  source: string;
  color: string;
  opacity: number;
}

export interface DesktopProps {
  backgroundType?: 'color' | 'video';
  backgroundSource?: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  fallbackBackground?: string;
}

export interface WindowState {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  isMinimized: boolean;
  isMaximized: boolean;
  isVisible: boolean;
  // Store original position/size for restore
  originalX: number;
  originalY: number;
  originalWidth: number;
  originalHeight: number;
  content: {
    type: 'component' | 'iframe';
    source: string;
  };
  tool?: Tool;
}

export interface WindowProps {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  isMaximized: boolean;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  resizable?: boolean;
  draggable?: boolean;
  content: {
    type: 'component' | 'iframe';
    source: string;
  };
  tool?: Tool;
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onFocus?: () => void;
  onMove?: (x: number, y: number) => void;
  onResize?: (width: number, height: number) => void;
}

export interface Tool {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  type: 'component' | 'iframe';
  source: string;
  category?: string;
  defaultWidth?: number;
  defaultHeight?: number;
  isActive?: boolean;
  hidden?: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
  // Runtime properties
  windowId?: string;
  isMinimized?: boolean;
  isVisible?: boolean;
}

export type ToolRegistry = Map<string, Tool>;

export interface UserPreference {
  id?: number;
  userId: string;
  preferenceKey: string;
  preferenceValue: string;
  createdAt?: string;
  updatedAt?: string;
}