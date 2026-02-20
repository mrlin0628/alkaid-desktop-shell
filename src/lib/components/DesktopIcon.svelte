<script lang="ts">
    let { onClick } = $props<{ onClick: () => void }>();
</script>

<button class="group flex flex-col items-center gap-1" onclick={onClick}>
    <div
        class="w-12 h-12 rounded-lg bg-black bg-opacity-60 border border-cyber-blue flex items-center justify-center hover:bg-cyber-blue hover:bg-opacity-20 hover:shadow-[0_0_15px_rgba(0,255,255,0.5)] transition-all duration-300 backdrop-blur-sm"
    >
        <div class="w-6 h-6 grid grid-cols-2 gap-1">
            <div
                class="bg-cyber-blue rounded-sm opacity-80 group-hover:bg-white transition-colors"
            ></div>
            <div
                class="bg-cyber-blue rounded-sm opacity-60 group-hover:bg-white transition-colors"
            ></div>
            <div
                class="bg-cyber-blue rounded-sm opacity-60 group-hover:bg-white transition-colors"
            ></div>
            <div
                class="bg-cyber-blue rounded-sm opacity-80 group-hover:bg-white transition-colors"
            ></div>
        </div>
    </div>
    <span
        class="text-xs text-cyber-blue font-medium shadow-black drop-shadow-md group-hover:text-white transition-colors"
        >START</span
    >
</button>
