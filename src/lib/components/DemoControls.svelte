<script lang="ts">
  import { backgroundPreferences } from '$lib/stores/backgroundPreferences';
  import { createWindow } from '$lib/stores/windowManager';

  // Demo controls for testing
  let showDemo = $state(false);
  let demoVideoUrl = $state('');

  function toggleDemo() {
    showDemo = !showDemo;
  }

  function setDemoVideo() {
    if (demoVideoUrl) {
      backgroundPreferences.update(prefs => ({
        ...prefs,
        type: 'video',
        source: demoVideoUrl
      }));
    }
  }

  function resetBackground() {
    backgroundPreferences.update(prefs => ({
      ...prefs,
      type: 'color',
      source: '',
      color: '#0a0a0a'
    }));
  }

  // Window demo functions
  function createTestWindow() {
    const windowId = `window-${Date.now()}`;
    createWindow({
      id: windowId,
      title: 'Test Window',
      x: Math.random() * 300 + 50,
      y: Math.random() * 200 + 50,
      width: 400,
      height: 300,
      content: {
        type: 'component',
        source: 'TestComponent'
      }
    });
  }

  function createIframeWindow() {
    const windowId = `iframe-${Date.now()}`;
    createWindow({
      id: windowId,
      title: 'Example Website',
      x: Math.random() * 300 + 100,
      y: Math.random() * 200 + 100,
      width: 600,
      height: 400,
      content: {
        type: 'iframe',
        source: 'https://example.com'
      }
    });
  }
</script>

<div class="absolute top-4 left-4 z-50">
  <button 
    class="px-4 py-2 bg-cyber-blue bg-opacity-20 border border-cyber-blue rounded text-cyber-blue hover:bg-opacity-30 transition-all duration-200"
    onclick={toggleDemo}
  >
    {showDemo ? 'Hide' : 'Show'} Demo Controls
  </button>
</div>

{#if showDemo}
  <div class="absolute top-16 left-4 p-4 bg-black bg-opacity-80 border border-cyber-blue rounded-lg z-50 max-w-sm">
    <h3 class="text-cyber-blue font-semibold mb-3">Alkaid Command Center Demo</h3>
    
    <div class="space-y-3">
      <div>
        <label class="block text-sm text-cyber-blue mb-1">Video URL:</label>
        <input 
          bind:value={demoVideoUrl}
          type="url" 
          placeholder="https://example.com/video.mp4"
          class="w-full px-2 py-1 bg-cyber-dark border border-cyber-blue rounded text-white text-sm"
        />
      </div>
      
      <div class="flex gap-2">
        <button 
          onclick={setDemoVideo}
          class="px-3 py-1 bg-cyber-green bg-opacity-20 border border-cyber-green rounded text-cyber-green hover:bg-opacity-30 text-sm"
        >
          Set Video
        </button>
        <button 
          onclick={resetBackground}
          class="px-3 py-1 bg-cyber-pink bg-opacity-20 border border-cyber-pink rounded text-cyber-pink hover:bg-opacity-30 text-sm"
        >
          Reset
        </button>
      </div>

      <hr class="border-cyber-blue border-opacity-30 my-3">
      
      <!-- Window & Tool Demo Controls -->
      <div>
        <h4 class="text-cyber-green font-semibold mb-2">Tool System Demo</h4>
        <div class="flex gap-2">
          <button 
            onclick={createTestWindow}
            class="px-3 py-1 bg-cyber-green bg-opacity-20 border border-cyber-green rounded text-cyber-green hover:bg-opacity-30 text-sm"
          >
            New Window
          </button>
          <button 
            onclick={createIframeWindow}
            class="px-3 py-1 bg-cyber-purple bg-opacity-20 border border-cyber-purple rounded text-cyber-purple hover:bg-opacity-30 text-sm"
          >
            New iframe
          </button>
        </div>
        <p class="text-xs text-gray-500 mt-2">Tool registry, launcher, and state management systems active</p>
      </div>
      
      <div class="text-xs text-gray-400">
        <p><strong>Current:</strong> {$backgroundPreferences.type}</p>
        {#if $backgroundPreferences.source}
          <p><strong>Source:</strong> {$backgroundPreferences.source}</p>
        {/if}
      </div>
    </div>
  </div>
{/if}
