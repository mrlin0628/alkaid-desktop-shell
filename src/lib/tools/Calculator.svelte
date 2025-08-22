<script lang="ts">
  import { Calculator as CalculatorIcon, Delete } from 'lucide-svelte';
  import type { Tool } from '../types';

  let { windowId, tool }: { windowId: string; tool: Tool } = $props();
  
  let display_value = $state('0');
  let previous_value = $state<number | null>(null);
  let current_operation = $state<string | null>(null);
  let waiting_for_new_value = $state(false);
  let has_decimal = $state(false);

  const buttons = [
    [{ label: 'C', type: 'clear' }, { label: '±', type: 'negate' }, { label: '%', type: 'percent' }, { label: '÷', type: 'operator', value: '/' }],
    [{ label: '7', type: 'number' }, { label: '8', type: 'number' }, { label: '9', type: 'number' }, { label: '×', type: 'operator', value: '*' }],
    [{ label: '4', type: 'number' }, { label: '5', type: 'number' }, { label: '6', type: 'number' }, { label: '−', type: 'operator', value: '-' }],
    [{ label: '1', type: 'number' }, { label: '2', type: 'number' }, { label: '3', type: 'number' }, { label: '+', type: 'operator', value: '+' }],
    [{ label: '0', type: 'number', span: 2 }, { label: '.', type: 'decimal' }, { label: '=', type: 'equals' }]
  ];

  const clear = () => {
    display_value = '0';
    previous_value = null;
    current_operation = null;
    waiting_for_new_value = false;
    has_decimal = false;
  };

  const negate = () => {
    if (display_value !== '0') {
      display_value = display_value.startsWith('-') 
        ? display_value.slice(1) 
        : '-' + display_value;
    }
  };

  const percent = () => {
    const current = parseFloat(display_value);
    display_value = (current / 100).toString();
    waiting_for_new_value = true;
  };

  const input_number = (num: string) => {
    if (waiting_for_new_value) {
      display_value = num;
      waiting_for_new_value = false;
      has_decimal = false;
    } else {
      display_value = display_value === '0' ? num : display_value + num;
    }
  };

  const input_decimal = () => {
    if (waiting_for_new_value) {
      display_value = '0.';
      waiting_for_new_value = false;
      has_decimal = true;
    } else if (!has_decimal) {
      display_value += '.';
      has_decimal = true;
    }
  };

  const perform_operation = (operation: string) => {
    const current = parseFloat(display_value);
    
    if (previous_value === null) {
      previous_value = current;
    } else if (current_operation && !waiting_for_new_value) {
      const result = calculate(previous_value, current, current_operation);
      display_value = result.toString();
      previous_value = result;
    }
    
    current_operation = operation;
    waiting_for_new_value = true;
    has_decimal = false;
  };

  const calculate = (first: number, second: number, operation: string): number => {
    switch (operation) {
      case '+':
        return first + second;
      case '-':
        return first - second;
      case '*':
        return first * second;
      case '/':
        return second !== 0 ? first / second : 0;
      default:
        return second;
    }
  };

  const equals = () => {
    if (current_operation && previous_value !== null && !waiting_for_new_value) {
      const current = parseFloat(display_value);
      const result = calculate(previous_value, current, current_operation);
      display_value = result.toString();
      previous_value = null;
      current_operation = null;
      waiting_for_new_value = true;
      has_decimal = display_value.includes('.');
    }
  };

  const handle_button_click = (button: any) => {
    switch (button.type) {
      case 'clear':
        clear();
        break;
      case 'negate':
        negate();
        break;
      case 'percent':
        percent();
        break;
      case 'number':
        input_number(button.label);
        break;
      case 'decimal':
        input_decimal();
        break;
      case 'operator':
        perform_operation(button.value);
        break;
      case 'equals':
        equals();
        break;
    }
  };
</script>

<div class="flex flex-col h-full bg-gray-900 text-gray-100">
  <!-- Header -->
  <div class="flex items-center space-x-3 p-4 bg-gray-800 border-b border-gray-700">
    <CalculatorIcon class="h-5 w-5 text-blue-400" />
    <span class="font-medium text-blue-300">Calculator</span>
  </div>

  <!-- Display -->
  <div class="p-6 bg-black/50 border-b border-gray-700">
    <div 
      class="text-right text-4xl font-mono text-white bg-gray-900 rounded-lg p-4 border border-gray-700 min-h-[80px] flex items-center justify-end"
      data-testid="calculator-display"
    >
      {display_value}
    </div>
  </div>

  <!-- Button Grid -->
  <div class="flex-1 p-4">
    <div class="grid grid-cols-4 gap-3 h-full">
      {#each buttons as row}
        {#each row as button}
          <button
            onclick={() => handle_button_click(button)}
            class="
              rounded-lg font-semibold text-lg transition-all duration-150
              {button.type === 'clear' ? 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30' : 
               button.type === 'negate' || button.type === 'percent' ? 'bg-gray-600/50 hover:bg-gray-600/70 text-gray-300 border border-gray-500/30' :
               button.type === 'operator' || button.type === 'equals' ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30' :
               'bg-gray-700/50 hover:bg-gray-700/70 text-white border border-gray-600/30'}
              {button.span === 2 ? 'col-span-2' : ''}
              active:scale-95 hover:scale-105
            "
            data-testid="calc-button-{button.label}"
          >
            {button.label}
          </button>
        {/each}
      {/each}
    </div>
  </div>

  <!-- Status Bar -->
  <div class="px-4 py-2 bg-gray-800 border-t border-gray-700 text-sm text-gray-400">
    <div class="flex items-center justify-between">
      <span>Standard Calculator</span>
      {#if current_operation}
        <span class="text-blue-400">Operation: {current_operation}</span>
      {/if}
    </div>
  </div>
</div>