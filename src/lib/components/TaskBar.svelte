<script lang="ts">
  import { windows, restoreWindow } from '../stores/windowManager';
  import { minimizedTools, updateRunningToolState } from '../stores/runningTools';
  import { toolRegistry } from '../stores/toolRegistry';
  import * as lucideIcons from 'lucide-svelte';
  import type { Tool } from '../types';

  $: minimizedWindows = $windows.filter(w => w.isMinimized);
  $: minimizedToolsList = $minimizedTools;

  function handleRestoreWindow(windowId: string) {
    restoreWindow(windowId);
    
    // Update running tool state
    const tool = minimizedToolsList.find(t => t.windowId === windowId);
    if (tool) {
      updateRunningToolState(tool.toolId, { isMinimized: false });
    }
  }

  function getToolInfo(toolId: string): Tool | null {
    let tool: Tool | null = null;
    toolRegistry.subscribe(registry => {
      tool = registry.get(toolId) || null;
    })();
    return tool;
  }

  function getIconComponent(iconName: string) {
    const iconMap: { [key: string]: any } = {
      'folder': lucideIcons.Folder,
      'terminal': lucideIcons.Terminal,
      'calculator': lucideIcons.Calculator,
      'file-text': lucideIcons.FileText,
      'settings': lucideIcons.Settings,
      'tool': lucideIcons.Wrench
    };
    
    return iconMap[iconName] || lucideIcons.Package;
  }
</script>

{#if minimizedWindows.length > 0}
  <div class="taskbar fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
    <div class="taskbar-container">
      {#each minimizedWindows as window (window.id)}
        {@const runningTool = minimizedToolsList.find(t => t.windowId === window.id)}
        {@const toolInfo = runningTool ? getToolInfo(runningTool.toolId) : null}
        {@const IconComponent = toolInfo ? getIconComponent(toolInfo.icon || 'tool') : lucideIcons.Package}
        
        <button
          class="taskbar-item"
          onclick={() => handleRestoreWindow(window.id)}
          title="Restore {window.title}{toolInfo ? ` (${toolInfo.description || 'Tool'})` : ''}"
          aria-label="Restore {window.title}"
        >
          <div class="taskbar-item-content">
            <!-- Tool Icon -->
            <div class="tool-icon-container">
              <svelte:component this={IconComponent} class="tool-icon" size={16} />
              <div class="running-indicator" aria-label="Running"></div>
            </div>
            
            <!-- Tool Name -->
            <span class="tool-name">{window.title}</span>
            
            <!-- Status Indicator -->
            <div class="status-indicator">
              <div class="pulse-dot"></div>
            </div>
          </div>
        </button>
      {/each}
    </div>
  </div>
{/if}

<style>
  /* Taskbar Container */
  .taskbar-container {
    @apply flex gap-3 px-4 py-3 
           bg-gray-900/90 border border-cyan-500/30 rounded-xl
           backdrop-blur-sm shadow-xl;
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.1),
                0 0 40px rgba(0, 255, 255, 0.05),
                inset 0 1px 0 rgba(0, 255, 255, 0.1);
  }

  /* Taskbar Item */
  .taskbar-item {
    @apply relative flex items-center justify-center
           min-w-[120px] max-w-[200px] px-3 py-2
           bg-gray-800/50 hover:bg-cyan-500/20
           border border-gray-700/50 hover:border-cyan-400/50
           rounded-lg backdrop-blur-sm
           transition-all duration-300 ease-in-out
           transform hover:scale-105 active:scale-95
           focus:outline-none focus:ring-2 focus:ring-cyan-500/50;
  }

  .taskbar-item:hover {
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.2),
                0 0 30px rgba(0, 255, 255, 0.1),
                inset 0 0 15px rgba(0, 255, 255, 0.05);
  }

  /* Taskbar Item Content */
  .taskbar-item-content {
    @apply flex items-center gap-3 w-full;
  }

  /* Tool Icon Container */
  .tool-icon-container {
    @apply relative flex-shrink-0;
  }

  .tool-icon {
    @apply text-cyan-400;
  }

  /* Running Indicator */
  .running-indicator {
    @apply absolute -top-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full
           animate-pulse shadow-sm;
    box-shadow: 0 0 8px rgba(0, 255, 255, 0.6);
  }

  /* Tool Name */
  .tool-name {
    @apply flex-1 text-sm font-medium text-gray-300 
           truncate min-w-0;
  }

  .taskbar-item:hover .tool-name {
    @apply text-cyan-300;
  }

  /* Status Indicator */
  .status-indicator {
    @apply flex-shrink-0;
  }

  .pulse-dot {
    @apply w-2 h-2 bg-cyan-400 rounded-full animate-pulse;
    box-shadow: 0 0 6px rgba(0, 255, 255, 0.5);
  }

  /* Animations */
  @keyframes pulse-glow {
    0%, 100% {
      opacity: 1;
      box-shadow: 0 0 6px rgba(0, 255, 255, 0.5);
    }
    50% {
      opacity: 0.7;
      box-shadow: 0 0 12px rgba(0, 255, 255, 0.8);
    }
  }

  .animate-pulse-glow {
    animation: pulse-glow 2s ease-in-out infinite;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .taskbar-container {
      @apply px-2 py-2 gap-2;
    }

    .taskbar-item {
      @apply min-w-[80px] max-w-[120px] px-2;
    }

    .tool-name {
      @apply text-xs;
    }
  }

  @media (max-width: 480px) {
    .taskbar-container {
      @apply flex-wrap justify-center max-w-[90vw];
    }

    .taskbar-item {
      @apply min-w-[60px] max-w-[80px];
    }

    .tool-name {
      @apply hidden;
    }
  }
</style>