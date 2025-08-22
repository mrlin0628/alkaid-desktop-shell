<script lang="ts">
  import { onMount } from 'svelte';
  import { toolRegistry, getVisibleTools } from '$lib/stores/toolRegistry';
  import { runningTools, addRunningTool, isToolRunning } from '$lib/stores/runningTools';
  import type { Tool } from '$lib/types';
  import { windowManager } from '$lib/stores/windowManager';
  import * as lucideIcons from 'lucide-svelte';
  
  // Props
  interface Props {
    columns?: number;
    showLabels?: boolean;
    className?: string;
  }
  
  let { columns = 4, showLabels = true, className = '' }: Props = $props();
  
  // State
  let tools: Tool[] = $state([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  
  // Reactive values
  let gridColumns = $derived(`grid-cols-${columns}`);
  
  // Load tools on mount
  onMount(async () => {
    try {
      await loadTools();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load tools';
      console.error('Failed to load tools:', err);
    } finally {
      loading = false;
    }
  });
  
  // Load tools from API or store
  async function loadTools() {
    try {
      const response = await fetch('/api/tools');
      if (response.ok) {
        const data = await response.json();
        tools = data.data || [];
      } else {
        // Fallback to store if API fails
        tools = getVisibleTools();
      }
    } catch (err) {
      // Fallback to store if API fails
      tools = getVisibleTools();
    }
  }
  
  // Launch a tool
  async function launchTool(tool: Tool) {
    try {
      // Check if tool is already running
      if (isToolRunning(tool.id)) {
        // Bring existing window to front
        const runningTool = $runningTools.find(rt => rt.toolId === tool.id);
        if (runningTool) {
          windowManager.bringToFront(runningTool.windowId);
        }
        return;
      }
      
      // Create new window
      const windowId = `window-${tool.id}-${Date.now()}`;
      
      const windowState = {
        id: windowId,
        title: tool.name,
        x: 100 + Math.random() * 200, // Random positioning
        y: 100 + Math.random() * 200,
        width: 800,
        height: 600,
        zIndex: 100,
        isMinimized: false,
        isMaximized: false,
        isVisible: true,
        originalX: 100,
        originalY: 100,
        originalWidth: 800,
        originalHeight: 600,
        content: {
          type: tool.type,
          source: tool.source
        }
      };
      
      // Add to window manager
      windowManager.addWindow(windowState);
      
      // Track as running tool
      addRunningTool(tool.id, windowId);
      
      // Launch animation
      const button = document.querySelector(`[data-tool-id="${tool.id}"]`);
      if (button) {
        button.classList.add('tool-launching');
        setTimeout(() => {
          button?.classList.remove('tool-launching');
        }, 300);
      }
    } catch (err) {
      console.error('Failed to launch tool:', err);
      error = `Failed to launch ${tool.name}`;
      setTimeout(() => { error = null; }, 3000);
    }
  }
  
  // Get icon component
  function getIconComponent(iconName: string) {
    // Map common icon names to lucide icons
    const iconMap: { [key: string]: any } = {
      'folder': lucideIcons.Folder,
      'terminal': lucideIcons.Terminal,
      'calculator': lucideIcons.Calculator,
      'file-text': lucideIcons.FileText,
      'settings': lucideIcons.Settings,
      'home': lucideIcons.Home,
      'search': lucideIcons.Search,
      'download': lucideIcons.Download,
      'upload': lucideIcons.Upload,
      'user': lucideIcons.User,
      'mail': lucideIcons.Mail,
      'calendar': lucideIcons.Calendar,
      'clock': lucideIcons.Clock,
      'camera': lucideIcons.Camera,
      'music': lucideIcons.Music,
      'video': lucideIcons.Video,
      'image': lucideIcons.Image,
      'book': lucideIcons.Book,
      'bookmark': lucideIcons.Bookmark,
      'star': lucideIcons.Star,
      'heart': lucideIcons.Heart,
      'tool': lucideIcons.Wrench,
      'code': lucideIcons.Code,
      'database': lucideIcons.Database,
      'globe': lucideIcons.Globe,
      'wifi': lucideIcons.Wifi,
      'monitor': lucideIcons.Monitor
    };
    
    return iconMap[iconName] || lucideIcons.Package;
  }
</script>

<!-- Tool Launcher Component -->
<div class="tool-launcher {className}" role="toolbar" aria-label="Tool Launcher">
  {#if loading}
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">Loading tools...</p>
    </div>
  {:else if error}
    <div class="error-container">
      <lucideIcons.AlertCircle class="error-icon" />
      <p class="error-text">{error}</p>
      <button class="retry-button" on:click={loadTools}>
        <lucideIcons.RefreshCw class="retry-icon" />
        Retry
      </button>
    </div>
  {:else if tools.length === 0}
    <div class="empty-container">
      <lucideIcons.Inbox class="empty-icon" />
      <p class="empty-text">No tools available</p>
    </div>
  {:else}
    <div class="tools-grid {gridColumns}">
      {#each tools as tool (tool.id)}
        {@const IconComponent = getIconComponent(tool.icon || 'tool')}
        {@const isRunning = isToolRunning(tool.id)}
        
        <button
          class="tool-button"
          class:running={isRunning}
          data-tool-id={tool.id}
          on:click={() => launchTool(tool)}
          title={tool.description || tool.name}
          aria-label="Launch {tool.name}"
        >
          <div class="tool-icon-container">
            <svelte:component this={IconComponent} class="tool-icon" size={24} />
            {#if isRunning}
              <div class="running-indicator" aria-label="Running"></div>
            {/if}
          </div>
          
          {#if showLabels}
            <span class="tool-label">{tool.name}</span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .tool-launcher {
    @apply p-4;
  }
  
  /* Loading State */
  .loading-container {
    @apply flex flex-col items-center justify-center py-8 space-y-4;
  }
  
  .loading-spinner {
    @apply w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin;
  }
  
  .loading-text {
    @apply text-cyan-400 text-sm font-medium;
  }
  
  /* Error State */
  .error-container {
    @apply flex flex-col items-center justify-center py-8 space-y-4;
  }
  
  .error-icon {
    @apply w-8 h-8 text-red-400;
  }
  
  .error-text {
    @apply text-red-400 text-sm font-medium text-center;
  }
  
  .retry-button {
    @apply flex items-center space-x-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 
           border border-red-500/30 rounded-lg text-red-400 text-sm font-medium
           transition-colors duration-200;
  }
  
  .retry-icon {
    @apply w-4 h-4;
  }
  
  /* Empty State */
  .empty-container {
    @apply flex flex-col items-center justify-center py-8 space-y-4;
  }
  
  .empty-icon {
    @apply w-8 h-8 text-gray-500;
  }
  
  .empty-text {
    @apply text-gray-500 text-sm font-medium;
  }
  
  /* Tools Grid */
  .tools-grid {
    @apply grid gap-4;
  }
  
  /* Tool Button */
  .tool-button {
    @apply flex flex-col items-center justify-center p-4 rounded-xl
           bg-gray-900/50 hover:bg-gray-800/60 
           border border-gray-700/50 hover:border-cyan-500/50
           backdrop-blur-sm
           transition-all duration-300 ease-in-out
           transform hover:scale-105 active:scale-95
           focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-gray-900
           group;
  }
  
  .tool-button:hover {
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.2), 
                0 0 40px rgba(0, 255, 255, 0.1),
                inset 0 0 20px rgba(0, 255, 255, 0.05);
  }
  
  .tool-button.running {
    @apply border-cyan-400/70 bg-cyan-500/20;
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.3),
                0 0 30px rgba(0, 255, 255, 0.1),
                inset 0 0 15px rgba(0, 255, 255, 0.1);
  }
  
  .tool-button.running:hover {
    box-shadow: 0 0 25px rgba(0, 255, 255, 0.4),
                0 0 50px rgba(0, 255, 255, 0.2),
                inset 0 0 25px rgba(0, 255, 255, 0.1);
  }
  
  /* Tool Icon */
  .tool-icon-container {
    @apply relative mb-2;
  }
  
  .tool-icon {
    @apply text-gray-300 group-hover:text-cyan-400 transition-colors duration-300;
  }
  
  .tool-button.running .tool-icon {
    @apply text-cyan-400;
  }
  
  /* Running Indicator */
  .running-indicator {
    @apply absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full
           animate-pulse shadow-lg;
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.6);
  }
  
  /* Tool Label */
  .tool-label {
    @apply text-sm font-medium text-gray-300 group-hover:text-cyan-400 
           transition-colors duration-300 text-center;
  }
  
  .tool-button.running .tool-label {
    @apply text-cyan-400;
  }
  
  /* Launch Animation */
  :global(.tool-launching) {
    @apply animate-pulse;
    transform: scale(0.95);
    box-shadow: 0 0 30px rgba(0, 255, 255, 0.5),
                0 0 60px rgba(0, 255, 255, 0.3),
                inset 0 0 30px rgba(0, 255, 255, 0.2);
  }
  
  /* Grid Variants */
  .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
  .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
  .grid-cols-6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }
  
  /* Responsive Design */
  @media (max-width: 768px) {
    .tools-grid {
      @apply grid-cols-3 gap-3;
    }
    
    .tool-button {
      @apply p-3;
    }
    
    .tool-label {
      @apply text-xs;
    }
  }
  
  @media (max-width: 480px) {
    .tools-grid {
      @apply grid-cols-2 gap-2;
    }
    
    .tool-button {
      @apply p-2;
    }
  }
</style>