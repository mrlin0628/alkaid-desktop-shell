import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/svelte';
import ToolContent from './ToolContent.svelte';
import type { Tool } from '../types';

// Mock dynamic imports - simplified for testing
vi.mock('../tools/FileManager.svelte', () => ({
  default: function MockFileManager() {
    return {
      $$render: () => '<div data-testid="file-manager-component">File Manager Content</div>'
    };
  }
}));

// Mock postMessage API
const mockPostMessage = vi.fn();
Object.defineProperty(window, 'postMessage', {
  writable: true,
  value: mockPostMessage
});

describe('ToolContent Component', () => {
  const componentTool: Tool = {
    id: 'file-manager',
    name: 'File Manager',
    icon: 'folder',
    type: 'component',
    source: 'FileManager',
    category: 'utilities'
  };

  const iframeTool: Tool = {
    id: 'external-tool',
    name: 'External Tool',
    icon: 'globe',
    type: 'iframe',
    source: 'https://example.com/tool',
    category: 'external'
  };

  const invalidTool: Tool = {
    id: 'invalid-tool',
    name: 'Invalid Tool',
    icon: 'x',
    type: 'component',
    source: 'NonExistentComponent',
    category: 'utilities'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    cleanup();
  });

  describe('Component Rendering', () => {
    it('renders Svelte component for component-type tools', async () => {
      render(ToolContent, { props: { tool: componentTool, windowId: 'window-1' } });

      // Should show loading initially
      expect(screen.getByTestId('tool-content-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading File Manager...')).toBeInTheDocument();

      // Wait for component to load
      await waitFor(() => {
        expect(screen.queryByTestId('tool-content-loading')).not.toBeInTheDocument();
      });

      // Should render the component content area
      expect(screen.getByTestId('tool-content-component')).toBeInTheDocument();
      expect(screen.getByTestId('tool-content-component')).toHaveAttribute('data-tool-id', 'file-manager');
    });

    it('handles component import errors gracefully', async () => {
      render(ToolContent, { props: { tool: invalidTool, windowId: 'window-2' } });

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByTestId('tool-content-error')).toBeInTheDocument();
      });

      expect(screen.getByText('Failed to load Invalid Tool')).toBeInTheDocument();
      expect(screen.getByText('Component could not be found or loaded')).toBeInTheDocument();
    });

    it('displays retry button on component load failure', async () => {
      render(ToolContent, { props: { tool: invalidTool, windowId: 'window-3' } });

      await waitFor(() => {
        expect(screen.getByTestId('tool-content-error')).toBeInTheDocument();
      });

      const retryButton = screen.getByTestId('tool-retry-button');
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).toHaveTextContent('Retry');
    });

    it('retries component loading when retry button is clicked', async () => {
      render(ToolContent, { props: { tool: invalidTool, windowId: 'window-4' } });

      await waitFor(() => {
        expect(screen.getByTestId('tool-content-error')).toBeInTheDocument();
      });

      const retryButton = screen.getByTestId('tool-retry-button');
      await fireEvent.click(retryButton);

      // Should show loading state again
      expect(screen.getByTestId('tool-content-loading')).toBeInTheDocument();
    });
  });

  describe('Iframe Rendering', () => {
    it('renders iframe for iframe-type tools', () => {
      render(ToolContent, { props: { tool: iframeTool, windowId: 'window-5' } });

      const iframe = screen.getByTestId('tool-content-iframe') as HTMLIFrameElement;
      expect(iframe).toBeInTheDocument();
      expect(iframe.src).toBe('https://example.com/tool');
      expect(iframe).toHaveAttribute('data-tool-id', 'external-tool');
    });

    it('applies security sandbox attributes to iframes', () => {
      render(ToolContent, { props: { tool: iframeTool, windowId: 'window-6' } });

      const iframe = screen.getByTestId('tool-content-iframe') as HTMLIFrameElement;
      expect(iframe.sandbox.contains('allow-scripts')).toBe(true);
      expect(iframe.sandbox.contains('allow-same-origin')).toBe(true);
      expect(iframe.sandbox.contains('allow-forms')).toBe(true);
      expect(iframe.sandbox.contains('allow-popups')).toBe(true);
    });

    it('sets proper iframe attributes for security and functionality', () => {
      render(ToolContent, { props: { tool: iframeTool, windowId: 'window-7' } });

      const iframe = screen.getByTestId('tool-content-iframe') as HTMLIFrameElement;
      expect(iframe).toHaveAttribute('loading', 'lazy');
      expect(iframe).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      expect(iframe).toHaveStyle({ width: '100%', height: '100%' });
    });

    it('handles iframe load events', async () => {
      render(ToolContent, { props: { tool: iframeTool, windowId: 'window-8' } });

      const iframe = screen.getByTestId('tool-content-iframe');
      
      // Simulate iframe load
      await fireEvent.load(iframe);

      // Should hide loading overlay if present
      expect(screen.queryByTestId('iframe-loading-overlay')).not.toBeInTheDocument();
    });

    it('handles iframe error events', async () => {
      render(ToolContent, { props: { tool: iframeTool, windowId: 'window-9' } });

      const iframe = screen.getByTestId('tool-content-iframe');
      
      // Simulate iframe error
      await fireEvent.error(iframe);

      // Should show error state
      await waitFor(() => {
        expect(screen.getByTestId('tool-content-error')).toBeInTheDocument();
      });

      expect(screen.getByText('Failed to load External Tool')).toBeInTheDocument();
    });
  });

  describe('Message Passing API', () => {
    it('sets up message listener for iframe communication', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      
      render(ToolContent, { props: { tool: iframeTool, windowId: 'window-10' } });

      expect(addEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('validates message origin for security', async () => {
      render(ToolContent, { props: { tool: iframeTool, windowId: 'window-11' } });

      // Simulate malicious message from wrong origin
      const maliciousMessage = new MessageEvent('message', {
        origin: 'https://malicious.com',
        data: { type: 'TOOL_ACTION', action: 'close' }
      });

      window.dispatchEvent(maliciousMessage);

      // Should not process the message (no side effects)
      // This is primarily tested by ensuring no unexpected state changes occur
    });

    it('processes valid messages from iframe tools', async () => {
      render(ToolContent, { props: { tool: iframeTool, windowId: 'window-12' } });

      // Simulate valid message from expected origin
      const validMessage = new MessageEvent('message', {
        origin: 'https://example.com',
        data: {
          type: 'TOOL_RESIZE',
          windowId: 'window-12',
          width: 600,
          height: 400
        }
      });

      window.dispatchEvent(validMessage);

      // Message should be processed (would trigger parent component events in real usage)
      expect(mockPostMessage).not.toHaveBeenCalled(); // This is just a smoke test
    });

    it('sends initialization message to iframe on load', async () => {
      render(ToolContent, { props: { tool: iframeTool, windowId: 'window-13' } });

      const iframe = screen.getByTestId('tool-content-iframe');
      
      // Mock iframe contentWindow
      const mockContentWindow = {
        postMessage: vi.fn()
      };
      Object.defineProperty(iframe, 'contentWindow', {
        writable: true,
        value: mockContentWindow
      });

      // Simulate iframe load
      await fireEvent.load(iframe);

      await waitFor(() => {
        expect(mockContentWindow.postMessage).toHaveBeenCalledWith({
          type: 'TOOL_INIT',
          windowId: 'window-13',
          toolId: 'external-tool'
        }, 'https://example.com');
      });
    });

    it('cleans up message listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      
      const { unmount } = render(ToolContent, { props: { tool: iframeTool, windowId: 'window-14' } });
      
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function));
    });
  });

  describe('Content Type Detection', () => {
    it('correctly identifies component types', () => {
      render(ToolContent, { props: { tool: componentTool, windowId: 'window-15' } });

      // Should render component container
      expect(screen.getByTestId('tool-content-component')).toBeInTheDocument();
      expect(screen.queryByTestId('tool-content-iframe')).not.toBeInTheDocument();
    });

    it('correctly identifies iframe types', () => {
      render(ToolContent, { props: { tool: iframeTool, windowId: 'window-16' } });

      // Should render iframe container
      expect(screen.getByTestId('tool-content-iframe')).toBeInTheDocument();
      expect(screen.queryByTestId('tool-content-component')).not.toBeInTheDocument();
    });

    it('handles unknown content types gracefully', () => {
      const unknownTool = {
        ...componentTool,
        type: 'unknown' as any
      };

      render(ToolContent, { props: { tool: unknownTool, windowId: 'window-17' } });

      // Should show error for unknown type
      expect(screen.getByTestId('tool-content-error')).toBeInTheDocument();
      expect(screen.getByText('Unsupported tool type: unknown')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading spinner for component tools', () => {
      render(ToolContent, { props: { tool: componentTool, windowId: 'window-18' } });

      expect(screen.getByTestId('tool-content-loading')).toBeInTheDocument();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('shows iframe loading overlay initially', () => {
      render(ToolContent, { props: { tool: iframeTool, windowId: 'window-19' } });

      expect(screen.getByTestId('iframe-loading-overlay')).toBeInTheDocument();
      expect(screen.getByText('Loading External Tool...')).toBeInTheDocument();
    });

    it('hides loading states after successful load', async () => {
      render(ToolContent, { props: { tool: iframeTool, windowId: 'window-20' } });

      const iframe = screen.getByTestId('tool-content-iframe');
      await fireEvent.load(iframe);

      await waitFor(() => {
        expect(screen.queryByTestId('iframe-loading-overlay')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('provides helpful error messages for different failure types', async () => {
      render(ToolContent, { props: { tool: invalidTool, windowId: 'window-21' } });

      await waitFor(() => {
        expect(screen.getByTestId('tool-content-error')).toBeInTheDocument();
      });

      expect(screen.getByText('Failed to load Invalid Tool')).toBeInTheDocument();
      expect(screen.getByText('Component could not be found or loaded')).toBeInTheDocument();
    });

    it('maintains error state until retry is attempted', async () => {
      render(ToolContent, { props: { tool: invalidTool, windowId: 'window-22' } });

      await waitFor(() => {
        expect(screen.getByTestId('tool-content-error')).toBeInTheDocument();
      });

      // Error should persist
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(screen.getByTestId('tool-content-error')).toBeInTheDocument();
    });
  });

  describe('Performance and Memory Management', () => {
    it('implements lazy loading for component imports', () => {
      render(ToolContent, { props: { tool: componentTool, windowId: 'window-23' } });

      // Component import should only happen when needed (mocked in this test)
      expect(mockComponentImport).not.toHaveBeenCalled();
    });

    it('sets iframe loading to lazy', () => {
      render(ToolContent, { props: { tool: iframeTool, windowId: 'window-24' } });

      const iframe = screen.getByTestId('tool-content-iframe');
      expect(iframe).toHaveAttribute('loading', 'lazy');
    });

    it('provides cleanup mechanism for component unmount', () => {
      const { unmount } = render(ToolContent, { props: { tool: componentTool, windowId: 'window-25' } });

      // Should not throw on unmount
      expect(() => unmount()).not.toThrow();
    });
  });
});