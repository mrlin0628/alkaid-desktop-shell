<script lang="ts">
  import { onMount } from 'svelte';
  import { Minus, Square, X, RotateCcw } from 'lucide-svelte';
  import type { WindowProps } from '../types';
  import ToolContent from './ToolContent.svelte';

  let {
    id,
    title,
    x,
    y,
    width,
    height,
    zIndex,
    isMaximized,
    minWidth = 200,
    minHeight = 150,
    maxWidth = 1200,
    maxHeight = 800,
    resizable = true,
    draggable = true,
    content,
    tool,
    onClose,
    onMinimize,
    onMaximize,
    onFocus,
    onMove,
    onResize
  }: WindowProps = $props();

  // Window state
  let windowElement: HTMLDivElement;

  // Drag state
  let isDragging = $state(false);
  let dragStartX = $state(0);
  let dragStartY = $state(0);
  let dragStartMouseX = $state(0);
  let dragStartMouseY = $state(0);

  // Resize state
  let isResizing = $state(false);
  let resizeHandle = $state('');
  let resizeStartX = $state(0);
  let resizeStartY = $state(0);
  let resizeStartWidth = $state(0);
  let resizeStartHeight = $state(0);
  let resizeStartMouseX = $state(0);
  let resizeStartMouseY = $state(0);

  // Computed styles
  let windowStyle = $derived(`
    left: ${x}px;
    top: ${y}px;
    width: ${width}px;
    height: ${height}px;
    z-index: ${zIndex};
  `);

  function handleWindowClick() {
    if (onFocus) {
      onFocus();
    }
  }

  function handleClose() {
    if (onClose) {
      onClose();
    }
  }

  function handleMinimize() {
    if (onMinimize) {
      onMinimize();
    }
  }

  function handleMaximize() {
    if (onMaximize) {
      onMaximize();
    }
  }

  // Drag functionality
  function handlePointerDown(event: PointerEvent) {
    if (!draggable) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    isDragging = true;
    dragStartX = x;
    dragStartY = y;
    dragStartMouseX = event.clientX;
    dragStartMouseY = event.clientY;

    handleWindowClick();

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  }

  function handlePointerMove(event: PointerEvent) {
    if (isDragging) {
      if (isMaximized) {
        // If dragging while maximized, restore window and adjust position
        const mouseX = event.clientX;
        const mouseY = event.clientY;
        
        // Restore the window first (this will change width/height)
        if (onMaximize) {
          onMaximize(); // This will toggle back to restored state
        }
        
        // After restoration, calculate position based on restored window size
        // Use a reasonable default size for positioning calculation
        const restoredWidth = 400; // Default window width
        const newX = mouseX - (restoredWidth * 0.5); // Center the window under mouse
        const newY = mouseY - 16; // Account for title bar height
        
        // Update position
        if (onMove) {
          onMove(Math.max(0, Math.min(newX, globalThis.innerWidth - restoredWidth)), Math.max(0, newY));
        }
        
        // Update drag start position for continued dragging
        dragStartX = newX;
        dragStartY = newY;
        dragStartMouseX = mouseX;
        dragStartMouseY = mouseY;
      } else {
        // Normal dragging for windowed mode
        const deltaX = event.clientX - dragStartMouseX;
        const deltaY = event.clientY - dragStartMouseY;
        
        const newX = Math.max(0, Math.min(dragStartX + deltaX, globalThis.innerWidth - width));
        const newY = Math.max(0, Math.min(dragStartY + deltaY, globalThis.innerHeight - height));
        
        if (onMove) {
          onMove(newX, newY);
        }
      }
    } else if (isResizing) {
      handleResize(event);
    }
  }

  function handlePointerUp() {
    isDragging = false;
    isResizing = false;
    resizeHandle = '';
    
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', handlePointerUp);
  }

  // Resize functionality
  function handleResizeStart(event: PointerEvent, handle: string) {
    if (!resizable) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    isResizing = true;
    resizeHandle = handle;
    resizeStartX = x;
    resizeStartY = y;
    resizeStartWidth = width;
    resizeStartHeight = height;
    resizeStartMouseX = event.clientX;
    resizeStartMouseY = event.clientY;

    handleWindowClick();

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  }

  function handleResize(event: PointerEvent) {
    const deltaX = event.clientX - resizeStartMouseX;
    const deltaY = event.clientY - resizeStartMouseY;

    let newX = x;
    let newY = y;
    let newWidth = width;
    let newHeight = height;

    switch (resizeHandle) {
      case 'se': // Southeast
        newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStartWidth + deltaX));
        newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStartHeight + deltaY));
        break;
      case 'sw': // Southwest
        const swWidth = resizeStartWidth - deltaX;
        if (swWidth >= minWidth && swWidth <= maxWidth) {
          newWidth = swWidth;
          newX = resizeStartX + deltaX;
        }
        newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStartHeight + deltaY));
        break;
      case 'ne': // Northeast
        newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStartWidth + deltaX));
        const neHeight = resizeStartHeight - deltaY;
        if (neHeight >= minHeight && neHeight <= maxHeight) {
          newHeight = neHeight;
          newY = resizeStartY + deltaY;
        }
        break;
      case 'nw': // Northwest
        const nwWidth = resizeStartWidth - deltaX;
        const nwHeight = resizeStartHeight - deltaY;
        if (nwWidth >= minWidth && nwWidth <= maxWidth) {
          newWidth = nwWidth;
          newX = resizeStartX + deltaX;
        }
        if (nwHeight >= minHeight && nwHeight <= maxHeight) {
          newHeight = nwHeight;
          newY = resizeStartY + deltaY;
        }
        break;
      case 'e': // East
        newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStartWidth + deltaX));
        break;
      case 'w': // West
        const wWidth = resizeStartWidth - deltaX;
        if (wWidth >= minWidth && wWidth <= maxWidth) {
          newWidth = wWidth;
          newX = resizeStartX + deltaX;
        }
        break;
      case 's': // South
        newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStartHeight + deltaY));
        break;
    }

    if (onMove && (newX !== x || newY !== y)) {
      onMove(newX, newY);
    }
    if (onResize && (newWidth !== width || newHeight !== height)) {
      onResize(newWidth, newHeight);
    }
  }

  onMount(() => {
    // Prevent text selection during drag
    document.addEventListener('selectstart', (e) => {
      if (isDragging || isResizing) {
        e.preventDefault();
      }
    });
  });
</script>

<div
  bind:this={windowElement}
  class="window absolute window-chrome border-cyber-blue border rounded-lg overflow-hidden select-none"
  style={windowStyle}
  data-testid="window-{id}"
  onclick={handleWindowClick}
>
  <!-- Title Bar -->
  <div
    class="titlebar flex items-center justify-between px-3 py-2 bg-black bg-opacity-80 border-b border-cyber-blue border-opacity-30 cursor-move"
    data-testid="window-titlebar-{id}"
    onpointerdown={handlePointerDown}
  >
    <span class="text-cyber-blue font-medium text-sm truncate flex-1">{title}</span>
    
    <!-- Window Controls -->
    <div class="flex items-center gap-1 ml-2">
      <button
        class="window-control p-1 rounded hover:bg-cyber-blue hover:bg-opacity-20 transition-colors"
        data-testid="window-minimize-{id}"
        onclick={handleMinimize}
        aria-label="Minimize window"
      >
        <Minus size={14} class="text-cyber-blue" />
      </button>
      
      <button
        class="window-control p-1 rounded hover:bg-cyber-green hover:bg-opacity-20 transition-colors"
        data-testid="window-maximize-{id}"
        onclick={handleMaximize}
        aria-label="Maximize window"
      >
        {#if isMaximized}
          <RotateCcw size={14} class="text-cyber-green" />
        {:else}
          <Square size={14} class="text-cyber-green" />
        {/if}
      </button>
      
      <button
        class="window-control p-1 rounded hover:bg-cyber-pink hover:bg-opacity-20 transition-colors"
        data-testid="window-close-{id}"
        onclick={handleClose}
        aria-label="Close window"
      >
        <X size={14} class="text-cyber-pink" />
      </button>
    </div>
  </div>

  <!-- Content Area -->
  <div
    class="content flex-1 overflow-hidden"
    data-testid="window-content-{id}"
  >
    {#if tool}
      <ToolContent {tool} windowId={id} />
    {:else}
      <!-- Legacy fallback for windows without tool objects -->
      {#if content.type === 'iframe'}
        <iframe
          src={content.source}
          class="w-full h-full border-0"
          title={title}
          sandbox="allow-scripts allow-same-origin allow-forms"
        ></iframe>
      {:else}
        <div class="w-full h-full p-4 text-white">
          <p class="text-cyber-blue">Component: {content.source}</p>
          <p class="text-gray-400 text-sm mt-2">Content placeholder for component rendering</p>
        </div>
      {/if}
    {/if}
  </div>

  <!-- Resize Handles -->
  {#if resizable}
    <!-- Corner handles -->
    <div
      class="resize-handle absolute bottom-0 right-0 w-3 h-3 cursor-se-resize"
      data-testid="window-resize-se-{id}"
      onpointerdown={(e) => handleResizeStart(e, 'se')}
    ></div>
    
    <div
      class="resize-handle absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize"
      data-testid="window-resize-sw-{id}"
      onpointerdown={(e) => handleResizeStart(e, 'sw')}
    ></div>
    
    <div
      class="resize-handle absolute top-8 right-0 w-3 h-3 cursor-ne-resize"
      data-testid="window-resize-ne-{id}"
      onpointerdown={(e) => handleResizeStart(e, 'ne')}
    ></div>
    
    <div
      class="resize-handle absolute top-8 left-0 w-3 h-3 cursor-nw-resize"
      data-testid="window-resize-nw-{id}"
      onpointerdown={(e) => handleResizeStart(e, 'nw')}
    ></div>

    <!-- Edge handles -->
    <div
      class="resize-handle absolute right-0 top-8 bottom-0 w-1 cursor-e-resize"
      data-testid="window-resize-e-{id}"
      onpointerdown={(e) => handleResizeStart(e, 'e')}
    ></div>
    
    <div
      class="resize-handle absolute left-0 top-8 bottom-0 w-1 cursor-w-resize"
      data-testid="window-resize-w-{id}"
      onpointerdown={(e) => handleResizeStart(e, 'w')}
    ></div>
    
    <div
      class="resize-handle absolute bottom-0 left-0 right-0 h-1 cursor-s-resize"
      data-testid="window-resize-s-{id}"
      onpointerdown={(e) => handleResizeStart(e, 's')}
    ></div>
  {/if}
</div>

<style>
  .window {
    user-select: none;
    will-change: transform;
  }

  .titlebar {
    height: 32px;
  }

  .content {
    height: calc(100% - 32px);
  }

  .window-control {
    flex-shrink: 0;
  }

  .resize-handle {
    background: transparent;
  }

  .resize-handle:hover {
    background: rgba(0, 255, 255, 0.1);
  }
</style>