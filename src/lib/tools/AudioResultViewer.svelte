<script lang="ts">
    import { Copy, X, RotateCcw, CheckCircle2, FileText } from "lucide-svelte";
    import { onMount } from "svelte";
    import { closeWindow } from "../stores/windowManager";
    import { transcriptionResult } from "../stores/audioConverter";

    let copied = $state(false);
    let resultText = $state("");

    onMount(() => {
        // Subscribe to store
        const unsubscribe = transcriptionResult.subscribe((value) => {
            resultText = value;
        });
        return unsubscribe;
    });

    function copyToClipboard() {
        navigator.clipboard.writeText(resultText);
        copied = true;
        setTimeout(() => (copied = false), 2000);
    }

    function close() {
        if (windowId) closeWindow(windowId);
    }

    let { windowId }: { windowId: string } = $props();
</script>

<div class="h-full flex flex-col bg-slate-950 text-cyan-100 font-mono p-4">
    <!-- Header -->
    <div
        class="flex items-center justify-between mb-4 pb-4 border-b border-cyan-900/30"
    >
        <div class="flex items-center gap-3 text-cyan-400">
            <div class="p-2 bg-slate-900 rounded border border-cyan-900/50">
                <FileText size={20} />
            </div>
            <div>
                <h3 class="font-bold text-lg tracking-wide">
                    TRANSCRIPTION RESULT
                </h3>
                <div class="text-[10px] text-cyan-700">READ-ONLY MODE</div>
            </div>
        </div>
        <div class="flex gap-2">
            <button
                class="flex items-center gap-2 px-4 py-2 bg-cyan-900/20 hover:bg-cyan-900/40 border border-cyan-900/50 rounded transition-all text-sm group"
                onclick={copyToClipboard}
            >
                {#if copied}
                    <CheckCircle2 size={16} class="text-green-400" />
                    <span class="text-green-400">COPIED</span>
                {:else}
                    <Copy
                        size={16}
                        class="text-cyan-400 group-hover:scale-110 transition-transform"
                    />
                    <span>COPY TEXT</span>
                {/if}
            </button>
        </div>
    </div>

    <!-- Content -->
    <div
        class="flex-1 bg-black/40 rounded border border-cyan-900/30 p-4 overflow-y-auto shadow-inner relative group"
    >
        <div
            class="whitespace-pre-wrap text-slate-300 leading-relaxed text-sm selection:bg-cyan-900/50 selection:text-cyan-100"
        >
            {resultText || "No content available."}
        </div>
    </div>

    <!-- Footer removed as per request -->
</div>
