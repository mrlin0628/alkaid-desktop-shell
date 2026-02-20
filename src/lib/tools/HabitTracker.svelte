<script lang="ts">
    import { onMount, tick } from "svelte";
    import { fade, scale } from "svelte/transition";

    let currentDate = new Date();
    let checkIns = new Set<string>();
    let isCheckedInToday = false;
    let showEffect = false;

    // Long press variables
    let progress = 0;
    let isHolding = false;
    let holdStartTime = 0;
    let animationFrame: number;
    const HOLD_DURATION = 1500; // 1.5 seconds

    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Helper to format date as YYYY-MM-DD
    function formatDate(date: Date): string {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }

    onMount(() => {
        const stored = localStorage.getItem("alkaid-habit-checkins");
        if (stored) {
            checkIns = new Set(JSON.parse(stored));
        }
        checkStatus();
    });

    function checkStatus() {
        const today = formatDate(new Date());
        isCheckedInToday = checkIns.has(today);
    }

    function saveCheckIns() {
        localStorage.setItem(
            "alkaid-habit-checkins",
            JSON.stringify(Array.from(checkIns)),
        );
    }

    function prevMonth() {
        currentDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 1,
            1,
        );
    }

    function nextMonth() {
        currentDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() + 1,
            1,
        );
    }

    function startHold() {
        if (isCheckedInToday) return;
        isHolding = true;
        holdStartTime = Date.now();
        progress = 0;
        tick();
        animationFrame = requestAnimationFrame(tickAnimation);
    }

    function stopHold() {
        if (!isHolding) return;
        isHolding = false;
        progress = 0;
        if (animationFrame) cancelAnimationFrame(animationFrame);
    }

    function tickAnimation() {
        if (!isHolding) return;
        const elapsed = Date.now() - holdStartTime;
        progress = Math.min((elapsed / HOLD_DURATION) * 100, 100);

        if (progress >= 100) {
            handleCheckIn();
            stopHold();
        } else {
            animationFrame = requestAnimationFrame(tickAnimation);
        }
    }

    function handleCheckIn() {
        if (isCheckedInToday) return;

        const today = formatDate(new Date());
        checkIns.add(today);
        checkIns = checkIns; // Trigger reactivity
        saveCheckIns();
        isCheckedInToday = true;

        // Trigger effect
        showEffect = true;
        setTimeout(() => {
            showEffect = false;
        }, 2000);
    }

    function resetCheckIn() {
        if (!isCheckedInToday) return;
        const today = formatDate(new Date());
        checkIns.delete(today);
        checkIns = checkIns;
        saveCheckIns();
        isCheckedInToday = false;
    }

    $: year = currentDate.getFullYear();
    $: month = currentDate.getMonth();
    $: monthName = currentDate.toLocaleString("default", { month: "long" });

    interface CalendarDay {
        date: Date;
        day: number;
        isToday: boolean;
        isChecked: boolean;
    }

    let calendarDays: CalendarDay[] = [];
    let daysInMonth: number;
    let firstDayOfWeek: number;

    $: {
        daysInMonth = new Date(year, month + 1, 0).getDate();
        firstDayOfWeek = new Date(year, month, 1).getDay();

        calendarDays = Array(daysInMonth)
            .fill(0)
            .map((_, i) => {
                const d = new Date(year, month, i + 1);
                const dateStr = formatDate(d);
                return {
                    date: d,
                    day: i + 1,
                    isToday: dateStr === formatDate(new Date()),
                    isChecked: checkIns.has(dateStr),
                };
            });
    }
</script>

<div
    class="h-full w-full flex flex-col bg-gray-900 text-cyan-400 p-4 font-mono relative overflow-hidden"
>
    <!-- Header -->
    <div
        class="flex justify-between items-center mb-4 border-b border-cyan-500/30 pb-2"
    >
        <button
            class="p-2 hover:bg-cyan-500/10 rounded transition-colors"
            on:click={prevMonth}>&lt;</button
        >
        <h2 class="text-xl font-bold tracking-wider">{monthName} {year}</h2>
        <button
            class="p-2 hover:bg-cyan-500/10 rounded transition-colors"
            on:click={nextMonth}>&gt;</button
        >
    </div>

    <!-- Calendar Grid -->
    <div class="grid grid-cols-7 gap-1 mb-4 flex-1">
        {#each weekDays as day}
            <div
                class="text-center text-xs text-cyan-600 font-bold uppercase py-2"
            >
                {day}
            </div>
        {/each}

        {#each Array(firstDayOfWeek) as _}
            <div class="p-2"></div>
        {/each}

        {#each calendarDays as day}
            <div
                class="relative p-2 border border-cyan-900/50 rounded flex items-center justify-center
               {day.isToday
                    ? 'border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                    : ''}
               {day.isChecked ? 'bg-cyan-900/40' : 'hover:bg-cyan-900/20'}"
            >
                <span class={day.isChecked ? "text-cyan-200" : "text-cyan-500"}
                    >{day.day}</span
                >
                {#if day.isChecked}
                    <div
                        class="absolute inset-0 flex items-center justify-center"
                        in:scale
                    >
                        <span class="text-cyan-400 text-lg">✓</span>
                    </div>
                {/if}
            </div>
        {/each}
    </div>

    <!-- Check-in Button -->
    <div class="mt-auto pt-4 border-t border-cyan-500/30 flex gap-2">
        <button
            class="relative flex-1 py-3 px-6 rounded font-bold text-lg tracking-widest uppercase transition-all duration-300 overflow-hidden select-none
             {isCheckedInToday
                ? 'bg-green-900/50 text-green-400 cursor-default border border-green-500/50'
                : 'bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-400 border border-cyan-500/50 cursor-pointer'}"
            on:mousedown={startHold}
            on:mouseup={stopHold}
            on:mouseleave={stopHold}
            on:touchstart|preventDefault={startHold}
            on:touchend|preventDefault={stopHold}
        >
            <!-- Progress Fill -->
            {#if !isCheckedInToday}
                <div
                    class="absolute inset-0 bg-cyan-600/50 transition-all duration-75 ease-linear"
                    style="width: {progress}%;"
                ></div>
            {/if}

            <span class="relative z-10">
                {isCheckedInToday ? "MISSION ACCOMPLISHED" : "HOLD TO CHECK-IN"}
            </span>
        </button>

        {#if isCheckedInToday}
            <button
                class="px-4 rounded border border-red-500/30 text-red-400 hover:bg-red-900/20 transition-colors"
                on:click={resetCheckIn}
                title="Reset Check-in"
            >
                ↺
            </button>
        {/if}
    </div>

    <!-- Visual Effects -->
    {#if showEffect}
        <div
            class="absolute inset-0 pointer-events-none flex items-center justify-center z-50"
        >
            <div class="absolute inset-0 bg-cyan-500/20 animate-pulse"></div>
            <div
                class="text-4xl font-bold text-white drop-shadow-[0_0_10px_rgba(34,211,238,1)]"
                in:scale
                out:fade
            >
                STREAK UPDATED
            </div>
        </div>
    {/if}
</div>

<style>
    /* Custom scrollbar for calendar if needed */
    ::-webkit-scrollbar {
        width: 4px;
    }
    ::-webkit-scrollbar-track {
        background: #0f172a;
    }
    ::-webkit-scrollbar-thumb {
        background: #0891b2;
        border-radius: 2px;
    }
</style>
