<script lang="ts">
    import { enhance } from "$app/forms";
    export let form;

    let terminalInput: HTMLInputElement;
    let isFocused = true;
    let inputValue = "";

    function handleContainerClick() {
        terminalInput?.focus();
        isFocused = true;
    }
</script>

<div
    class="login-container"
    on:click={handleContainerClick}
    role="button"
    tabindex="0"
    on:keydown={(e) => {
        if (e.key === "Enter") handleContainerClick();
    }}
>
    <div class="terminal {form?.incorrect ? 'error-flash' : ''}">
        <span class="prompt">&gt; </span>

        <!-- The visual representation of the input -->
        <span class="input-text">
            {#if inputValue.length > 0}
                <!-- Render asterisks or dots for password hiding, or leave as text if desired. Usually terminals don't echo password characters at all, but giving some feedback is good. We'll use * -->
                {"*".repeat(inputValue.length)}
            {/if}
        </span>

        <!-- Custom caret block -->
        <div class="caret {isFocused ? 'blink' : 'hidden'}"></div>

        <form method="POST" use:enhance class="hidden-form">
            <input
                bind:this={terminalInput}
                bind:value={inputValue}
                type="password"
                name="password"
                autocomplete="off"
                on:focus={() => (isFocused = true)}
                on:blur={() => (isFocused = false)}
            />
        </form>
    </div>
</div>

<style>
    :global(body, html) {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background-color: #000;
        overflow: hidden;
    }

    .login-container {
        width: 100vw;
        height: 100vh;
        background-color: #000;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: text;
    }

    .terminal {
        display: flex;
        align-items: center;
        font-family: "Courier New", Courier, monospace;
        font-size: 1.5rem;
        color: #0f0;
        position: relative;
    }

    .prompt {
        margin-right: 10px;
        color: #0f0;
        user-select: none;
    }

    .input-text {
        white-space: pre;
        color: #0f0;
    }

    /* Hide the actual form and input, we only use it to capture keystrokes and submit */
    .hidden-form {
        position: absolute;
        opacity: 0;
        pointer-events: none;
    }

    .hidden-form input {
        width: 1px;
        height: 1px;
        padding: 0;
        margin: 0;
        border: none;
    }

    .caret {
        display: inline-block;
        width: 12px;
        height: 1.5rem;
        background-color: #0f0;
        margin-left: 2px;
        transform: translateY(2px);
    }

    .caret.hidden {
        opacity: 0 !important;
    }

    .blink {
        animation: blink-animation 1s step-end infinite;
    }

    @keyframes blink-animation {
        0%,
        100% {
            opacity: 1;
        }
        50% {
            opacity: 0;
        }
    }

    .error-flash {
        animation: error-glitch 0.3s ease-out;
    }

    @keyframes error-glitch {
        0% {
            color: #f00;
            transform: translateX(-5px);
        }
        25% {
            color: #f00;
            transform: translateX(5px);
        }
        50% {
            color: #f00;
            transform: translateX(-5px);
        }
        75% {
            color: #f00;
            transform: translateX(5px);
        }
        100% {
            color: #0f0;
            transform: translateX(0);
        }
    }
</style>
