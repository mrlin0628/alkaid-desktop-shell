<script lang="ts">
    import { onMount } from "svelte";
    import {
        Plus,
        Trash2,
        Save,
        FileText,
        Lock,
        Unlock,
        Delete,
        Check,
        ChevronRight,
        Search,
        Eye,
        Edit3,
        Shield,
        ShieldAlert,
    } from "lucide-svelte";
    import { fade, fly, slide } from "svelte/transition";
    import { marked } from "marked";

    // Types
    interface EncryptedData {
        ciphertext: string; // Base64
        iv: string; // Hex
        salt: string; // Hex
        validator: string; // Encrypted validation string
    }

    interface Note {
        id: string;
        title: string;
        content: string; // Plaintext content (empty if locked and not yet decrypted)
        updatedAt: number;
        isEncrypted: boolean;
        encryptedData?: EncryptedData;
    }

    // State
    let notes: Note[] = $state([]);
    let selectedNoteId = $state<string | null>(null);
    let searchQuery = $state("");

    // Editor State
    let isViewMode = $state(true);
    let isNoteUnlocked = $state(false); // Tracks if the CURRENT selected note is unlocked
    let inputPassword = $state("");
    let errorMsg = $state("");
    let showLockSetup = $state(false); // Toggle for showing the "Set Password" overlay
    let setupStep = $state(0);
    let tempPassword = $state("");

    // Derived
    let selectedNote = $derived(notes.find((n) => n.id === selectedNoteId));
    let filteredNotes = $derived(
        notes
            .filter(
                (n) =>
                    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (n.content &&
                        n.content
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase())),
            )
            .sort((a, b) => b.updatedAt - a.updatedAt),
    );

    let renderedContent = $derived(
        selectedNote && (!selectedNote.isEncrypted || isNoteUnlocked)
            ? marked.parse(selectedNote.content)
            : "",
    );

    // Constants
    const STORAGE_KEY_DATA_V2 = "alkaid_notebook_data_v2";

    // Crypto Utils
    async function deriveKey(
        password: string,
        salt: Uint8Array,
    ): Promise<CryptoKey> {
        const enc = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            enc.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveKey"],
        );
        return window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 100000,
                hash: "SHA-256",
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"],
        );
    }

    async function encryptData(
        data: string,
        key: CryptoKey,
    ): Promise<{ iv: Uint8Array; ciphertext: ArrayBuffer }> {
        const enc = new TextEncoder();
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const ciphertext = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            enc.encode(data),
        );
        return { iv, ciphertext };
    }

    async function decryptData(
        ciphertext: ArrayBuffer,
        key: CryptoKey,
        iv: Uint8Array,
    ): Promise<string> {
        const dec = new TextDecoder();
        const decrypted = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            ciphertext,
        );
        return dec.decode(decrypted);
    }

    function arrayBufferToBase64(buffer: ArrayBuffer): string {
        return btoa(String.fromCharCode(...new Uint8Array(buffer)));
    }

    function base64ToArrayBuffer(base64: string): ArrayBuffer {
        const binary_string = window.atob(base64);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    }

    function hexToUint8Array(hex: string): Uint8Array {
        return new Uint8Array(
            hex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
        );
    }

    function uint8ArrayToHex(bytes: Uint8Array): string {
        return Array.from(bytes)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
    }

    onMount(() => {
        // Load Data
        const savedData = localStorage.getItem(STORAGE_KEY_DATA_V2);
        if (savedData) {
            try {
                notes = JSON.parse(savedData);
            } catch (e) {
                console.error("Failed to parse notes", e);
                notes = [];
            }
        }
    });

    // Reset state when selecting a new note
    $effect(() => {
        if (selectedNoteId) {
            isNoteUnlocked = false;
            inputPassword = "";
            errorMsg = "";
            showLockSetup = false;
            setupStep = 0;
            tempPassword = "";
        }
    });

    function handleNumPad(key: string) {
        errorMsg = "";
        if (key === "DEL") {
            inputPassword = inputPassword.slice(0, -1);
        } else if (key === "ENTER") {
            if (showLockSetup) {
                processLockSetup();
            } else {
                processUnlock();
            }
        } else {
            if (inputPassword.length < 12) {
                inputPassword += key;
            }
        }
    }

    async function processLockSetup() {
        if (setupStep === 0) {
            if (inputPassword.length < 4) {
                errorMsg = "MIN 4 DIGITS";
                return;
            }
            tempPassword = inputPassword;
            inputPassword = "";
            setupStep = 1;
            errorMsg = "CONFIRM CODE";
        } else {
            if (inputPassword === tempPassword) {
                await lockCurrentNote(inputPassword);
                showLockSetup = false;
                inputPassword = "";
                errorMsg = "";
            } else {
                errorMsg = "MISMATCH";
                inputPassword = "";
                setupStep = 0;
                setTimeout(() => (errorMsg = "RETRY SETUP"), 1000);
            }
        }
    }

    async function processUnlock() {
        if (!selectedNote || !selectedNote.encryptedData) return;

        try {
            await unlockCurrentNote(inputPassword);
            inputPassword = "";
            errorMsg = "";
        } catch (e) {
            errorMsg = "ACCESS DENIED";
            inputPassword = "";
            setTimeout(() => (errorMsg = ""), 1500);
        }
    }

    async function lockCurrentNote(pwd: string) {
        if (!selectedNote) return;

        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const key = await deriveKey(pwd, salt);

        // Encrypt Content
        const { iv: cIv, ciphertext: cCipher } = await encryptData(
            selectedNote.content,
            key,
        );

        // Encrypt Validator
        const { iv: vIv, ciphertext: vCipher } = await encryptData(
            "ALKAID_VALID",
            key,
        );

        const encryptedData: EncryptedData = {
            salt: uint8ArrayToHex(salt),
            iv: uint8ArrayToHex(cIv),
            ciphertext: arrayBufferToBase64(cCipher),
            validator:
                arrayBufferToBase64(vIv) + ":" + arrayBufferToBase64(vCipher),
        };

        // Update Note
        const index = notes.findIndex((n) => n.id === selectedNoteId);
        if (index !== -1) {
            notes[index].isEncrypted = true;
            notes[index].encryptedData = encryptedData;
            notes[index].content = ""; // Clear plaintext
            saveNotes();
        }
    }

    async function unlockCurrentNote(pwd: string) {
        if (!selectedNote || !selectedNote.encryptedData) return;

        const enc = selectedNote.encryptedData;
        const salt = hexToUint8Array(enc.salt);
        const key = await deriveKey(pwd, salt);

        // Verify Password
        const [vIvB64, vCipherB64] = enc.validator.split(":");
        try {
            const valDecrypted = await decryptData(
                base64ToArrayBuffer(vCipherB64),
                key,
                new Uint8Array(base64ToArrayBuffer(vIvB64)),
            );
            if (valDecrypted !== "ALKAID_VALID")
                throw new Error("Invalid password");
        } catch (e) {
            throw new Error("Invalid password");
        }

        // Decrypt Content
        const contentDecrypted = await decryptData(
            base64ToArrayBuffer(enc.ciphertext),
            key,
            hexToUint8Array(enc.iv),
        );

        // Update State (Keep isEncrypted true in storage, but show content in memory)
        // We don't save the decrypted content back to storage unless the user edits it.
        // But for simplicity in this app, let's keep it decrypted in memory 'notes' array
        // but we need to be careful not to save it as plaintext if we want it to stay locked.
        // Actually, the requirement is "open notebook -> no password", "open specific note -> password".
        // So we should keep it encrypted in storage.

        // For the UI to work, we'll temporarily set 'content' on the selectedNote object in memory
        // BUT we must differentiate between "decrypted for view" and "permanently decrypted".
        // Let's just use the `isNoteUnlocked` flag.

        // We need to store the decrypted content somewhere.
        // Let's put it in the note.content but NOT save it to disk if isEncrypted is true.
        // Wait, saveNotes() dumps the whole 'notes' array.
        // So we need to make sure that when we save, we re-encrypt if it's supposed to be encrypted.

        // Strategy: When unlocked, we store the password (tempPassword) for this note session.
        // When saving, if isEncrypted is true, we use that password to re-encrypt the current content.

        const index = notes.findIndex((n) => n.id === selectedNoteId);
        if (index !== -1) {
            notes[index].content = contentDecrypted;
            isNoteUnlocked = true;
            tempPassword = pwd; // Store for re-encryption on save
        }
    }

    async function removeLock() {
        if (!selectedNote || !isNoteUnlocked) return;

        const index = notes.findIndex((n) => n.id === selectedNoteId);
        if (index !== -1) {
            notes[index].isEncrypted = false;
            notes[index].encryptedData = undefined;
            // Content is already decrypted in notes[index].content
            saveNotes();
        }
    }

    async function saveNotes() {
        // We need to create a copy of notes to save, where encrypted notes have empty content
        // and updated encryptedData.
        // However, doing this for EVERY keystroke (updateNote) is expensive if we re-encrypt every time.
        // But for a local app, it's probably fine.

        const notesToSave = await Promise.all(
            notes.map(async (n) => {
                if (n.isEncrypted) {
                    // If it's the currently unlocked note, we need to re-encrypt it with the latest content
                    if (
                        n.id === selectedNoteId &&
                        isNoteUnlocked &&
                        tempPassword
                    ) {
                        const salt = window.crypto.getRandomValues(
                            new Uint8Array(16),
                        );
                        const key = await deriveKey(tempPassword, salt);
                        const { iv: cIv, ciphertext: cCipher } =
                            await encryptData(n.content, key);
                        const { iv: vIv, ciphertext: vCipher } =
                            await encryptData("ALKAID_VALID", key);

                        return {
                            ...n,
                            content: "", // Don't store plaintext
                            encryptedData: {
                                salt: uint8ArrayToHex(salt),
                                iv: uint8ArrayToHex(cIv),
                                ciphertext: arrayBufferToBase64(cCipher),
                                validator:
                                    arrayBufferToBase64(vIv) +
                                    ":" +
                                    arrayBufferToBase64(vCipher),
                            },
                        };
                    } else {
                        // It's encrypted and not currently unlocked (or we don't have the password),
                        // so just save it as is (content should be empty already if loaded from storage)
                        return n;
                    }
                } else {
                    return n;
                }
            }),
        );

        localStorage.setItem(STORAGE_KEY_DATA_V2, JSON.stringify(notesToSave));
    }

    function createNote() {
        const newNote: Note = {
            id: crypto.randomUUID(),
            title: "New Note",
            content: "",
            updatedAt: Date.now(),
            isEncrypted: false,
        };
        notes = [newNote, ...notes];
        selectedNoteId = newNote.id;
        saveNotes();
    }

    function deleteNote(id: string) {
        notes = notes.filter((n) => n.id !== id);
        if (selectedNoteId === id) {
            selectedNoteId = null;
        }
        saveNotes();
    }

    function updateNote() {
        if (selectedNote) {
            const index = notes.findIndex((n) => n.id === selectedNoteId);
            if (index !== -1) {
                notes[index].updatedAt = Date.now();
                saveNotes();
            }
        }
    }

    function formatDate(ts: number) {
        return new Date(ts).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }
</script>

<div
    class="w-full h-full bg-slate-900 text-cyan-100 flex flex-col overflow-hidden font-mono relative select-none"
>
    <!-- Main Interface -->
    <div class="flex h-full w-full" in:fade>
        <!-- Sidebar -->
        <div
            class="w-1/3 min-w-[200px] border-r border-cyan-900/30 bg-slate-950/50 flex flex-col"
        >
            <!-- Sidebar Header -->
            <div class="p-4 border-b border-cyan-900/30">
                <div class="flex items-center justify-between mb-4">
                    <span
                        class="text-xs font-bold text-cyan-600 tracking-widest"
                        >ARCHIVES</span
                    >
                    <button
                        class="p-1 hover:text-cyan-400 transition-colors"
                        onclick={createNote}
                        title="New Entry"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                <!-- Search -->
                <div class="relative">
                    <input
                        type="text"
                        bind:value={searchQuery}
                        placeholder="SEARCH_DB..."
                        class="w-full bg-slate-900 border border-cyan-900/50 rounded px-8 py-1 text-xs text-cyan-300 focus:outline-none focus:border-cyan-500 placeholder-cyan-800"
                    />
                    <Search
                        size={12}
                        class="absolute left-2 top-1/2 -translate-y-1/2 text-cyan-700"
                    />
                </div>
            </div>

            <!-- Note List -->
            <div class="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {#each filteredNotes as note (note.id)}
                    <button
                        class="w-full text-left p-3 rounded border transition-all duration-200 group relative overflow-hidden"
                        class:bg-cyan-950={selectedNoteId === note.id}
                        class:border-cyan-500={selectedNoteId === note.id}
                        class:border-transparent={selectedNoteId !== note.id}
                        class:hover:bg-slate-800={selectedNoteId !== note.id}
                        onclick={() => (selectedNoteId = note.id)}
                    >
                        <div class="relative z-10">
                            <div class="flex justify-between items-start mb-1">
                                <div
                                    class="font-bold text-sm truncate flex-1 mr-2"
                                    class:text-cyan-300={selectedNoteId ===
                                        note.id}
                                    class:text-slate-400={selectedNoteId !==
                                        note.id}
                                >
                                    {note.title || "UNTITLED_ENTRY"}
                                </div>
                                {#if note.isEncrypted}
                                    <Lock
                                        size={12}
                                        class="text-cyan-600 mt-1"
                                    />
                                {/if}
                            </div>
                            <div
                                class="text-[10px] text-slate-600 font-mono flex justify-between"
                            >
                                <span>{formatDate(note.updatedAt)}</span>
                                {#if selectedNoteId === note.id}
                                    <ChevronRight size={12} />
                                {/if}
                            </div>
                        </div>

                        {#if selectedNoteId === note.id}
                            <div
                                class="absolute inset-0 bg-cyan-500/5 z-0"
                            ></div>
                        {/if}
                    </button>
                {/each}

                {#if filteredNotes.length === 0}
                    <div class="text-center py-8 text-slate-700 text-xs italic">
                        NO DATA FOUND
                    </div>
                {/if}
            </div>

            <!-- Sidebar Footer -->
            <div
                class="p-2 border-t border-cyan-900/30 flex justify-between items-center bg-slate-950"
            >
                <div class="text-[10px] text-cyan-800">
                    {filteredNotes.length} ENTRIES
                </div>
                {#if selectedNoteId}
                    <button
                        class="p-2 text-red-900 hover:text-red-500 transition-colors"
                        onclick={() => deleteNote(selectedNoteId!)}
                        title="Delete Entry"
                    >
                        <Trash2 size={16} />
                    </button>
                {/if}
            </div>
        </div>

        <!-- Editor Area -->
        <div class="flex-1 flex flex-col bg-slate-900/80 relative">
            {#if selectedNote}
                {#if selectedNote.isEncrypted && !isNoteUnlocked && !showLockSetup}
                    <!-- Locked State Overlay -->
                    <div
                        class="absolute inset-0 z-50 bg-slate-900/95 flex flex-col items-center justify-center p-8"
                        in:fade
                    >
                        <div class="mb-6 text-center mt-4">
                            <div
                                class="text-cyan-500 text-4xl mb-2 animate-pulse"
                            >
                                <Lock size={48} class="inline-block" />
                            </div>
                            <h2
                                class="text-2xl font-bold tracking-[0.2em] text-cyan-400"
                            >
                                ENCRYPTED DATA
                            </h2>
                            <p
                                class="text-xs text-cyan-700 mt-2 tracking-widest"
                            >
                                {#if errorMsg}
                                    <span class="text-red-500 font-bold"
                                        >{errorMsg}</span
                                    >
                                {:else}
                                    AUTHENTICATION REQUIRED
                                {/if}
                            </p>
                        </div>

                        <!-- Password Dots -->
                        <div
                            class="mb-6 flex gap-2 h-12 items-center justify-center"
                        >
                            {#each Array(4) as _, i}
                                <div
                                    class="w-4 h-4 rounded-full border border-cyan-700 transition-all duration-200"
                                    class:bg-cyan-400={inputPassword.length > i}
                                    class:bg-transparent={inputPassword.length <=
                                        i}
                                    class:shadow-[0_0_10px_rgba(34,211,238,0.5)]={inputPassword.length >
                                        i}
                                ></div>
                            {/each}
                        </div>

                        <!-- Numpad -->
                        <div class="grid grid-cols-3 gap-4 w-64">
                            {#each ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as num}
                                <button
                                    class="h-16 w-16 rounded-lg border border-cyan-900 bg-slate-900/50 hover:bg-cyan-900/30 hover:border-cyan-500 text-2xl font-bold text-cyan-400 transition-all active:scale-95 flex items-center justify-center shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                                    onclick={() => handleNumPad(num)}
                                >
                                    {num}
                                </button>
                            {/each}

                            <button
                                class="h-16 w-16 rounded-lg border border-red-900/50 bg-slate-900/50 hover:bg-red-900/30 hover:border-red-500 text-red-400 transition-all active:scale-95 flex items-center justify-center"
                                onclick={() => handleNumPad("DEL")}
                            >
                                <Delete size={24} />
                            </button>

                            <button
                                class="h-16 w-16 rounded-lg border border-cyan-900 bg-slate-900/50 hover:bg-cyan-900/30 hover:border-cyan-500 text-2xl font-bold text-cyan-400 transition-all active:scale-95 flex items-center justify-center"
                                onclick={() => handleNumPad("0")}
                            >
                                0
                            </button>

                            <button
                                class="h-16 w-16 rounded-lg border border-green-900/50 bg-slate-900/50 hover:bg-green-900/30 hover:border-green-500 text-green-400 transition-all active:scale-95 flex items-center justify-center"
                                onclick={() => handleNumPad("ENTER")}
                            >
                                <Check size={24} />
                            </button>
                        </div>
                    </div>
                {:else if showLockSetup}
                    <!-- Setup Lock Overlay -->
                    <div
                        class="absolute inset-0 z-50 bg-slate-900/95 flex flex-col items-center justify-center p-8"
                        in:fade
                    >
                        <div class="mb-6 text-center mt-4">
                            <div class="text-cyan-500 text-4xl mb-2">
                                <Shield size={48} class="inline-block" />
                            </div>
                            <h2
                                class="text-2xl font-bold tracking-[0.2em] text-cyan-400"
                            >
                                {setupStep === 0
                                    ? "SET PASSWORD"
                                    : "CONFIRM PASSWORD"}
                            </h2>
                            <p
                                class="text-xs text-cyan-700 mt-2 tracking-widest"
                            >
                                {#if errorMsg}
                                    <span class="text-red-500 font-bold"
                                        >{errorMsg}</span
                                    >
                                {:else}
                                    SECURE THIS ENTRY
                                {/if}
                            </p>
                        </div>

                        <!-- Password Dots -->
                        <div
                            class="mb-6 flex gap-2 h-12 items-center justify-center"
                        >
                            {#each Array(4) as _, i}
                                <div
                                    class="w-4 h-4 rounded-full border border-cyan-700 transition-all duration-200"
                                    class:bg-cyan-400={inputPassword.length > i}
                                    class:bg-transparent={inputPassword.length <=
                                        i}
                                    class:shadow-[0_0_10px_rgba(34,211,238,0.5)]={inputPassword.length >
                                        i}
                                ></div>
                            {/each}
                        </div>

                        <!-- Numpad -->
                        <div class="grid grid-cols-3 gap-4 w-64">
                            {#each ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as num}
                                <button
                                    class="h-16 w-16 rounded-lg border border-cyan-900 bg-slate-900/50 hover:bg-cyan-900/30 hover:border-cyan-500 text-2xl font-bold text-cyan-400 transition-all active:scale-95 flex items-center justify-center shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                                    onclick={() => handleNumPad(num)}
                                >
                                    {num}
                                </button>
                            {/each}

                            <button
                                class="h-16 w-16 rounded-lg border border-red-900/50 bg-slate-900/50 hover:bg-red-900/30 hover:border-red-500 text-red-400 transition-all active:scale-95 flex items-center justify-center"
                                onclick={() => handleNumPad("DEL")}
                            >
                                <Delete size={24} />
                            </button>

                            <button
                                class="h-16 w-16 rounded-lg border border-cyan-900 bg-slate-900/50 hover:bg-cyan-900/30 hover:border-cyan-500 text-2xl font-bold text-cyan-400 transition-all active:scale-95 flex items-center justify-center"
                                onclick={() => handleNumPad("0")}
                            >
                                0
                            </button>

                            <button
                                class="h-16 w-16 rounded-lg border border-green-900/50 bg-slate-900/50 hover:bg-green-900/30 hover:border-green-500 text-green-400 transition-all active:scale-95 flex items-center justify-center"
                                onclick={() => handleNumPad("ENTER")}
                            >
                                <Check size={24} />
                            </button>
                        </div>

                        <button
                            class="mt-8 mb-4 text-xs text-slate-500 hover:text-slate-300 underline"
                            onclick={() => {
                                showLockSetup = false;
                                inputPassword = "";
                                setupStep = 0;
                            }}
                        >
                            CANCEL
                        </button>
                    </div>
                {/if}

                <!-- Editor Header -->
                <div
                    class="h-14 border-b border-cyan-900/30 flex items-center px-6 bg-slate-900 justify-between"
                >
                    <div class="flex items-center flex-1 mr-4">
                        <FileText size={18} class="text-cyan-700 mr-3" />
                        <input
                            type="text"
                            bind:value={selectedNote.title}
                            oninput={updateNote}
                            placeholder="ENTER_TITLE"
                            class="flex-1 bg-transparent border-none text-lg font-bold text-cyan-100 focus:outline-none placeholder-cyan-900/50"
                        />
                    </div>

                    <div class="flex items-center gap-2">
                        <!-- Lock Toggle -->
                        {#if selectedNote.isEncrypted}
                            {#if isNoteUnlocked}
                                <button
                                    class="flex items-center gap-2 px-3 py-1 rounded border border-red-900/50 text-xs text-red-400 hover:bg-red-900/20 transition-colors"
                                    onclick={removeLock}
                                    title="Remove Encryption"
                                >
                                    <Unlock size={14} />
                                    <span>UNLOCK</span>
                                </button>
                            {:else}
                                <div
                                    class="flex items-center gap-2 px-3 py-1 rounded border border-cyan-900/50 text-xs text-cyan-400 bg-cyan-900/10"
                                >
                                    <Lock size={14} />
                                    <span>LOCKED</span>
                                </div>
                            {/if}
                        {:else}
                            <button
                                class="flex items-center gap-2 px-3 py-1 rounded border border-cyan-900/50 text-xs text-cyan-400 hover:bg-cyan-900/20 transition-colors"
                                onclick={() => {
                                    showLockSetup = true;
                                }}
                                title="Encrypt Note"
                            >
                                <Shield size={14} />
                                <span>PROTECT</span>
                            </button>
                        {/if}

                        <!-- View Toggle -->
                        {#if !selectedNote.isEncrypted || isNoteUnlocked}
                            <button
                                class="flex items-center gap-2 px-3 py-1 rounded border border-cyan-900/50 text-xs text-cyan-400 hover:bg-cyan-900/20 transition-colors"
                                onclick={() => (isViewMode = !isViewMode)}
                            >
                                {#if isViewMode}
                                    <Edit3 size={14} />
                                    <span>EDIT</span>
                                {:else}
                                    <Eye size={14} />
                                    <span>VIEW</span>
                                {/if}
                            </button>
                        {/if}
                    </div>
                </div>

                <!-- Editor Content -->
                <div class="flex-1 relative overflow-hidden">
                    {#if isViewMode}
                        <!-- Markdown Preview -->
                        <div
                            class="w-full h-full p-6 overflow-y-auto custom-scrollbar prose prose-invert prose-cyan max-w-none"
                        >
                            {@html renderedContent}
                        </div>
                    {:else}
                        <!-- Text Editor -->
                        <textarea
                            bind:value={selectedNote.content}
                            oninput={updateNote}
                            placeholder="Begin data entry..."
                            class="w-full h-full bg-transparent p-6 text-sm text-slate-300 font-mono resize-none focus:outline-none custom-scrollbar leading-relaxed selection:bg-cyan-500/30"
                        ></textarea>
                    {/if}

                    <!-- Decorative Corner -->
                    <div
                        class="absolute bottom-0 right-0 p-4 pointer-events-none opacity-20"
                    >
                        <div
                            class="border-b-2 border-r-2 border-cyan-500 w-8 h-8"
                        ></div>
                    </div>
                </div>
            {:else}
                <!-- Empty State -->
                <div
                    class="flex-1 flex flex-col items-center justify-center text-cyan-900/30 select-none"
                >
                    <div
                        class="w-24 h-24 border-2 border-dashed border-cyan-900/30 rounded-lg flex items-center justify-center mb-4"
                    >
                        <FileText size={48} />
                    </div>
                    <p class="text-sm tracking-widest">
                        SELECT OR CREATE ENTRY
                    </p>
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    /* Custom Scrollbar */
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
        background: rgba(8, 145, 178, 0.6);
    }

    /* Prose Overrides for Cyberpunk feel */
    :global(.prose) {
        color: #cbd5e1; /* slate-300 */
        max-width: none;
    }

    :global(.prose h1) {
        color: #22d3ee;
        font-family: monospace;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-size: 2em;
        border-bottom: 1px solid rgba(34, 211, 238, 0.3);
        padding-bottom: 0.3em;
        margin-top: 1em;
        margin-bottom: 0.5em;
    }

    :global(.prose h2) {
        color: #22d3ee;
        font-family: monospace;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-size: 1.5em;
        margin-top: 1em;
        margin-bottom: 0.5em;
    }

    :global(.prose h3) {
        color: #67e8f9;
        font-family: monospace;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-size: 1.25em;
        margin-top: 1em;
        margin-bottom: 0.5em;
    }

    :global(.prose h4, .prose h5, .prose h6) {
        color: #67e8f9;
        font-family: monospace;
        font-size: 1.1em;
        margin-top: 1em;
        margin-bottom: 0.5em;
    }

    :global(.prose a) {
        color: #22d3ee;
        text-decoration: none;
        border-bottom: 1px dashed #22d3ee;
        transition: all 0.2s;
    }

    :global(.prose a:hover) {
        background: rgba(34, 211, 238, 0.1);
    }

    :global(.prose code) {
        color: #a5f3fc;
        background: rgba(22, 78, 99, 0.5);
        padding: 0.2em 0.4em;
        border-radius: 0.25em;
        font-family: monospace;
    }

    :global(.prose pre) {
        background: rgba(15, 23, 42, 0.8);
        border: 1px solid rgba(34, 211, 238, 0.2);
        padding: 1em;
        border-radius: 0.5em;
        overflow-x: auto;
    }

    :global(.prose strong) {
        color: #22d3ee;
        font-weight: bold;
    }

    :global(.prose em) {
        color: #67e8f9;
        font-style: italic;
    }

    :global(.prose blockquote) {
        border-left: 4px solid #0891b2;
        background: rgba(8, 145, 178, 0.1);
        padding: 0.5em 1em;
        margin: 1em 0;
        color: #94a3b8;
        font-style: italic;
    }

    :global(.prose ul) {
        list-style-type: disc;
        padding-left: 1.5em;
        margin: 1em 0;
    }

    :global(.prose ol) {
        list-style-type: decimal;
        padding-left: 1.5em;
        margin: 1em 0;
    }

    :global(.prose li) {
        margin: 0.25em 0;
    }

    :global(.prose hr) {
        border-color: rgba(34, 211, 238, 0.3);
        margin: 2em 0;
    }
</style>
