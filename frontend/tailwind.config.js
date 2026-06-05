/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'app-bg':       '#F0F4F8',
        'navy':         '#1A2B4B',
        'finblue':      '#1A73E8',
        'finblue-pale': '#EEF4FF',
        'finblue-tint': '#F5F8FF',
        'finblue-sky':  '#4FC3F7',
        'success':      '#10B981',
        'danger':       '#EF4444',
      },
      boxShadow: {
        'blue':        '0 4px 14px rgba(26,115,232,0.35)',
        'blue-lg':     '0 8px 24px rgba(26,115,232,0.45)',
        'card':        '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover':  '0 4px 12px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.06)',
        'soft':        '0 4px 20px rgba(0,0,0,0.08)',
        'icon':        '0 2px 8px rgba(0,0,0,0.12)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in':  'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
