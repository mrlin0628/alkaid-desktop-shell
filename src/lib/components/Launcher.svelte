<script lang="ts">
    import { fade, fly } from "svelte/transition";
    import { toolRegistry, getVisibleTools } from "$lib/stores/toolRegistry";
    import { createWindow } from "$lib/stores/windowManager";
    import type { Tool } from "$lib/types";
    import {
        Settings,
        Calendar,
        FileText,
        Activity,
        Lock,
        Shield,
        Image as ImageIcon,
        Terminal,
        LayoutGrid,
        CheckSquare,
    } from "lucide-svelte";

    let { isOpen, onClose } = $props<{
        isOpen: boolean;
        onClose: () => void;
    }>();

    // Subscribe to registry changes to keep list updated
    let tools = $derived(getVisibleTools());

    const iconMap: Record<string, any> = {
        settings: Settings,
        calendar: Calendar,
        "file-text": FileText,
        activity: Activity,
        lock: Lock,
        shield: Shield,
        image: ImageIcon,
        terminal: Terminal,
        grid: LayoutGrid,
        "check-square": CheckSquare,
    };

    function launchTool(tool: Tool) {
        createWindow({
            id: `tool-${tool.id}-${Date.now()}`,
            title: tool.name,
            width: tool.defaultWidth || 500,
            height: tool.defaultHeight || 400,
            content: {
                type: tool.type,
                source: tool.source,
            },
            tool: tool,
        });
        onClose();
    }
</script>

{#if isOpen}
    <!-- Backdrop -->
    <!-- Backdrop -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="fixed inset-0 z-[9000] bg-black bg-opacity-50"
        onclick={onClose}
        transition:fade={{ duration: 200 }}
    ></div>

    <!-- Sidebar -->
    <div
        class="fixed top-0 left-0 h-full w-full md:w-72 bg-black/90 z-[9001] backdrop-blur-xl"
        transition:fly={{ x: -300, duration: 300 }}
    >
        <div class="p-6 border-b border-cyber-blue/30">
            <h2 class="text-xl font-bold text-cyber-blue tracking-wider">
                ALKAID LAUNCHER
            </h2>
        </div>

        <div class="p-3 overflow-y-auto h-[calc(100%-80px)] scrollbar-hide">
            {#if tools.length === 0}
                <div class="p-4 text-gray-500 text-center text-sm">
                    No tools registered.
                </div>
            {:else}
                <div class="space-y-1">
                    {#each tools as tool}
                        <button
                            class="w-full text-left p-3 rounded hover:bg-cyber-blue hover:bg-opacity-20 transition-colors group flex items-center gap-3"
                            onclick={() => launchTool(tool)}
                        >
                            <div
                                class="w-8 h-8 rounded bg-cyber-dark border border-cyber-blue flex items-center justify-center text-cyber-blue group-hover:text-white group-hover:border-white transition-colors overflow-hidden"
                            >
                                {#if tool.icon && tool.icon.includes("/")}
                                    <img
                                        src={tool.icon}
                                        alt={tool.name}
                                        class="w-full h-full object-cover"
                                    />
                                {:else if tool.icon && iconMap[tool.icon]}
                                    {@const Icon = iconMap[tool.icon]}
                                    <Icon size={18} />
                                {:else}
                                    <!-- Simple icon placeholder if no icon provided -->
                                    <span class="text-xs"
                                        >{tool.name
                                            .substring(0, 2)
                                            .toUpperCase()}</span
                                    >
                                {/if}
                            </div>
                            <div>
                                <div
                                    class="text-white font-medium group-hover:text-cyber-blue transition-colors tracking-wide"
                                >
                                    {tool.name}
                                </div>
                                {#if tool.description}
                                    <div
                                        class="text-xs text-gray-500 line-clamp-2 mt-0.5 leading-tight"
                                    >
                                        {tool.description}
                                    </div>
                                {/if}
                            </div>
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
    </div>
{/if}

<style>
    .scrollbar-hide::-webkit-scrollbar {
        display: none;
    }
    .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
</style>
