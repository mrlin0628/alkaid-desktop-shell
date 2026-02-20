<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import {
        Music,
        Play,
        AlertCircle,
        Terminal,
        Cpu,
        Zap,
        Upload,
        FileVideo,
        FileAudio,
        CheckCircle2,
        Clock,
        Timer,
        ChevronRight,
        Disc,
    } from "lucide-svelte";
    import { fade, slide, fly } from "svelte/transition";
    import type { Tool } from "../types";
    import { createWindow } from "$lib/stores/windowManager";
    import { transcriptionResult } from "$lib/stores/audioConverter";

    let {
        windowId,
        tool,
        apiEndpoint = "/api/audio-converter",
    }: { windowId: string; tool: Tool; apiEndpoint?: string } = $props();

    // Steps: 0 = Select File, 1 = Settings, 2 = Processing/Result
    let currentStep = $state(0);

    // Inputs
    let selectedFile = $state<File | null>(null);
    let filePath = $state(""); // Fallback for manual path entry if needed
    let modelSize = $state("base");
    let device = $state("cpu");

    // Processing State
    let isProcessing = $state(false);
    let logs = $state<string[]>([]);
    let result = $state<any>(null);
    let error = $state<string | null>(null);
    let startTime = $state<number>(0);
    let elapsedTime = $state(0);
    let timerInterval: any;
    let progress = $state(0);

    // Video Metadata
    let videoDuration = $state(0);
    let estimatedTime = $state(0);

    const models = ["tiny", "base", "small", "medium", "large"];

    // Drag & Drop Handlers
    function handleDrop(e: DragEvent) {
        e.preventDefault();
        if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
            handleFileSelection(e.dataTransfer.files[0]);
        }
    }

    function handleFileSelect(e: Event) {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
            handleFileSelection(target.files[0]);
        }
    }

    function handleFileSelection(file: File) {
        selectedFile = file;
        error = null;

        // Reset steps
        currentStep = 0;

        // Check for media duration
        const video = document.createElement("video");
        video.preload = "metadata";
        video.onloadedmetadata = function () {
            window.URL.revokeObjectURL(video.src);
            videoDuration = video.duration;
            estimateProcessingTime();
        };
        video.src = URL.createObjectURL(file);

        // Auto advance to next step after brief delay for visual confirmation
        setTimeout(() => {
            currentStep = 1;
        }, 600);
    }

    function estimateProcessingTime() {
        // Rough estimation factors based on Whisper benchmarks (on CPU)
        // Tiny ~ 0.1x, Base ~ 0.2x, Small ~ 0.5x, Medium ~ 1.5x, Large ~ 3.0x (on CPU)
        // These are very rough guesses and depend heavily on hardware
        const factors: Record<string, number> = {
            tiny: 0.1,
            base: 0.2,
            small: 0.5,
            medium: 1.5,
            large: 3.0,
        };

        // GPU speeds up significantly (maybe 5x-10x faster)
        let factor = factors[modelSize] || 1.0;
        if (device === "cuda") factor /= 5;

        // Add a constant overhead for model loading (approx 3-5s)
        const overhead = 10.0;

        estimatedTime = videoDuration * factor + overhead;
    }

    $effect(() => {
        // Re-calculate estimate when model/device changes
        if (videoDuration > 0) estimateProcessingTime();
    });

    // State for smooth progress
    let lastLogProgress = $state(0);

    // We'll use a smoother interpolation target
    let targetProgress = $state(0);

    // Parse logs for duration to update progress
    function parseProgress(log: string) {
        // Handle both MM:SS.mmm and HH:MM:SS.mmm formats
        // Use matchAll to find ALL timestamps in the chunk, and use the LAST one
        const matches = Array.from(
            log.matchAll(/-->\s*(?:(\d{1,2}):)?(\d{2}):(\d{2})\.(\d{3})/g),
        );

        if (matches.length > 0 && videoDuration > 0) {
            const lastMatch = matches[matches.length - 1];

            const hours = lastMatch[1]
                ? parseInt(lastMatch[1].replace(":", ""))
                : 0;
            const minutes = parseInt(lastMatch[2]);
            const seconds = parseInt(lastMatch[3]);
            const milliseconds = parseInt(lastMatch[4]);

            const currentSeconds =
                hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;

            // Calculate percentage
            const newProgress = Math.min(
                100,
                (currentSeconds / videoDuration) * 100,
            );

            // Update confirmed progress
            if (newProgress > lastLogProgress) {
                lastLogProgress = newProgress;
                // Update target to at least this value
                if (lastLogProgress > targetProgress) {
                    targetProgress = lastLogProgress;
                }

                // If visual progress is WAY behind (stuck), jump it close
                if (progress < lastLogProgress - 15) {
                    progress = lastLogProgress - 5;
                }
            }
        }
    }

    async function startConversion() {
        if (!selectedFile && !filePath) {
            error = "Please select a file first";
            return;
        }

        currentStep = 2;
        isProcessing = true;
        error = null;
        result = null;
        logs = ["Initializing conversion environment..."];
        startTime = Date.now();
        elapsedTime = 0;
        progress = 0;
        lastLogProgress = 0;
        targetProgress = 0;

        // Start timer
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            elapsedTime = (Date.now() - startTime) / 1000;

            // PROGRESS INTERPOLATION LOGIC
            // If we have an estimated time, we can project progress
            if (estimatedTime > 0 && isProcessing) {
                // Base constant speed based on estimate
                // e.g. if estimatedTime is 10s, we want to go 0-100 in 10s.
                // call occurs every 100ms. so 100 calls in 10s.
                // 100% / (estimatedTime * 10) per tick
                let baseStep = 100 / (estimatedTime * 10);

                // Safety clamp: don't let base speed be excessively fast (e.g. < 1s estimate)
                baseStep = Math.min(baseStep, 2.0);

                // Dynamic Adjustment:
                // If we are behind the official logs, speed up to catch up
                if (progress < lastLogProgress) {
                    // We are lagging behind actual progress (safe to accelerate)
                    let catchUpSpeed = (lastLogProgress - progress) * 0.1; // Move 10% of the distance per tick
                    progress += Math.max(baseStep, catchUpSpeed);
                } else {
                    // We are ahead of logs (predicting)
                    // If we get too far ahead of what we've actually seen, slow down
                    const lead = progress - lastLogProgress;

                    if (lead < 5) {
                        // Safe lead, keep normal speed
                        progress += baseStep;
                    } else if (lead < 15) {
                        // Getting a bit optimistic, slow down
                        progress += baseStep * 0.3;
                    } else {
                        // Too far ahead, practically stop until logs catch up
                        progress += baseStep * 0.05;
                    }
                }

                // Hard cap at 99% until "result" event is received
                if (progress >= 99) {
                    progress = 99;
                }
            }
        }, 100);

        try {
            // Prepare Request
            let response;

            if (selectedFile) {
                const formData = new FormData();
                formData.append("file", selectedFile);
                formData.append("modelSize", modelSize);
                formData.append("device", device);

                response = await fetch(apiEndpoint, {
                    method: "POST",
                    body: formData, // No Content-Type header, browser sets it with boundary
                });
            } else {
                // Fallback for manual path
                response = await fetch(apiEndpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ filePath, modelSize, device }),
                });
            }

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to start conversion");
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error("Failed to read response stream");

            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split("\n\n");

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        try {
                            const data = JSON.parse(line.slice(6));

                            if (data.type === "log") {
                                // Add log and scroll to bottom
                                logs = [...logs, data.message.trim()];
                                parseProgress(data.message);

                                // Auto scroll
                                setTimeout(() => {
                                    const logContainer =
                                        document.getElementById("log-end");
                                    logContainer?.scrollIntoView({
                                        behavior: "smooth",
                                    });
                                }, 10);
                            } else if (data.type === "result") {
                                result = data.data;
                                logs = [
                                    ...logs,
                                    "✨ Conversion completed successfully!",
                                ];
                                progress = 100;
                                clearInterval(timerInterval);

                                // Open result window
                                transcriptionResult.set(result.text);
                                createWindow({
                                    id: `audio-result-${Date.now()}`,
                                    title: "Transcription Result",
                                    content: {
                                        type: "component",
                                        source: "/src/tools/AudioResultViewer.svelte",
                                    },
                                    width: 800,
                                    height: 600,
                                    tool: {
                                        id: "audio-result-viewer",
                                        name: "Audio Result Viewer",
                                        type: "component",
                                        source: "/src/tools/AudioResultViewer.svelte",
                                    },
                                });
                            } else if (data.type === "error") {
                                error = data.message;
                                logs = [...logs, `❌ Error: ${data.message}`];
                                clearInterval(timerInterval);
                            }
                        } catch (e) {
                            console.error("Failed to parse SSE data:", e);
                        }
                    }
                }
            }
        } catch (e: any) {
            console.error(e);
            error = e.message;
            logs = [...logs, `❌ Error: ${e.message}`];
            clearInterval(timerInterval);
        } finally {
            isProcessing = false;
            clearInterval(timerInterval);
        }
    }

    onDestroy(() => {
        clearInterval(timerInterval);
    });

    function formatTime(seconds: number) {
        if (!seconds && seconds !== 0) return "--:--";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
</script>

<div
    class="flex flex-col h-full bg-slate-950 text-cyan-100 font-mono overflow-hidden select-none"
>
    <!-- Step Indicator -->
    <div
        class="flex items-center justify-between px-8 py-6 border-b border-cyan-900/30 bg-slate-900/50"
    >
        {#each ["SELECT FILE", "CONFIGURE", "PROCESS"] as step, i}
            <div
                class="flex items-center gap-2"
                class:opacity-50={currentStep < i}
            >
                <div
                    class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                    class:bg-cyan-500={currentStep >= i}
                    class:text-black={currentStep >= i}
                    class:bg-slate-800={currentStep < i}
                    class:text-slate-400={currentStep < i}
                >
                    {i + 1}
                </div>
                <span
                    class="text-xs tracking-widest font-bold"
                    class:text-cyan-400={currentStep >= i}>{step}</span
                >
            </div>
            {#if i < 2}
                <div class="h-[1px] w-12 bg-cyan-900/50"></div>
            {/if}
        {/each}
    </div>

    <!-- Content Area -->
    <div class="flex-1 overflow-hidden relative p-8">
        <!-- STEP 1: FILE SELECTION -->
        {#if currentStep === 0}
            <div
                class="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300"
            >
                <div
                    class="flex-1 border-2 border-dashed border-cyan-900/50 rounded-lg bg-slate-900/30 hover:bg-slate-900/50 hover:border-cyan-500/50 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer group relative"
                    ondragover={(e) => e.preventDefault()}
                    ondrop={handleDrop}
                    onclick={() =>
                        document.getElementById("fileInput")?.click()}
                    role="button"
                    tabindex="0"
                    onkeydown={(e) =>
                        e.key === "Enter" &&
                        document.getElementById("fileInput")?.click()}
                >
                    <input
                        id="fileInput"
                        type="file"
                        accept="audio/*,video/*"
                        class="hidden"
                        onchange={handleFileSelect}
                    />

                    <div
                        class="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_20px_rgba(6,182,212,0.1)]"
                    >
                        <Upload class="w-8 h-8 text-cyan-400" />
                    </div>

                    <h3
                        class="text-xl font-bold text-cyan-100 mb-2 tracking-wide"
                    >
                        DROP MEDIA FILE HERE
                    </h3>
                    <p class="text-cyan-700 text-sm tracking-widest">
                        SUPPORTING AUDIO & VIDEO FORMATS
                    </p>

                    <div class="mt-8 flex gap-4 opacity-50">
                        <div
                            class="flex items-center gap-2 text-xs text-slate-500"
                        >
                            <FileAudio size={14} /> <span>MP3, WAV, FLAC</span>
                        </div>
                        <div
                            class="flex items-center gap-2 text-xs text-slate-500"
                        >
                            <FileVideo size={14} /> <span>MP4, MKV, AVI</span>
                        </div>
                    </div>
                </div>
            </div>
        {/if}

        <!-- STEP 2: CONFIGURATION -->
        {#if currentStep === 1}
            <div
                class="h-full max-w-2xl mx-auto flex flex-col justify-center animate-in fade-in slide-in-from-right-8 duration-300"
            >
                <!-- Selected File Info -->
                <div
                    class="bg-slate-900/50 border border-cyan-900/30 rounded-lg p-4 mb-8 flex items-center justify-between"
                >
                    <div class="flex items-center gap-4">
                        <div
                            class="w-10 h-10 rounded bg-cyan-950 flex items-center justify-center text-cyan-400"
                        >
                            <FileAudio />
                        </div>
                        <div>
                            <div class="text-sm font-bold text-cyan-100">
                                {selectedFile?.name || "Unknown File"}
                            </div>
                            <div class="text-xs text-cyan-700 flex gap-4 mt-1">
                                <span
                                    >{(
                                        selectedFile!.size /
                                        (1024 * 1024)
                                    ).toFixed(2)} MB</span
                                >
                                {#if videoDuration}
                                    <span class="text-cyan-500"
                                        >Duration: {formatTime(
                                            videoDuration,
                                        )}</span
                                    >
                                {/if}
                            </div>
                        </div>
                    </div>
                    <button
                        class="text-xs text-slate-500 hover:text-cyan-400 underline"
                        onclick={() => (currentStep = 0)}>CHANGE</button
                    >
                </div>

                <div class="grid grid-cols-2 gap-6 mb-8">
                    <!-- Model Selection -->
                    <div class="space-y-3">
                        <div
                            class="text-xs font-bold text-cyan-600 tracking-widest block"
                        >
                            AI MODEL SCALE
                        </div>
                        <div class="space-y-2">
                            {#each models as model}
                                <button
                                    class="w-full text-left px-4 py-3 rounded border transition-all duration-200 flex items-center justify-between group"
                                    class:bg-cyan-950={modelSize === model}
                                    class:border-cyan-500={modelSize === model}
                                    class:border-cyan-900_30={modelSize !==
                                        model}
                                    class:hover:border-cyan-700={modelSize !==
                                        model}
                                    class:bg-slate-900={modelSize !== model}
                                    onclick={() => (modelSize = model)}
                                >
                                    <span
                                        class="uppercase text-sm font-bold"
                                        class:text-cyan-300={modelSize ===
                                            model}
                                        class:text-slate-400={modelSize !==
                                            model}>{model}</span
                                    >
                                    {#if modelSize === model}
                                        <CheckCircle2
                                            size={14}
                                            class="text-cyan-400"
                                        />
                                    {/if}
                                </button>
                            {/each}
                        </div>
                    </div>

                    <!-- Device Selection -->
                    <div class="space-y-6">
                        <div class="space-y-3">
                            <div
                                class="text-xs font-bold text-cyan-600 tracking-widest block"
                            >
                                COMPUTE DEVICE
                            </div>

                            <button
                                class="w-full text-left px-4 py-3 rounded border transition-all duration-200 flex items-center gap-3 mb-2"
                                class:bg-cyan-950={device === "cpu"}
                                class:border-cyan-500={device === "cpu"}
                                class:border-cyan-900_30={device !== "cpu"}
                                class:bg-slate-900={device !== "cpu"}
                                onclick={() => (device = "cpu")}
                            >
                                <Cpu
                                    size={18}
                                    class={device === "cpu"
                                        ? "text-cyan-400"
                                        : "text-slate-500"}
                                />
                                <div>
                                    <div
                                        class="text-sm font-bold"
                                        class:text-cyan-300={device === "cpu"}
                                        class:text-slate-400={device !== "cpu"}
                                    >
                                        CPU PROCESSING
                                    </div>
                                    <div class="text-[10px] text-slate-600">
                                        Standard compatibility
                                    </div>
                                </div>
                            </button>

                            <button
                                class="w-full text-left px-4 py-3 rounded border transition-all duration-200 flex items-center gap-3"
                                class:bg-cyan-950={device === "cuda"}
                                class:border-cyan-500={device === "cuda"}
                                class:border-cyan-900_30={device !== "cuda"}
                                class:bg-slate-900={device !== "cuda"}
                                onclick={() => (device = "cuda")}
                            >
                                <Zap
                                    size={18}
                                    class={device === "cuda"
                                        ? "text-cyan-400"
                                        : "text-slate-500"}
                                />
                                <div>
                                    <div
                                        class="text-sm font-bold"
                                        class:text-cyan-300={device === "cuda"}
                                        class:text-slate-400={device !== "cuda"}
                                    >
                                        GPU ACCELERATION
                                    </div>
                                    <div class="text-[10px] text-slate-600">
                                        Requires NVIDIA CUDA
                                    </div>
                                </div>
                            </button>
                        </div>

                        <!-- Estimate Panel -->
                        <div
                            class="bg-slate-900/80 p-4 rounded border border-cyan-900/30"
                        >
                            <div
                                class="text-xs text-cyan-700 tracking-widest mb-2"
                            >
                                ESTIMATED TIME
                            </div>
                            <div class="flex items-end gap-2 text-cyan-300">
                                <span class="text-2xl font-bold font-mono"
                                    >~{formatTime(estimatedTime)}</span
                                >
                                <span class="text-[10px] text-cyan-800 mb-1"
                                    >BASED ON DURATION</span
                                >
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    class="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 rounded shadow-[0_0_20px_rgba(8,145,178,0.4)] hover:shadow-[0_0_30px_rgba(8,145,178,0.6)] transition-all active:scale-[0.99] flex items-center justify-center gap-3 tracking-widest"
                    onclick={startConversion}
                >
                    <Play size={20} fill="currentColor" />
                    INITIATE SEQUENCE
                </button>
            </div>
        {/if}

        <!-- STEP 3: PROCESSING & RESULT -->
        {#if currentStep === 2}
            <div
                class="h-full flex flex-col gap-4 animate-in fade-in slide-in-from-right-8 duration-300"
            >
                <!-- Status Bar -->
                <div
                    class="bg-slate-900 border border-cyan-900/30 rounded-lg p-4 grid grid-cols-3 gap-4"
                >
                    <div class="flex items-center gap-3 text-cyan-300">
                        <div class="p-2 bg-slate-800 rounded text-cyan-500">
                            <Clock size={16} />
                        </div>
                        <div>
                            <div
                                class="text-[10px] text-cyan-800 tracking-widest"
                            >
                                ELAPSED
                            </div>
                            <div class="font-mono font-bold">
                                {formatTime(elapsedTime)}
                            </div>
                        </div>
                    </div>

                    <!-- Progress Bar -->
                    <div class="col-span-2 flex flex-col justify-center">
                        <div class="flex justify-between items-end mb-1">
                            <div
                                class="text-[10px] text-cyan-800 tracking-widest"
                            >
                                COMPLETION
                            </div>
                            <div class="font-mono font-bold text-cyan-300">
                                {Math.round(progress)}%
                            </div>
                        </div>
                        <div
                            class="w-full h-2 bg-slate-800 rounded-full overflow-hidden relative border border-cyan-900/20"
                        >
                            <div
                                class="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)] transition-all duration-300 ease-out"
                                style="width: {progress}%"
                            ></div>
                            {#if isProcessing}
                                <div
                                    class="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]"
                                    style="transform: skewX(-20deg)"
                                ></div>
                            {/if}
                        </div>
                        <div
                            class="mt-1 flex justify-between text-[10px] text-slate-500 font-mono"
                        >
                            <span>0%</span>
                            <span>50%</span>
                            <span>100%</span>
                        </div>
                    </div>
                </div>

                <!-- Console Output -->
                <div
                    class="flex-1 bg-black rounded-lg border border-cyan-900/30 overflow-hidden flex flex-col relative shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]"
                >
                    <div
                        class="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-cyan-900/30"
                    >
                        <div
                            class="flex items-center gap-2 text-xs text-cyan-600 font-bold tracking-widest"
                        >
                            <Terminal size={12} />
                            SYSTEM_LOG // {device.toUpperCase()} : {modelSize.toUpperCase()}
                        </div>
                        {#if isProcessing}
                            <div class="flex items-center gap-2">
                                <span class="relative flex h-2 w-2">
                                    <span
                                        class="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"
                                    ></span>
                                    <span
                                        class="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"
                                    ></span>
                                </span>
                                <span
                                    class="text-[10px] text-cyan-400 animate-pulse"
                                    >PROCESSING</span
                                >
                            </div>
                        {/if}
                    </div>

                    <div
                        class="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-1 custom-scrollbar"
                    >
                        {#each logs as log}
                            <div
                                class="text-slate-300 border-l border-cyan-900/30 pl-2 leading-relaxed opacity-80 hover:opacity-100 transition-opacity"
                            >
                                <span class="text-cyan-700 mr-2"
                                    >[{new Date().toLocaleTimeString()}]</span
                                >
                                {log}
                            </div>
                        {/each}
                        <div id="log-end"></div>
                    </div>
                </div>

                <!-- Final Result (If Done) -->
                {#if result}
                    <div
                        class="bg-cyan-950/30 border border-cyan-500/50 rounded-lg p-4 animate-in slide-in-from-bottom-2 duration-500 flex items-center justify-between"
                    >
                        <div
                            class="flex items-center gap-3 text-cyan-300 font-bold"
                        >
                            <CheckCircle2 size={20} />
                            <span>TRANSCRIPTION COMPLETE</span>
                        </div>

                        <button
                            class="px-4 py-2 bg-cyan-900/50 hover:bg-cyan-700 rounded text-cyan-100 text-xs font-bold transition-all flex items-center gap-2 border border-cyan-500/30 whitespace-nowrap"
                            onclick={() => (currentStep = 0)}
                        >
                            START NEW TASK <ChevronRight size={12} />
                        </button>
                    </div>
                {/if}
            </div>
        {/if}
    </div>
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: rgba(15, 23, 42, 0.5);
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(8, 145, 178, 0.3);
        border-radius: 3px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(8, 145, 178, 0.5);
    }
</style>
