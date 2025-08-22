import { render } from '@testing-library/svelte/svelte5';
import ToolContent from './src/lib/components/ToolContent.svelte';

const tool = {
  id: 'test',
  name: 'Test',
  icon: 'x',
  type: 'component',
  source: 'Test',
  category: 'test'
};

try {
  render(ToolContent, { props: { tool, windowId: 'test' } });
  console.log('Render successful');
} catch (error) {
  console.log('Error:', error.message);
  console.log('Stack:', error.stack);
}
