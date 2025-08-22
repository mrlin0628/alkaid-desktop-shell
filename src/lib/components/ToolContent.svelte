<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Tool } from '../types';

  let { tool, windowId }: { tool: Tool; windowId: string } = $props();

  let loading_state = $state<'loading' | 'loaded' | 'error'>('loading');
  let error_message = $state('');
  let component_instance = $state<any>(null);
  let iframe_element = $state<HTMLIFrameElement | null>(null);
  let message_listener: ((event: MessageEvent) => void) | null = null;

  const retry_load = () => {
    loading_state = 'loading';
    error_message = '';
    if (tool.type === 'component') {
      load_component();
    }
  };

  const load_component = async () => {
    try {
      loading_state = 'loading';
      
      const component_module = await import(`../tools/${tool.source}.svelte`);
      component_instance = component_module.default;
      loading_state = 'loaded';
    } catch (error) {
      console.error(`Failed to load component ${tool.source}:`, error);
      loading_state = 'error';
      error_message = 'Component could not be found or loaded';
    }
  };

  const handle_iframe_load = () => {
    loading_state = 'loaded';
    
    if (iframe_element?.contentWindow) {
      const init_message = {
        type: 'TOOL_INIT',
        windowId: windowId,
        toolId: tool.id
      };
      
      try {
        const target_origin = new URL(tool.source).origin;
        iframe_element.contentWindow.postMessage(init_message, target_origin);
      } catch (error) {
        console.error('Failed to send init message to iframe:', error);
      }
    }
  };

  const handle_iframe_error = () => {
    loading_state = 'error';
    error_message = 'Failed to load external tool';
  };

  const setup_message_listener = () => {
    message_listener = (event: MessageEvent) => {
      if (!validate_message_origin(event.origin)) {
        return;
      }

      const { data } = event;
      
      if (data.windowId !== windowId) {
        return;
      }

      handle_iframe_message(data);
    };

    window.addEventListener('message', message_listener);
  };

  const validate_message_origin = (origin: string): boolean => {
    if (tool.type !== 'iframe') {
      return false;
    }

    try {
      const tool_origin = new URL(tool.source).origin;
      return origin === tool_origin;
    } catch {
      return false;
    }
  };

  const handle_iframe_message = (data: any) => {
    switch (data.type) {
      case 'TOOL_RESIZE':
        if (typeof data.width === 'number' && typeof data.height === 'number') {
          // Emit resize event for parent window to handle
          window.dispatchEvent(new CustomEvent('tool-resize', {
            detail: {
              windowId,
              width: data.width,
              height: data.height
            }
          }));
        }
        break;

      case 'TOOL_CLOSE':
        window.dispatchEvent(new CustomEvent('tool-close', {
          detail: { windowId }
        }));
        break;

      case 'TOOL_MINIMIZE':
        window.dispatchEvent(new CustomEvent('tool-minimize', {
          detail: { windowId }
        }));
        break;

      default:
        console.log('Unknown iframe message type:', data.type);
    }
  };

  const cleanup_message_listener = () => {
    if (message_listener) {
      window.removeEventListener('message', message_listener);
      message_listener = null;
    }
  };

  onMount(() => {
    if (tool.type === 'component') {
      load_component();
    } else if (tool.type === 'iframe') {
      setup_message_listener();
      loading_state = 'loading';
    } else {
      loading_state = 'error';
      error_message = `Unsupported tool type: ${tool.type}`;
    }
  });

  onDestroy(() => {
    cleanup_message_listener();
  });
</script>

{#if loading_state === 'loading'}
  <div 
    class="flex items-center justify-center h-full bg-gray-900/50 backdrop-blur-sm"
    data-testid="tool-content-loading"
  >
    <div class="flex flex-col items-center space-y-3">
      <div 
        class="h-8 w-8 animate-spin border-2 border-cyan-400 border-t-transparent rounded-full" 
        data-testid="loading-spinner"
      ></div>
      <p class="text-sm text-cyan-300">Loading {tool.name}...</p>
    </div>
  </div>
{:else if loading_state === 'error'}
  <div 
    class="flex items-center justify-center h-full bg-gray-900/50 backdrop-blur-sm"
    data-testid="tool-content-error"
  >
    <div class="flex flex-col items-center space-y-4 max-w-md text-center">
      <div class="h-12 w-12 text-red-400 flex items-center justify-center text-2xl">⚠</div>
      <div class="space-y-2">
        <h3 class="text-lg font-medium text-red-300">
          Failed to load {tool.name}
        </h3>
        <p class="text-sm text-red-200">
          {error_message}
        </p>
      </div>
      <button
        onclick={retry_load}
        class="flex items-center space-x-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 
               border border-red-500/30 rounded-lg text-red-300 hover:text-red-200
               transition-colors duration-200"
        data-testid="tool-retry-button"
      >
        <span class="text-sm">🔄</span>
        <span>Retry</span>
      </button>
    </div>
  </div>
{:else if tool.type === 'component' && component_instance}
  <div 
    class="h-full w-full overflow-hidden"
    data-testid="tool-content-component"
    data-tool-id={tool.id}
  >
    <svelte:component this={component_instance} {windowId} {tool} />
  </div>
{:else if tool.type === 'iframe'}
  <div class="relative h-full w-full">
    {#if loading_state === 'loading'}
      <div 
        class="absolute inset-0 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm z-10"
        data-testid="iframe-loading-overlay"
      >
        <div class="flex flex-col items-center space-y-3">
          <div class="h-8 w-8 animate-spin border-2 border-cyan-400 border-t-transparent rounded-full"></div>
          <p class="text-sm text-cyan-300">Loading {tool.name}...</p>
        </div>
      </div>
    {/if}
    
    <iframe
      bind:this={iframe_element}
      src={tool.source}
      title={tool.name}
      class="w-full h-full border-none bg-white"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
      loading="lazy"
      referrerpolicy="strict-origin-when-cross-origin"
      onload={handle_iframe_load}
      onerror={handle_iframe_error}
      data-testid="tool-content-iframe"
      data-tool-id={tool.id}
    ></iframe>
  </div>
{/if}

<style>
  .h-full {
    height: 100%;
  }
  
  .w-full {
    width: 100%;
  }
  
  iframe {
    display: block;
  }
</style>