<script lang="ts">
  import Desktop from "$lib/components/Desktop.svelte";
  import BackgroundSettings from "$lib/components/BackgroundSettings.svelte";
  import WindowManager from "$lib/components/WindowManager.svelte";
  import TaskBar from "$lib/components/TaskBar.svelte";
  import DesktopIcon from "$lib/components/DesktopIcon.svelte";
  import Launcher from "$lib/components/Launcher.svelte";
  import { backgroundPreferences } from "$lib/stores/backgroundPreferences";
  import { registerTool } from "$lib/stores/toolRegistry";
  import { onMount } from "svelte";

  import { toolService } from "$lib/services/toolService";

  let isLauncherOpen = $state(false);

  // Register tools on mount
  onMount(async () => {
    try {
      // Load tools from database API first
      await toolService.loadTools();

      // Register hardcoded tools (legacy/fallback)
      registerTool({
        id: "bg-changer",
        name: "Background Settings",
        description: "Customize desktop wallpaper and effects",
        icon: "settings",
        type: "component",
        source: "BackgroundChanger", // Maps to src/lib/tools/BackgroundChanger.svelte
        category: "system",
        defaultWidth: 400,
        defaultHeight: 600,
      });

      registerTool({
        id: "habit-tracker",
        name: "Habit Tracker",
        description: "Track your daily habits and streaks",
        icon: "check-square",
        type: "component",
        source: "HabitTracker",
        category: "productivity",
        defaultWidth: 500,
        defaultHeight: 600,
      });

      registerTool({
        id: "notebook",
        name: "Secure Notebook",
        description: "Encrypted data storage",
        icon: "shield",
        type: "component",
        source: "Notebook",
        category: "productivity",
        defaultWidth: 800,
        defaultHeight: 600,
      });
    } catch (e) {
      console.log("Tool registration warning:", e);
    }
  });

  function toggleLauncher() {
    isLauncherOpen = !isLauncherOpen;
  }
</script>

<Desktop
  backgroundType={$backgroundPreferences.type}
  backgroundSource={$backgroundPreferences.source}
  backgroundColor={$backgroundPreferences.color}
  backgroundOpacity={$backgroundPreferences.opacity}
  fallbackBackground="#0a0a0a"
>
  <!-- Header -->
  <div
    class="absolute top-0 left-0 right-0 h-8 bg-black bg-opacity-40 border-b border-cyber-blue border-opacity-20 z-20 flex items-center justify-center backdrop-blur-sm"
  >
    <span class="text-cyber-blue text-xs font-bold tracking-widest opacity-80"
      >ALKAID SYSTEM // COMMAND CENTER</span
    >
  </div>

  <!-- Desktop Icons -->
  <div class="absolute top-20 left-4 md:top-24 md:left-8 z-10">
    <DesktopIcon onClick={toggleLauncher} />
  </div>

  <!-- Launcher Sidebar -->
  <Launcher isOpen={isLauncherOpen} onClose={() => (isLauncherOpen = false)} />

  <!-- Window Manager - Renders all windows -->
  <WindowManager />

  <!-- Task Bar - Shows minimized windows -->
  <TaskBar />

  <!-- Background Settings Panel (Removed, now a tool) -->
  <!-- <BackgroundSettings /> -->
</Desktop>
