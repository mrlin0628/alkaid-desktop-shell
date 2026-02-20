<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { fade, slide, fly } from "svelte/transition";
    import {
        Upload as UploadIcon,
        File as FileIcon,
        FileText,
        Image as ImageIcon,
        Music,
        Video,
        Code,
        Trash2,
        Download,
        Loader2,
        Cloud,
        CheckCircle2,
        AlertCircle,
        Folder,
        FolderPlus,
        LayoutGrid,
        Monitor,
    } from "lucide-svelte";

    // --- State ---
    // Use dynamic hostname to support LAN access
    const hostname = window.location.hostname;
    const API_URL = `http://${hostname === "localhost" ? "127.0.0.1" : hostname}:3030`;

    let loading = false;
    let uploading = false;
    let uploadProgress = 0;
    let error: string | null = null;
    let statusMessage = "";

    // Service State
    let isServiceReady = false;
    let serviceStatus = "Checking connection...";
    let pollInterval: any;

    // File/Folder Data
    let items: any[] = [];
    let currentFolder = "Default"; // Default starting folder
    let folders: string[] = ["Default"]; // Cached folder list

    // UI State
    let showNewFolderInput = false;
    let newFolderName = "";
    let isDragOver = false;

    // Confirmation Dialogs
    let showDeleteConfirm = false;
    let itemToDelete: any = null;

    // --- Computed ---
    $: files = items.filter((i) => i.type === "file");
    // Ensure "Default" is always in the list if not fetched (though fetch should handle it)
    $: displayedFolders = items.filter((i) => i.type === "folder");

    // --- Service Management ---
    async function checkServiceHealth() {
        try {
            const response = await fetch(API_URL);
            if (response.ok || response.status === 404) {
                // 404 on root is fine, server is up
                isServiceReady = true;
                serviceStatus = "System Online";
                return true;
            }
        } catch (e) {
            // console.log('Service not ready');
        }
        return false;
    }

    async function startService() {
        serviceStatus = "Initializing...";
        try {
            await fetch("/api/system/start-cloud-service", { method: "POST" });
            let attempts = 0;
            const maxAttempts = 20;
            pollInterval = setInterval(async () => {
                const healthy = await checkServiceHealth();
                if (healthy) {
                    clearInterval(pollInterval);
                    fetchItems();
                } else {
                    attempts++;
                    if (attempts > maxAttempts) {
                        clearInterval(pollInterval);
                        error = "Failed to connect to cloud service.";
                        serviceStatus = "Connection Failed";
                        // Fallback: try fetching anyway, maybe check failed but it's up
                        fetchItems();
                    }
                }
            }, 1000);
        } catch (e) {
            error = "Failed to trigger service startup.";
        }
    }

    // --- API Interactions ---

    async function fetchItems() {
        if (!isServiceReady && serviceStatus !== "Connection Failed") return; // Allow retry if failed
        loading = true;
        try {
            // 1. Get List of all folders (by listing root, looking for directories)
            // We assume a flat 1-level folder structure for simplicity as per user request (sidebar folders)
            // Actually, we need to scan root to find folders.
            const rootResponse = await fetch(`${API_URL}/api/files?folder=`);
            if (rootResponse.ok) {
                const rootItems = await rootResponse.json();
                folders = rootItems
                    .filter((i: any) => i.type === "folder")
                    .map((i: any) => i.name);

                if (!folders.includes("Default")) folders.push("Default");
                folders = [...new Set(folders)].sort();
            }

            // 2. Get content of CURRENT folder
            const response = await fetch(
                `${API_URL}/api/files?folder=${encodeURIComponent(currentFolder)}`,
            );
            if (response.ok) {
                items = await response.json();
                error = null;
            } else {
                console.warn("Failed to load folder content");
                // If folder doesn't exist (deleted?), switch to Default
                if (currentFolder !== "Default") {
                    currentFolder = "Default";
                    fetchItems();
                    return;
                }
            }
        } catch (e) {
            error = "Network error";
        } finally {
            loading = false;
        }
    }

    async function createFolder() {
        if (!newFolderName.trim()) return;

        try {
            const response = await fetch(
                `${API_URL}/api/folders?name=${encodeURIComponent(newFolderName)}`,
                {
                    method: "POST",
                },
            );

            if (response.ok) {
                // Determine if we switch to it or just list it.
                // UX: User usually wants to go to the new folder.
                currentFolder = newFolderName;
                newFolderName = "";
                showNewFolderInput = false;
                await fetchItems();
            } else {
                const data = await response.json();
                error = data.error || "Failed to create folder";
            }
        } catch (e) {
            error = "Error creating folder";
        }
    }

    // Handles deleting both files and folders
    async function deleteItem(name: string, type: "file" | "folder") {
        if (type === "folder" && name === "Default") {
            error = "Cannot delete Default folder";
            setTimeout(() => (error = null), 3000);
            return;
        }
        itemToDelete = { name, type };
        showDeleteConfirm = true;
    }

    async function performDelete() {
        if (!itemToDelete) return;

        const isFolder = itemToDelete.type === "folder";
        const url = isFolder
            ? `${API_URL}/api/folders?name=${encodeURIComponent(itemToDelete.name)}`
            : `${API_URL}/api/files/${encodeURIComponent(itemToDelete.name)}?folder=${encodeURIComponent(currentFolder)}`;

        try {
            const response = await fetch(url, { method: "DELETE" });
            if (response.ok) {
                if (isFolder && currentFolder === itemToDelete.name) {
                    currentFolder = "Default";
                }
                await fetchItems();
            } else {
                error = "Delete failed";
            }
        } catch (e) {
            error = "Delete network error";
        } finally {
            showDeleteConfirm = false;
            itemToDelete = null;
        }
    }

    // --- Upload Logic ---
    async function handleDrop(e: DragEvent) {
        e.preventDefault();
        isDragOver = false;
        if (e.dataTransfer?.files) {
            await uploadFiles(e.dataTransfer.files);
        }
    }

    async function uploadFiles(fileList: FileList) {
        if (!isServiceReady) return;
        uploading = true;
        statusMessage = "Starting upload...";
        uploadProgress = 0;
        error = null;

        let successCount = 0;

        for (let i = 0; i < fileList.length; i++) {
            const file = fileList[i];
            const formData = new FormData();
            formData.append("file", file);

            try {
                statusMessage = `Uploading ${file.name}...`;
                const xhr = new XMLHttpRequest();

                await new Promise((resolve, reject) => {
                    xhr.upload.addEventListener("progress", (event) => {
                        if (event.lengthComputable) {
                            uploadProgress = (event.loaded / event.total) * 100;
                        }
                    });

                    xhr.addEventListener("load", () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            resolve(xhr.response);
                        } else {
                            reject(new Error("Upload failed"));
                        }
                    });

                    xhr.addEventListener("error", () =>
                        reject(new Error("Network error")),
                    );

                    // Add folder param
                    xhr.open(
                        "POST",
                        `${API_URL}/api/upload?folder=${encodeURIComponent(currentFolder)}`,
                    );
                    xhr.send(formData);
                });
                successCount++;
            } catch (e: any) {
                error = `Failed to upload ${file.name}`;
                console.error(e);
            }
        }

        uploading = false;
        statusMessage = successCount > 0 ? "Upload complete" : "Upload failed";
        setTimeout(() => (statusMessage = ""), 3000);
        fetchItems();
    }

    // --- Helpers ---
    function formatSize(bytes: number) {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const constSizes = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return (
            parseFloat((bytes / Math.pow(k, i)).toFixed(2)) +
            " " +
            constSizes[i]
        );
    }

    function formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleDateString();
    }

    function getIcon(filename: string) {
        const ext = filename.split(".").pop()?.toLowerCase();
        if (["jpg", "png", "gif", "webp", "jpeg"].includes(ext || ""))
            return ImageIcon;
        if (["mp3", "wav", "ogg"].includes(ext || "")) return Music;
        if (["mp4", "mkv", "mov", "webm"].includes(ext || "")) return Video;
        if (["js", "ts", "py", "json", "html", "css"].includes(ext || ""))
            return Code;
        if (["txt", "md", "doc", "pdf"].includes(ext || "")) return FileText;
        return FileIcon;
    }

    onMount(() => {
        checkServiceHealth().then((healthy) => {
            if (!healthy) startService();
            else fetchItems();
        });
    });

    onDestroy(() => {
        if (pollInterval) clearInterval(pollInterval);
    });
</script>

<div
    class="flex h-full bg-slate-950 text-slate-200 font-sans overflow-hidden select-none"
>
    <!-- Left Pane: Sidebar (Folders) -->
    <div
        class="w-48 bg-slate-900/50 border-r border-cyan-500/10 flex flex-col shrink-0 backdrop-blur-sm"
    >
        <div
            class="p-4 border-b border-cyan-500/10 flex items-center justify-between"
        >
            <span
                class="text-[10px] font-bold text-cyan-500 tracking-widest uppercase"
                >My Cloud</span
            >
            <button
                class="text-slate-500 hover:text-cyan-400 transition-colors p-1 hover:bg-cyan-900/20 rounded"
                on:click={() => (showNewFolderInput = !showNewFolderInput)}
                title="New Folder"
            >
                <FolderPlus size={14} />
            </button>
        </div>

        <div class="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
            {#if showNewFolderInput}
                <div class="px-2 py-1 mb-2 animate-in slide-in-from-top-2">
                    <input
                        type="text"
                        bind:value={newFolderName}
                        placeholder="Folder name..."
                        class="w-full bg-slate-950 border border-cyan-500/50 rounded px-2 py-1.5 text-xs focus:outline-none text-cyan-100 placeholder:text-slate-600"
                        on:keydown={(e) => e.key === "Enter" && createFolder()}
                        autoFocus
                    />
                </div>
            {/if}

            {#each folders as folder}
                <div
                    class="group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 text-xs font-medium {currentFolder ===
                    folder
                        ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                        : 'hover:bg-white/5 text-slate-400 border border-transparent'}"
                    on:click={() => {
                        currentFolder = folder;
                        fetchItems();
                    }}
                >
                    <div class="flex items-center gap-2 truncate">
                        <Folder
                            size={14}
                            class={currentFolder === folder
                                ? "fill-cyan-500/20 text-cyan-400"
                                : "text-slate-500"}
                        />
                        <span class="truncate">{folder}</span>
                    </div>
                    {#if folder !== "Default"}
                        <button
                            class="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                            on:click|stopPropagation={() =>
                                deleteItem(folder, "folder")}
                        >
                            <Trash2 size={12} />
                        </button>
                    {/if}
                </div>
            {/each}
        </div>
    </div>

    <!-- Right Content Area -->
    <div
        class="flex-1 flex flex-col min-w-0 bg-gradient-to-br from-slate-950 to-slate-900"
    >
        <!-- Top Pane: Upload Area -->
        <div class="h-48 shrink-0 p-4 border-b border-cyan-500/10">
            <div
                class="h-full w-full rounded-xl border-2 border-dashed transition-all duration-300 relative overflow-hidden group
                {isDragOver
                    ? 'border-cyan-400 bg-cyan-900/20 shadow-[0_0_20px_rgba(34,211,238,0.1)]'
                    : 'border-slate-800 bg-slate-900/30 hover:border-slate-700 hover:bg-slate-900/50'}"
                on:dragover|preventDefault={() => (isDragOver = true)}
                on:dragleave={() => (isDragOver = false)}
                on:drop={handleDrop}
            >
                <input
                    type="file"
                    multiple
                    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    on:change={(e) =>
                        e.target.files && uploadFiles(e.target.files)}
                    disabled={!isServiceReady || uploading}
                />

                <div
                    class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                >
                    {#if uploading}
                        <div class="flex flex-col items-center gap-3">
                            <Loader2
                                class="w-8 h-8 text-cyan-400 animate-spin"
                            />
                            <div class="space-y-1 text-center">
                                <span class="text-xs font-mono text-cyan-300"
                                    >{statusMessage}</span
                                >
                                <div
                                    class="w-32 h-1 bg-slate-800 rounded-full overflow-hidden"
                                >
                                    <div
                                        class="h-full bg-cyan-500 transition-all duration-300"
                                        style="width: {uploadProgress}%"
                                    ></div>
                                </div>
                            </div>
                        </div>
                    {:else}
                        <div
                            class="w-12 h-12 rounded-xl bg-slate-950 flex items-center justify-center mb-3 shadow-lg border border-slate-800 group-hover:scale-110 group-hover:border-cyan-500/30 transition-all duration-300"
                        >
                            <UploadIcon
                                class="w-6 h-6 text-slate-500 group-hover:text-cyan-400 transition-colors"
                            />
                        </div>
                        <div class="text-center space-y-1">
                            <h3
                                class="text-sm font-bold text-slate-300 group-hover:text-cyan-100 transition-colors"
                            >
                                Upload to <span class="text-cyan-400"
                                    >/{currentFolder}</span
                                >
                            </h3>
                            <p class="text-[10px] text-slate-500">
                                Drag files here or click to browse
                            </p>
                        </div>
                    {/if}
                </div>
            </div>
        </div>

        <!-- Connection Status Overlay -->
        {#if !isServiceReady}
            <div
                class="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
                transition:fade={{ duration: 200 }}
            >
                <div class="flex flex-col items-center gap-4">
                    <div class="relative">
                        <div
                            class="w-12 h-12 rounded-full border-4 border-slate-800"
                        ></div>
                        <div
                            class="absolute inset-0 w-12 h-12 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin"
                        ></div>
                        <Cloud
                            class="absolute inset-0 m-auto w-5 h-5 text-cyan-500 animate-pulse"
                        />
                    </div>
                    <div class="text-center space-y-1">
                        <h3
                            class="text-slate-200 font-bold tracking-widest text-sm"
                        >
                            CONNECTING
                        </h3>
                        <p class="text-cyan-400 text-xs font-mono">
                            {serviceStatus}
                        </p>
                    </div>
                </div>
            </div>
        {/if}

        <!-- Bottom Pane: File List -->
        <div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <div class="flex items-center justify-between mb-4 px-1">
                <div class="flex items-center gap-2">
                    <Folder class="w-4 h-4 text-cyan-500" />
                    <h2 class="text-xs font-bold text-slate-300 tracking-wider">
                        /{currentFolder}
                    </h2>
                </div>
                <span
                    class="text-[10px] text-slate-600 font-mono border border-slate-800 px-2 py-0.5 rounded-full"
                    >{files.length} ITEMS</span
                >
            </div>

            {#if loading}
                <div
                    class="h-full flex flex-col items-center justify-center p-8 text-slate-500 gap-3"
                >
                    <Loader2 class="w-8 h-8 animate-spin text-cyan-500" />
                    <span class="text-xs tracking-wider animate-pulse"
                        >LOADING CONTENT...</span
                    >
                </div>
            {:else if error}
                <div
                    class="p-4 rounded-lg bg-red-900/20 border border-red-500/20 flex items-center gap-3 text-red-300"
                >
                    <AlertCircle class="w-5 h-5" />
                    <span class="text-xs">{error}</span>
                </div>
            {:else if files.length === 0}
                <div
                    class="h-32 flex flex-col items-center justify-center text-slate-700 border border-dashed border-slate-800 rounded-xl bg-slate-900/20"
                >
                    <FileIcon class="w-8 h-8 mb-2 opacity-20" />
                    <span class="text-xs">Folder is empty</span>
                </div>
            {:else}
                <div class="grid grid-cols-1 gap-2">
                    {#each files as file (file.name)}
                        <div
                            class="group flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-cyan-500/20 transition-all relative overflow-hidden"
                        >
                            <div
                                class="w-8 h-8 rounded bg-slate-900 flex items-center justify-center border border-white/5 shrink-0 group-hover:border-cyan-500/30 transition-colors"
                            >
                                <svelte:component
                                    this={getIcon(file.name)}
                                    class="w-4 h-4 text-slate-500 group-hover:text-cyan-400"
                                />
                            </div>

                            <div class="flex-1 min-w-0">
                                <a
                                    href="{API_URL}/api/download/{encodeURIComponent(
                                        file.name,
                                    )}?folder={encodeURIComponent(
                                        currentFolder,
                                    )}"
                                    target="_blank"
                                    class="text-xs font-medium text-slate-300 truncate hover:text-cyan-300 transition-colors block"
                                >
                                    {file.name}
                                </a>
                                <div class="flex items-center gap-3 mt-0.5">
                                    <span
                                        class="text-[9px] font-mono text-slate-500"
                                        >{formatSize(file.size)}</span
                                    >
                                    <span
                                        class="text-[9px] font-mono text-slate-600"
                                        >{formatDate(file.date)}</span
                                    >
                                </div>
                            </div>

                            <!-- Actions -->
                            <div
                                class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <a
                                    href="{API_URL}/api/download/{encodeURIComponent(
                                        file.name,
                                    )}?folder={encodeURIComponent(
                                        currentFolder,
                                    )}"
                                    download
                                    class="p-1.5 hover:bg-slate-800 rounded text-slate-500 hover:text-cyan-400 transition-colors"
                                    title="Download"
                                >
                                    <Download size={14} />
                                </a>
                                <button
                                    class="p-1.5 hover:bg-slate-800 rounded text-slate-500 hover:text-red-400 transition-colors"
                                    title="Delete"
                                    on:click={() =>
                                        deleteItem(file.name, "file")}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    </div>

    <!-- Confirm Dialog -->
    {#if showDeleteConfirm}
        <div
            class="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-[2px] p-4"
            transition:fade={{ duration: 150 }}
        >
            <div
                class="bg-slate-900 border border-red-500/30 rounded-xl p-5 shadow-2xl max-w-xs w-full space-y-4"
                transition:fly={{ y: 20, duration: 200 }}
            >
                <div class="flex items-center gap-3 text-red-400">
                    <div class="p-2 bg-red-950 rounded-lg">
                        <Trash2 class="w-5 h-5" />
                    </div>
                    <h3 class="font-bold text-base">Delete Item?</h3>
                </div>
                <p class="text-slate-400 text-xs leading-relaxed">
                    Permanently delete <br />
                    <span
                        class="text-white font-mono bg-white/5 py-0.5 px-1.5 rounded mt-1 inline-block border border-white/10"
                        >{itemToDelete?.name}</span
                    >
                </p>
                <div class="flex gap-2 pt-2">
                    <button
                        class="flex-1 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                        on:click={() => (showDeleteConfirm = false)}
                        >Cancel</button
                    >
                    <button
                        class="flex-1 px-3 py-2 rounded-lg bg-red-900/80 hover:bg-red-800 text-red-100 border border-red-500/20 text-xs font-bold transition-colors"
                        on:click={performDelete}>Confirm</button
                    >
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 3px;
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
