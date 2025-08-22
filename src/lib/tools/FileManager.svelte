<script lang="ts">
  import { onMount } from 'svelte';
  import { Folder, File, Upload, Download, Trash2, RefreshCw } from 'lucide-svelte';
  import type { Tool } from '../types';

  let { windowId, tool }: { windowId: string; tool: Tool } = $props();
  
  let current_path = $state('/');
  let files = $state<any[]>([
    { name: 'Documents', type: 'folder', size: null, modified: '2024-01-15' },
    { name: 'Downloads', type: 'folder', size: null, modified: '2024-01-14' },
    { name: 'Pictures', type: 'folder', size: null, modified: '2024-01-13' },
    { name: 'config.json', type: 'file', size: '2.4 KB', modified: '2024-01-12' },
    { name: 'readme.txt', type: 'file', size: '1.2 KB', modified: '2024-01-11' }
  ]);
  let is_loading = $state(false);

  const refresh_files = async () => {
    is_loading = true;
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    is_loading = false;
  };

  const navigate_to = (path: string) => {
    current_path = path;
    refresh_files();
  };

  const handle_file_click = (file: any) => {
    if (file.type === 'folder') {
      navigate_to(`${current_path}${file.name}/`.replace('//', '/'));
    } else {
      // Handle file opening logic
      console.log(`Opening file: ${file.name}`);
    }
  };

  onMount(() => {
    refresh_files();
  });
</script>

<div class="flex flex-col h-full bg-gray-900 text-gray-100">
  <!-- Header -->
  <div class="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
    <div class="flex items-center space-x-3">
      <Folder class="h-5 w-5 text-cyan-400" />
      <span class="font-medium text-cyan-300">File Manager</span>
    </div>
    <div class="flex items-center space-x-2">
      <button
        onclick={refresh_files}
        class="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white
               transition-colors duration-200"
        disabled={is_loading}
        data-testid="file-manager-refresh"
      >
        <RefreshCw class="h-4 w-4" class:animate-spin={is_loading} />
      </button>
      <button
        class="p-2 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 hover:text-cyan-300
               border border-cyan-500/30 transition-colors duration-200"
        data-testid="file-manager-upload"
      >
        <Upload class="h-4 w-4" />
      </button>
    </div>
  </div>

  <!-- Path Breadcrumb -->
  <div class="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
    <div class="text-sm text-gray-400">
      <span class="text-cyan-400">Path:</span> {current_path}
    </div>
  </div>

  <!-- File List -->
  <div class="flex-1 overflow-auto p-4">
    {#if is_loading}
      <div class="flex items-center justify-center h-32">
        <div class="flex items-center space-x-3">
          <RefreshCw class="h-6 w-6 animate-spin text-cyan-400" />
          <span class="text-cyan-300">Loading files...</span>
        </div>
      </div>
    {:else}
      <div class="grid gap-2">
        {#each files as file}
          <button
            onclick={() => handle_file_click(file)}
            class="flex items-center space-x-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50
                   border border-gray-700 hover:border-gray-600 text-left w-full
                   transition-all duration-200"
            data-testid="file-item-{file.name}"
          >
            {#if file.type === 'folder'}
              <Folder class="h-5 w-5 text-cyan-400 flex-shrink-0" />
            {:else}
              <File class="h-5 w-5 text-gray-400 flex-shrink-0" />
            {/if}
            
            <div class="flex-1 min-w-0">
              <div class="font-medium text-gray-200 truncate">
                {file.name}
              </div>
              <div class="flex items-center space-x-4 text-sm text-gray-500">
                {#if file.size}
                  <span>{file.size}</span>
                {/if}
                <span>Modified: {file.modified}</span>
              </div>
            </div>

            {#if file.type === 'file'}
              <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  class="p-1 rounded text-gray-500 hover:text-cyan-400"
                  onclick={(e) => { e.stopPropagation(); console.log('Download', file.name); }}
                >
                  <Download class="h-4 w-4" />
                </button>
                <button 
                  class="p-1 rounded text-gray-500 hover:text-red-400"
                  onclick={(e) => { e.stopPropagation(); console.log('Delete', file.name); }}
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Status Bar -->
  <div class="px-4 py-2 bg-gray-800 border-t border-gray-700 text-sm text-gray-400">
    {files.length} items in {current_path}
  </div>
</div>

<style>
  .group:hover .opacity-0 {
    opacity: 1;
  }
</style>