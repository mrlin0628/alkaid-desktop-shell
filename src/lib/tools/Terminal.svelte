<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Terminal as TerminalIcon, Send, Trash2 } from 'lucide-svelte';
  import type { Tool } from '../types';

  let { windowId, tool }: { windowId: string; tool: Tool } = $props();
  
  let terminal_output = $state<string[]>([
    'Welcome to Alkaid Terminal v1.0',
    'Type "help" for available commands.',
    ''
  ]);
  let current_input = $state('');
  let terminal_ref: HTMLDivElement | null = $state(null);
  let input_ref: HTMLInputElement | null = $state(null);
  let current_directory = $state('/home/user');

  const commands = {
    help: () => [
      'Available commands:',
      '  ls        - List directory contents',
      '  pwd       - Show current directory',
      '  cd <path> - Change directory',
      '  clear     - Clear terminal output',
      '  date      - Show current date and time',
      '  whoami    - Show current user',
      '  echo <text> - Echo text to output',
      '  help      - Show this help message'
    ],
    ls: () => [
      'Documents/',
      'Downloads/',
      'Pictures/',
      'config.json',
      'readme.txt'
    ],
    pwd: () => [current_directory],
    cd: (args: string[]) => {
      if (args.length === 0) {
        current_directory = '/home/user';
        return [`Changed directory to ${current_directory}`];
      }
      const path = args.join(' ');
      if (path === '..' || path === '../') {
        current_directory = '/home';
        return [`Changed directory to ${current_directory}`];
      }
      current_directory = `${current_directory}/${path}`.replace('//', '/');
      return [`Changed directory to ${current_directory}`];
    },
    clear: () => {
      terminal_output = [];
      return [];
    },
    date: () => [new Date().toLocaleString()],
    whoami: () => ['user'],
    echo: (args: string[]) => [args.join(' ')]
  };

  const scroll_to_bottom = () => {
    if (terminal_ref) {
      terminal_ref.scrollTop = terminal_ref.scrollHeight;
    }
  };

  const execute_command = (command_line: string) => {
    const trimmed = command_line.trim();
    if (!trimmed) return;

    // Add command to output
    terminal_output = [...terminal_output, `${current_directory}$ ${trimmed}`];

    // Parse command
    const parts = trimmed.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Execute command
    let result: string[] = [];
    if (command in commands) {
      result = (commands as any)[command](args);
    } else {
      result = [`Command not found: ${command}. Type "help" for available commands.`];
    }

    // Add result to output
    if (result.length > 0) {
      terminal_output = [...terminal_output, ...result];
    }
    
    // Add empty line for readability
    terminal_output = [...terminal_output, ''];
    
    // Scroll to bottom
    setTimeout(scroll_to_bottom, 10);
  };

  const handle_submit = () => {
    if (current_input.trim()) {
      execute_command(current_input);
      current_input = '';
    }
  };

  const handle_keydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      handle_submit();
    } else if (e.key === 'ArrowUp') {
      // TODO: Command history
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      // TODO: Command history
      e.preventDefault();
    }
  };

  const clear_terminal = () => {
    terminal_output = [];
  };

  const focus_input = () => {
    input_ref?.focus();
  };

  onMount(() => {
    focus_input();
    scroll_to_bottom();
  });
</script>

<div class="flex flex-col h-full bg-gray-900 text-gray-100 font-mono">
  <!-- Header -->
  <div class="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
    <div class="flex items-center space-x-3">
      <TerminalIcon class="h-5 w-5 text-green-400" />
      <span class="font-medium text-green-300">Terminal</span>
    </div>
    <button
      onclick={clear_terminal}
      class="p-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300
             border border-red-500/30 transition-colors duration-200"
      data-testid="terminal-clear"
    >
      <Trash2 class="h-4 w-4" />
    </button>
  </div>

  <!-- Terminal Output -->
  <div 
    bind:this={terminal_ref}
    class="flex-1 overflow-auto p-4 bg-black/50 scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-gray-600"
    onclick={focus_input}
    data-testid="terminal-output"
  >
    {#each terminal_output as line}
      <div class="text-green-300 whitespace-pre-wrap leading-relaxed">
        {line || '\u00A0'}
      </div>
    {/each}
    
    <!-- Current Input Line -->
    <div class="flex items-center space-x-2 text-green-300">
      <span class="text-cyan-400">{current_directory}$</span>
      <input
        bind:this={input_ref}
        bind:value={current_input}
        onkeydown={handle_keydown}
        class="flex-1 bg-transparent border-none outline-none text-green-300 placeholder-gray-500"
        placeholder="Enter command..."
        autocomplete="off"
        spellcheck="false"
        data-testid="terminal-input"
      />
      <button
        onclick={handle_submit}
        class="p-1 rounded bg-green-600/20 hover:bg-green-600/30 text-green-400 hover:text-green-300
               transition-colors duration-200"
        data-testid="terminal-submit"
      >
        <Send class="h-4 w-4" />
      </button>
    </div>
  </div>

  <!-- Status Bar -->
  <div class="px-4 py-2 bg-gray-800 border-t border-gray-700 text-sm text-gray-400">
    <div class="flex items-center justify-between">
      <span>Session: {windowId}</span>
      <span class="text-green-400">Connected</span>
    </div>
  </div>
</div>

<style>
  .scrollbar-thin {
    scrollbar-width: thin;
  }
  
  .scrollbar-track-gray-900::-webkit-scrollbar-track {
    background-color: rgb(17 24 39);
  }
  
  .scrollbar-thumb-gray-600::-webkit-scrollbar-thumb {
    background-color: rgb(75 85 99);
    border-radius: 4px;
  }
  
  ::-webkit-scrollbar {
    width: 6px;
  }
</style>