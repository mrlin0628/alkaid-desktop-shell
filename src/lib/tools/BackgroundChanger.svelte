<script lang="ts">
    import VideoUpload from "../components/VideoUpload.svelte";
    import {
        backgroundPreferences,
        updateBackgroundPreference,
        resetToDefaults,
    } from "../stores/backgroundPreferences";

    function handleVideoUploaded(
        event: CustomEvent<{ url: string; filename: string }>,
    ) {
        updateBackgroundPreference("type", "video");
        // Remove timestamp parameter from URL for localStorage persistence
        const cleanUrl = event.detail.url.split("?")[0];
        updateBackgroundPreference("source", cleanUrl);
    }

    function handleUploadError(event: CustomEvent<{ message: string }>) {
        console.error("Upload error:", event.detail.message);
    }

    function setColorBackground(color: string) {
        updateBackgroundPreference("type", "color");
        updateBackgroundPreference("color", color);
    }

    function updateOpacity(opacity: number) {
        updateBackgroundPreference("opacity", opacity);
    }

    const presetColors = [
        "#0a0a0a", // Cyber Dark
        "#1a1a2e", // Dark Purple
        "#16213e", // Dark Blue
        "#0f3460", // Navy
        "#533483", // Purple
        "#1e3a8a", // Blue
    ];
</script>

<div
    class="h-full w-full overflow-y-auto bg-black bg-opacity-90 p-6 text-gray-200"
>
    <!-- Current Settings Display -->
    <div class="mb-6 p-3 bg-cyber-dark border border-gray-600 rounded text-sm">
        <p><strong>Type:</strong> {$backgroundPreferences.type}</p>
        <p><strong>Color:</strong> {$backgroundPreferences.color}</p>
        {#if $backgroundPreferences.source}
            <p>
                <strong>Video:</strong>
                {$backgroundPreferences.source.split("/").pop()}
            </p>
        {/if}
        <p><strong>Opacity:</strong> {$backgroundPreferences.opacity}</p>
    </div>

    <!-- Background Type Selection -->
    <div class="mb-6">
        <h4 class="text-cyber-blue font-medium mb-3">Background Type</h4>
        <div class="flex gap-2">
            <button
                class="px-3 py-2 rounded border transition-all duration-200 flex-1"
                class:bg-cyber-blue={$backgroundPreferences.type === "color"}
                class:bg-opacity-20={$backgroundPreferences.type === "color"}
                class:border-cyber-blue={$backgroundPreferences.type ===
                    "color"}
                class:border-gray-600={$backgroundPreferences.type !== "color"}
                class:text-cyber-blue={$backgroundPreferences.type === "color"}
                class:text-gray-400={$backgroundPreferences.type !== "color"}
                onclick={() => updateBackgroundPreference("type", "color")}
            >
                Solid Color
            </button>
            <button
                class="px-3 py-2 rounded border transition-all duration-200 flex-1"
                class:bg-cyber-blue={$backgroundPreferences.type === "video"}
                class:bg-opacity-20={$backgroundPreferences.type === "video"}
                class:border-cyber-blue={$backgroundPreferences.type ===
                    "video"}
                class:border-gray-600={$backgroundPreferences.type !== "video"}
                class:text-cyber-blue={$backgroundPreferences.type === "video"}
                class:text-gray-400={$backgroundPreferences.type !== "video"}
                onclick={() => updateBackgroundPreference("type", "video")}
            >
                Video
            </button>
        </div>
    </div>

    <!-- Color Settings -->
    {#if $backgroundPreferences.type === "color"}
        <div class="mb-6">
            <h4 class="text-cyber-blue font-medium mb-3">Color Selection</h4>

            <!-- Color Picker -->
            <div class="mb-3">
                <input
                    type="color"
                    value={$backgroundPreferences.color}
                    class="w-full h-10 border border-gray-600 rounded cursor-pointer"
                    oninput={(e) => setColorBackground(e.currentTarget.value)}
                    onchange={(e) => setColorBackground(e.currentTarget.value)}
                />
            </div>

            <!-- Preset Colors -->
            <div class="grid grid-cols-6 gap-2">
                {#each presetColors as color}
                    <button
                        class="w-8 h-8 rounded border-2 transition-all duration-200 hover:scale-110"
                        class:border-cyber-blue={$backgroundPreferences.color ===
                            color}
                        class:border-gray-600={$backgroundPreferences.color !==
                            color}
                        style="background-color: {color}"
                        onclick={() => setColorBackground(color)}
                    ></button>
                {/each}
            </div>
        </div>
    {/if}

    <!-- Video Upload -->
    {#if $backgroundPreferences.type === "video"}
        <div class="mb-6">
            <h4 class="text-cyber-blue font-medium mb-3">Video Upload</h4>
            <VideoUpload
                on:uploaded={handleVideoUploaded}
                on:error={handleUploadError}
            />
        </div>
    {/if}

    <!-- Opacity Control -->
    <div class="mb-6">
        <h4 class="text-cyber-blue font-medium mb-3">Opacity</h4>
        <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={$backgroundPreferences.opacity}
            class="w-full accent-cyber-blue"
            oninput={(e) => updateOpacity(parseFloat(e.currentTarget.value))}
        />
        <div class="flex justify-between text-xs text-gray-400 mt-1">
            <span>10%</span>
            <span>{Math.round($backgroundPreferences.opacity * 100)}%</span>
            <span>100%</span>
        </div>
    </div>

    <!-- Reset Button -->
    <button
        class="w-full px-4 py-2 bg-cyber-pink bg-opacity-20 border border-cyber-pink rounded text-cyber-pink hover:bg-opacity-30 transition-all duration-200"
        onclick={resetToDefaults}
    >
        Reset to Defaults
    </button>
</div>
