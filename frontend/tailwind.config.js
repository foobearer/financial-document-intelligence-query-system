/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary':   '#0a0a0f',
        'bg-secondary': '#111118',
        'bg-tertiary':  '#1a1a24',
        'border-dim':   '#2a2a3a',
        'text-primary': '#e8e8f0',
        'text-muted':   '#7a7a9a',
        'accent':       '#00ff9d',
        'risk-high':    '#ff6b6b',
        'risk-med':     '#ff9d00',
        'risk-low':     '#00ff9d',
        'purple':       '#7c6af7',
      },
      fontFamily: {
        mono:    ['JetBrains Mono', 'monospace'],
        display: ['Syne', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
