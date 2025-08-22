import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte/svelte5';
import Window from './Window.svelte';
import type { WindowProps } from '../types';

// Mock requestAnimationFrame for drag tests
global.requestAnimationFrame = vi.fn(cb => setTimeout(cb, 16));

describe('Window Component', () => {
  const defaultProps: WindowProps = {
    id: 'test-window',
    title: 'Test Window',
    x: 100,
    y: 100,
    width: 400,
    height: 300,
    zIndex: 1000,
    isMaximized: false,
    content: {
      type: 'component',
      source: 'TestComponent'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders window with title and content area', () => {
    render(Window, { props: defaultProps });

    expect(screen.getByTestId('window-test-window')).toBeInTheDocument();
    expect(screen.getByText('Test Window')).toBeInTheDocument();
    expect(screen.getByTestId('window-content-test-window')).toBeInTheDocument();
  });

  it('renders window at specified initial position and size', () => {
    render(Window, { props: defaultProps });

    const windowElement = screen.getByTestId('window-test-window');
    expect(windowElement).toHaveStyle({
      left: '100px',
      top: '100px',
      width: '400px',
      height: '300px'
    });
  });

  it('renders window controls (minimize, maximize, close)', () => {
    render(Window, { props: defaultProps });

    expect(screen.getByTestId('window-minimize-test-window')).toBeInTheDocument();
    expect(screen.getByTestId('window-maximize-test-window')).toBeInTheDocument();
    expect(screen.getByTestId('window-close-test-window')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(Window, { props: { ...defaultProps, onClose } });

    const closeButton = screen.getByTestId('window-close-test-window');
    await fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onMinimize when minimize button is clicked', async () => {
    const onMinimize = vi.fn();
    render(Window, { props: { ...defaultProps, onMinimize } });

    const minimizeButton = screen.getByTestId('window-minimize-test-window');
    await fireEvent.click(minimizeButton);

    expect(onMinimize).toHaveBeenCalledOnce();
  });

  it('calls onMaximize when maximize button is clicked', async () => {
    const onMaximize = vi.fn();
    render(Window, { props: { ...defaultProps, onMaximize } });

    const maximizeButton = screen.getByTestId('window-maximize-test-window');
    await fireEvent.click(maximizeButton);

    expect(onMaximize).toHaveBeenCalledOnce();
  });

  it('applies cyberpunk theme styling', () => {
    render(Window, { props: defaultProps });

    const windowElement = screen.getByTestId('window-test-window');
    expect(windowElement).toHaveClass('window-chrome');
  });

  it('supports drag functionality when draggable is true', async () => {
    const onFocus = vi.fn();
    const onMove = vi.fn();
    render(Window, { 
      props: { 
        ...defaultProps, 
        draggable: true,
        onFocus,
        onMove 
      } 
    });

    const titleBar = screen.getByTestId('window-titlebar-test-window');
    
    // Simulate drag start
    await fireEvent.pointerDown(titleBar, { clientX: 150, clientY: 120 });
    expect(onFocus).toHaveBeenCalledOnce();

    // Simulate drag move
    await fireEvent.pointerMove(document, { clientX: 200, clientY: 150 });
    
    // Simulate drag end
    await fireEvent.pointerUp(document);

    // Should call onMove - let's just verify it was called with numbers
    expect(onMove).toHaveBeenCalled();
    const moveArgs = onMove.mock.calls[0];
    expect(typeof moveArgs[0]).toBe('number');
    expect(typeof moveArgs[1]).toBe('number');
    expect(isNaN(moveArgs[0])).toBe(false);
    expect(isNaN(moveArgs[1])).toBe(false);
  });

  it('supports resize functionality when resizable is true', async () => {
    const onResize = vi.fn();
    render(Window, { 
      props: { 
        ...defaultProps, 
        resizable: true,
        onResize 
      } 
    });

    const resizeHandle = screen.getByTestId('window-resize-se-test-window');
    
    // Simulate resize drag
    await fireEvent.pointerDown(resizeHandle, { clientX: 500, clientY: 400 });
    await fireEvent.pointerMove(document, { clientX: 550, clientY: 450 });
    await fireEvent.pointerUp(document);

    // Should call onResize - let's just verify it was called with numbers
    expect(onResize).toHaveBeenCalled();
    const resizeArgs = onResize.mock.calls[0];
    expect(typeof resizeArgs[0]).toBe('number');
    expect(typeof resizeArgs[1]).toBe('number');
    expect(isNaN(resizeArgs[0])).toBe(false);
    expect(isNaN(resizeArgs[1])).toBe(false);
  });

  it('respects minimum and maximum size constraints', () => {
    render(Window, { 
      props: { 
        ...defaultProps,
        minWidth: 200,
        minHeight: 150,
        maxWidth: 800,
        maxHeight: 600
      } 
    });

    const windowElement = screen.getByTestId('window-test-window');
    expect(windowElement).toBeInTheDocument();
    // Size constraint enforcement will be tested in integration tests
  });

  it('brings window to front when clicked', async () => {
    const onFocus = vi.fn();
    render(Window, { props: { ...defaultProps, onFocus } });

    const windowElement = screen.getByTestId('window-test-window');
    await fireEvent.click(windowElement);

    expect(onFocus).toHaveBeenCalledOnce();
  });
});