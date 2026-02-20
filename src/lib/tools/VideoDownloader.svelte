<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import {
    Film,
    Headphones,
    Download,
    CheckCircle,
    AlertCircle,
    Loader2,
    Link as LinkIcon,
    Youtube,
    Power,
    Activity,
    Timer,
  } from "lucide-svelte";

  let url = "";
  let formatType = "video";
  let loading = false;
  let result: any = null;
  let error: string | null = null;

  // Progress State
  let progress = 0;
  let downloadSpeed = "";
  let eta = "";
  let statusMessage = "";

  // Service State
  let isServiceReady = false;
  let serviceStatus = "Checking connection...";
  let pollInterval: any;

  async function checkServiceHealth() {
    try {
      const hostname = window.location.hostname;
      const apiBase = hostname === "localhost" ? "127.0.0.1" : hostname;
      const response = await fetch(`http://${apiBase}:8003/health`);
      if (response.ok) {
        isServiceReady = true;
        serviceStatus = "System Online";
        return true;
      }
    } catch (e) {
      // console.log('Service not ready yet...');
    }
    return false;
  }

  async function startService() {
    serviceStatus = "Initializing...";
    try {
      await fetch("/api/system/start-video-service", { method: "POST" });

      let attempts = 0;
      const maxAttempts = 20;

      pollInterval = setInterval(async () => {
        const healthy = await checkServiceHealth();
        if (healthy) {
          clearInterval(pollInterval);
        } else {
          attempts++;
          if (attempts > maxAttempts) {
            clearInterval(pollInterval);
            error = "Failed to connect to backend.";
            serviceStatus = "Connection Failed";
          }
        }
      }, 1000);
    } catch (e) {
      error = "Failed to trigger service startup.";
    }
  }

  onMount(() => {
    checkServiceHealth().then((healthy) => {
      if (!healthy) {
        startService();
      }
    });
  });

  onDestroy(() => {
    if (pollInterval) clearInterval(pollInterval);
  });

  async function handleDownload() {
    if (!url) return;

    loading = true;
    error = null;
    result = null;
    progress = 0;
    downloadSpeed = "";
    eta = "";
    statusMessage = "Initializing...";

    try {
      const hostname = window.location.hostname;
      const apiBase = hostname === "localhost" ? "127.0.0.1" : hostname;
      const response = await fetch(
        `http://${apiBase}:8003/api/download-stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url, format_type: formatType }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to start download stream");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Failed to create stream reader");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (value) {
          buffer += decoder.decode(value, { stream: true });
        }

        if (done) break;

        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.status === "progress") {
                progress = data.percent;
                downloadSpeed = data.speed;
                eta = data.eta;
                statusMessage = "Downloading...";
              } else if (data.status === "processing") {
                statusMessage = data.message;
                progress = 100;
              } else if (data.status === "success") {
                result = data;
                loading = false;
              } else if (data.status === "error") {
                error = data.message;
                loading = false;
              }
            } catch (e) {
              console.error("Parse error", e);
            }
          }
        }
      }
    } catch (err: any) {
      error = err.message;
      loading = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && url && !loading && isServiceReady) {
      handleDownload();
    }
  }
</script>

<div
  class="h-full flex flex-col bg-slate-950 text-cyan-100 font-mono overflow-auto custom-scrollbar select-none relative p-5"
>
  {#if !isServiceReady}
    <div
      class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-500"
    >
      <Loader2 class="w-8 h-8 text-cyan-500 animate-spin" />
      <div class="text-cyan-400 font-bold tracking-widest text-sm">
        {serviceStatus}
      </div>
    </div>
  {/if}

  <div
    class="w-full space-y-5 mt-1"
    class:blur-sm={!isServiceReady}
    class:pointer-events-none={!isServiceReady}
  >
    <!-- Input Section -->
    <div class="space-y-1">
      <!-- Status Indicator (Right aligned, above label) -->
      <div class="flex justify-end mb-2">
        <div
          class="flex items-center gap-2 border border-cyan-900/30 bg-slate-900/80 px-2 py-0.5 rounded-full scale-90 origin-right"
        >
          {#if isServiceReady}
            <div
              class="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
            ></div>
            <span class="text-[9px] text-green-400 font-bold tracking-widest"
              >ONLINE</span
            >
          {:else}
            <div
              class="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"
            ></div>
            <span class="text-[9px] text-yellow-400 font-bold tracking-widest"
              >CONNECTING</span
            >
          {/if}
        </div>
      </div>

      <label
        for="url"
        class="text-xs font-bold text-cyan-600 tracking-widest block pl-1"
        >TARGET URL</label
      >

      <div class="relative group">
        <div
          class="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-700 group-focus-within:text-cyan-400 transition-colors"
        >
          <LinkIcon size={16} />
        </div>
        <input
          type="text"
          id="url"
          bind:value={url}
          on:keydown={handleKeydown}
          placeholder="https://youtu.be/..."
          class="w-full bg-slate-900/50 border border-cyan-900/30 rounded-lg py-3 pl-10 pr-3 text-cyan-100 placeholder-cyan-900/50 focus:outline-none focus:border-cyan-500/50 focus:bg-slate-900 transition-all font-mono text-xs shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
          disabled={loading}
        />
        <div
          class="absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-slate-900/50 to-transparent pointer-events-none"
        ></div>
      </div>
    </div>

    <!-- Format Selection -->
    <div class="space-y-2">
      <span class="text-xs font-bold text-cyan-600 tracking-widest block pl-1"
        >OUTPUT FORMAT</span
      >
      <div class="grid grid-cols-2 gap-3">
        <!-- Video Option -->
        <button
          class="relative p-2 rounded border transition-all duration-200 text-left group overflow-hidden h-16 flex items-center"
          class:bg-cyan-950={formatType === "video"}
          class:border-cyan-500={formatType === "video"}
          class:border-cyan-900_30={formatType !== "video"}
          class:bg-slate-900={formatType !== "video"}
          on:click={() => (formatType = "video")}
          disabled={loading}
        >
          <div
            class="flex items-center gap-2 relative z-10 w-full justify-center"
          >
            <Film
              class={formatType === "video"
                ? "text-cyan-400"
                : "text-slate-500"}
              size={18}
            />
            <div
              class="font-bold text-xs"
              class:text-cyan-300={formatType === "video"}
              class:text-slate-400={formatType !== "video"}
            >
              VIDEO (MKV)
            </div>
          </div>
          {#if formatType === "video"}
            <div
              class="absolute top-1 right-1 text-cyan-500 animate-in zoom-in duration-200"
            >
              <CheckCircle size={10} />
            </div>
          {/if}
        </button>

        <!-- Audio Option -->
        <button
          class="relative p-2 rounded border transition-all duration-200 text-left group overflow-hidden h-16 flex items-center"
          class:bg-cyan-950={formatType === "audio"}
          class:border-cyan-500={formatType === "audio"}
          class:border-cyan-900_30={formatType !== "audio"}
          class:bg-slate-900={formatType !== "audio"}
          on:click={() => (formatType = "audio")}
          disabled={loading}
        >
          <div
            class="flex items-center gap-2 relative z-10 w-full justify-center"
          >
            <Headphones
              class={formatType === "audio"
                ? "text-cyan-400"
                : "text-slate-500"}
              size={18}
            />
            <div
              class="font-bold text-xs"
              class:text-cyan-300={formatType === "audio"}
              class:text-slate-400={formatType !== "audio"}
            >
              AUDIO (M4A)
            </div>
          </div>
          {#if formatType === "audio"}
            <div
              class="absolute top-1 right-1 text-cyan-500 animate-in zoom-in duration-200"
            >
              <CheckCircle size={10} />
            </div>
          {/if}
        </button>
      </div>
    </div>

    <!-- Progress / Action Section -->
    {#if loading}
      <!-- Progress Bar -->
      <div
        class="bg-slate-900 border border-cyan-900/30 rounded-lg p-4 space-y-3 animate-in fade-in slide-in-from-top-2"
      >
        <div
          class="flex justify-between items-center text-[10px] text-cyan-400 tracking-widest font-bold"
        >
          <span>{statusMessage}</span>
          <span>{Math.round(progress)}%</span>
        </div>

        <div
          class="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden relative border border-cyan-900/30"
        >
          <div
            class="absolute top-0 left-0 h-full bg-cyan-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(6,182,212,0.5)]"
            style="width: {progress}%"
          ></div>
          <div
            class="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2s_infinite]"
          ></div>
        </div>

        <div class="grid grid-cols-2 gap-2 pt-1">
          <div class="flex items-center gap-1 text-slate-500 text-[10px]">
            <Activity size={12} class="text-cyan-700" />
            <span><span class="text-cyan-300">{downloadSpeed}</span></span>
          </div>
          <div
            class="flex items-center gap-1 text-slate-500 text-[10px] justify-end"
          >
            <Timer size={12} class="text-cyan-700" />
            <span><span class="text-cyan-300">{eta}</span></span>
          </div>
        </div>
      </div>
    {:else if !result}
      <!-- Action Button -->
      <button
        on:click={handleDownload}
        disabled={loading || !url}
        class="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded shadow-[0_0_20px_rgba(8,145,178,0.4)] hover:shadow-[0_0_30px_rgba(8,145,178,0.6)] transition-all active:scale-[0.99] flex items-center justify-center gap-2 tracking-widest disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed group relative overflow-hidden text-sm mt-4"
      >
        <Download class="w-4 h-4 group-hover:scale-110 transition-transform" />
        <span>DOWNLOAD</span>

        {#if !loading && url}
          <div
            class="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12"
          ></div>
        {/if}
      </button>
    {/if}

    <!-- Error Display -->
    {#if error}
      <div
        class="p-3 bg-red-950/20 border border-red-500/30 rounded flex items-center gap-2 animate-in slide-in-from-top-2 mt-4"
      >
        <AlertCircle class="w-4 h-4 text-red-400 shrink-0" />
        <span class="text-red-300 text-xs font-bold break-all">{error}</span>
      </div>
    {/if}

    <!-- Result Display -->
    {#if result}
      <div class="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-4">
        <div
          class="bg-cyan-950/20 border border-cyan-500/30 rounded-lg p-4 space-y-3 relative overflow-hidden"
        >
          <div class="absolute top-0 left-0 w-1 h-full bg-cyan-500"></div>

          <div class="flex items-center gap-2 text-cyan-400 mb-1">
            <CheckCircle class="w-5 h-5" />
            <h3 class="font-bold tracking-widest text-xs">COMPLETE</h3>
          </div>

          <div class="space-y-2 text-xs text-slate-300">
            <div
              class="bg-slate-900/80 rounded border border-cyan-900/30 p-3 space-y-1 font-mono text-[10px]"
            >
              <div class="grid grid-cols-[50px_1fr] gap-2 items-baseline">
                <span class="text-slate-500">TITLE_</span>
                <span class="font-bold text-cyan-100 max-w-full truncate block"
                  >{result.title}</span
                >

                <span class="text-slate-500">LOC_</span>
                <span class="text-slate-400 break-all opacity-70"
                  >{result.filename}</span
                >
              </div>
            </div>

            <div class="flex justify-between items-center mt-2">
              <button
                class="text-[10px] text-cyan-600 hover:text-cyan-400 underline tracking-widest transition-colors"
                on:click={() => {
                  url = "";
                  result = null;
                }}
              >
                CLEAR
              </button>

              <a
                href={`http://${window.location.hostname === "localhost" ? "127.0.0.1" : window.location.hostname}:8003/api/file/${encodeURIComponent(result.basename || result.filename.split(/[\\/]/).pop())}`}
                target="_blank"
                download
                class="bg-cyan-900/50 hover:bg-cyan-800 text-cyan-200 text-[10px] font-bold py-1.5 px-3 rounded border border-cyan-500/30 hover:border-cyan-400 transition-all flex items-center gap-2"
              >
                <Download size={12} />
                SAVE TO DEVICE
              </a>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(15, 23, 42, 0.5);
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(8, 145, 178, 0.3);
    border-radius: 2px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(8, 145, 178, 0.5);
  }
</style>
