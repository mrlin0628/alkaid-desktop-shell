<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{
    uploaded: { url: string; filename: string };
    error: { message: string };
  }>();

  let fileInput: HTMLInputElement;
  let uploading = $state(false);
  let dragOver = $state(false);

  async function handleFileSelect(file: File) {
    if (!file) return;

    uploading = true;
    try {
      const formData = new FormData();
      formData.append('video', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        dispatch('uploaded', {
          url: result.url,
          filename: result.filename
        });
      } else {
        dispatch('error', { message: result.error });
      }
    } catch (error) {
      dispatch('error', { message: 'Upload failed. Please try again.' });
    } finally {
      uploading = false;
    }
  }

  function handleInputChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragOver = false;
    
    const file = event.dataTransfer?.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    dragOver = true;
  }

  function handleDragLeave() {
    dragOver = false;
  }
</script>

<div class="video-upload">
  <!-- Hidden file input -->
  <input
    bind:this={fileInput}
    type="file"
    accept="video/mp4,video/webm,video/ogg"
    class="hidden"
    onchange={handleInputChange}
  />

  <!-- Drop zone -->
  <div
    class="upload-zone border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200"
    class:border-cyber-blue={!dragOver}
    class:border-cyber-green={dragOver}
    class:bg-cyber-blue={dragOver}
    class:bg-opacity-10={dragOver}
    ondrop={handleDrop}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
  >
    {#if uploading}
      <div class="text-cyber-blue">
        <div class="animate-spin w-8 h-8 border-2 border-cyber-blue border-t-transparent rounded-full mx-auto mb-2"></div>
        <p>Uploading video...</p>
      </div>
    {:else}
      <div class="text-cyber-blue">
        <svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p class="mb-2">Drag & drop your video here</p>
        <p class="text-sm text-gray-400 mb-4">or</p>
        <button
          class="px-4 py-2 bg-cyber-blue bg-opacity-20 border border-cyber-blue rounded text-cyber-blue hover:bg-opacity-30 transition-all duration-200"
          onclick={() => fileInput.click()}
        >
          Choose Video File
        </button>
        <p class="text-xs text-gray-400 mt-4">
          Supports MP4, WebM, OGG • Max 100MB
        </p>
      </div>
    {/if}
  </div>
</div>

<style>
  .upload-zone {
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>