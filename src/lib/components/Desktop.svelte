<script lang="ts">
  import { onMount } from "svelte";
  import type { DesktopProps } from "../types";

  // Props with defaults
  let {
    backgroundType = "color",
    backgroundSource = "",
    backgroundColor = "#0a0a0a",
    backgroundOpacity = 1,
    fallbackBackground = "#0a0a0a",
  }: DesktopProps = $props();

  // Component state
  let videoElement: HTMLVideoElement;
  let containerElement: HTMLDivElement;
  let videoLoadError = $state(false);

  // Reactive computed values
  let shouldShowVideo = $derived(
    backgroundType === "video" && backgroundSource && !videoLoadError,
  );
  let containerStyle = $derived(
    shouldShowVideo
      ? ""
      : (() => {
          // Convert hex to rgba with opacity
          const hex = backgroundColor;
          if (!hex || hex.length !== 7 || !hex.startsWith("#")) {
            console.warn("Invalid hex color:", hex);
            return `background-color: rgba(10, 10, 10, ${backgroundOpacity})`;
          }
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          const style = `background-color: rgba(${r}, ${g}, ${b}, ${backgroundOpacity})`;
          console.log("Desktop style updated:", style);
          return style;
        })(),
  );

  function handleVideoError() {
    console.warn(
      "Video background failed to load, falling back to color background",
    );
    videoLoadError = true;
    if (containerElement) {
      containerElement.style.backgroundColor = fallbackBackground;
    }
  }

  function handleVideoLoad() {
    videoLoadError = false;
    if (videoElement) {
      videoElement.play().catch((error) => {
        console.warn("Video autoplay failed:", error);
        handleVideoError();
      });
    }
  }

  onMount(() => {
    // Apply GPU acceleration hint
    if (videoElement) {
      videoElement.style.willChange = "transform";
    }
  });
</script>

<!-- Desktop Container -->
<div
  bind:this={containerElement}
  class="desktop-container h-screen w-screen overflow-hidden relative bg-cyber-dark"
  style={containerStyle}
  data-testid="desktop-container"
>
  <!-- Video Background -->
  {#if shouldShowVideo}
    <video
      bind:this={videoElement}
      class="absolute inset-0 w-full h-full object-cover z-0"
      src={backgroundSource}
      autoplay
      loop
      muted
      preload="auto"
      style="will-change: transform; opacity: {backgroundOpacity};"
      data-testid="background-video"
      on:error={handleVideoError}
      on:loadeddata={handleVideoLoad}
    >
      <track kind="captions" />
    </video>
  {/if}

  <!-- Desktop Content Layer -->
  <div class="absolute inset-0 z-10">
    <!-- Desktop Content (Icons, etc.) -->
    <div class="absolute inset-0 z-10 pointer-events-none">
      <div class="pointer-events-auto w-full h-full">
        <slot />
      </div>
    </div>
  </div>
</div>

<style>
  .desktop-container {
    user-select: none;
  }

  video {
    pointer-events: none;
  }
</style>
