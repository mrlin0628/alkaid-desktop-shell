/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        'cyber-dark': '#0a0a0a',
        'cyber-blue': '#00ffff',
        'cyber-pink': '#ff00ff',
        'cyber-green': '#00ff41',
        'cyber-purple': '#8b5cf6'
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'monospace']
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'pulse-glow': 'pulse-glow 1.5s ease-in-out infinite'
      },
      keyframes: {
        'glow': {
          'from': { 'box-shadow': '0 0 5px #00ffff, 0 0 10px #00ffff, 0 0 15px #00ffff' },
          'to': { 'box-shadow': '0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 30px #00ffff' }
        },
        'pulse-glow': {
          '0%, 100%': { 'box-shadow': '0 0 5px #ff00ff' },
          '50%': { 'box-shadow': '0 0 20px #ff00ff, 0 0 30px #ff00ff' }
        }
      }
    },
  },
  plugins: [],
}