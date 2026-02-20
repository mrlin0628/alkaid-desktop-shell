<script lang="ts">
  import Window from "./Window.svelte";
  import {
    windows,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    focusWindow,
    updateWindowPosition,
    updateWindowSize,
  } from "../stores/windowManager";

  function handleWindowClose(windowId: string) {
    closeWindow(windowId);
  }

  function handleWindowMinimize(windowId: string) {
    minimizeWindow(windowId);
  }

  function handleWindowMaximize(windowId: string) {
    maximizeWindow(windowId);
  }

  function handleWindowFocus(windowId: string) {
    focusWindow(windowId);
  }

  function handleWindowMove(windowId: string, x: number, y: number) {
    updateWindowPosition(windowId, x, y);
  }

  function handleWindowResize(windowId: string, width: number, height: number) {
    updateWindowSize(windowId, width, height);
  }
</script>

<!-- Render all visible windows -->
{#each $windows as window (window.id)}
  {#if window.isVisible}
    <Window
      id={window.id}
      title={window.title}
      x={window.x}
      y={window.y}
      width={window.width}
      height={window.height}
      zIndex={window.zIndex}
      isMaximized={window.isMaximized}
      content={window.content}
      tool={window.tool}
      onClose={() => handleWindowClose(window.id)}
      onMinimize={() => handleWindowMinimize(window.id)}
      onMaximize={() => handleWindowMaximize(window.id)}
      onFocus={() => handleWindowFocus(window.id)}
      onMove={(x, y) => handleWindowMove(window.id, x, y)}
      onResize={(width, height) => handleWindowResize(window.id, width, height)}
    />
  {/if}
{/each}
