import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte/svelte5';
import ToolContent from './ToolContent.svelte';
import type { Tool } from '../types';

describe('ToolContent Component - Basic Tests', () => {
  const iframeTool: Tool = {
    id: 'external-tool',
    name: 'External Tool',
    icon: 'globe',
    type: 'iframe',
    source: 'https://example.com/tool',
    category: 'external'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Iframe Rendering', () => {
    it('renders iframe for iframe-type tools', () => {
      render(ToolContent, { props: { tool: iframeTool, windowId: 'window-1' } });

      const iframe = screen.getByTestId('tool-content-iframe') as HTMLIFrameElement;
      expect(iframe).toBeInTheDocument();
      expect(iframe.src).toBe('https://example.com/tool');
      expect(iframe).toHaveAttribute('data-tool-id', 'external-tool');
    });

    it('applies security sandbox attributes to iframes', () => {
      render(ToolContent, { props: { tool: iframeTool, windowId: 'window-2' } });

      const iframe = screen.getByTestId('tool-content-iframe') as HTMLIFrameElement;
      expect(iframe.sandbox.contains('allow-scripts')).toBe(true);
      expect(iframe.sandbox.contains('allow-same-origin')).toBe(true);
      expect(iframe.sandbox.contains('allow-forms')).toBe(true);
      expect(iframe.sandbox.contains('allow-popups')).toBe(true);
    });

    it('sets proper iframe attributes for security and functionality', () => {
      render(ToolContent, { props: { tool: iframeTool, windowId: 'window-3' } });

      const iframe = screen.getByTestId('tool-content-iframe') as HTMLIFrameElement;
      expect(iframe).toHaveAttribute('loading', 'lazy');
      expect(iframe).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      expect(iframe).toHaveStyle({ width: '100%', height: '100%' });
    });
  });

  describe('Loading States', () => {
    it('shows iframe loading overlay initially', () => {
      render(ToolContent, { props: { tool: iframeTool, windowId: 'window-4' } });

      expect(screen.getByTestId('iframe-loading-overlay')).toBeInTheDocument();
      expect(screen.getByText('Loading External Tool...')).toBeInTheDocument();
    });
  });

  describe('Content Type Detection', () => {
    it('correctly identifies iframe types', () => {
      render(ToolContent, { props: { tool: iframeTool, windowId: 'window-5' } });

      expect(screen.getByTestId('tool-content-iframe')).toBeInTheDocument();
      expect(screen.queryByTestId('tool-content-component')).not.toBeInTheDocument();
    });

    it('handles unknown content types gracefully', () => {
      const unknownTool = {
        ...iframeTool,
        type: 'unknown' as any
      };

      render(ToolContent, { props: { tool: unknownTool, windowId: 'window-6' } });

      expect(screen.getByTestId('tool-content-error')).toBeInTheDocument();
      expect(screen.getByText('Unsupported tool type: unknown')).toBeInTheDocument();
    });
  });

  describe('Performance and Memory Management', () => {
    it('sets iframe loading to lazy', () => {
      render(ToolContent, { props: { tool: iframeTool, windowId: 'window-7' } });

      const iframe = screen.getByTestId('tool-content-iframe');
      expect(iframe).toHaveAttribute('loading', 'lazy');
    });

    it('provides cleanup mechanism for component unmount', () => {
      const { unmount } = render(ToolContent, { props: { tool: iframeTool, windowId: 'window-8' } });

      expect(() => unmount()).not.toThrow();
    });
  });
});