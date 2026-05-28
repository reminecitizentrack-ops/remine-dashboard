/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ── Typographie ─────────────────────────────────────────────────────────
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },

      // ── Couleurs brand ───────────────────────────────────────────────────────
      colors: {
        brand: {
          50:  '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        surface: {
          light: '#ffffff',
          muted:  '#f8fafc',
          border: '#f1f5f9',
          dark:   '#1e293b',
          darker: '#0f172a',
        },
      },

      // ── Border radius ────────────────────────────────────────────────────────
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },

      // ── Box shadows ──────────────────────────────────────────────────────────
      boxShadow: {
        'card':   '0 2px 8px 0 rgba(0,0,0,0.05), 0 1px 2px 0 rgba(0,0,0,0.04)',
        'card-md':'0 4px 16px 0 rgba(0,0,0,0.08), 0 2px 4px 0 rgba(0,0,0,0.04)',
        'card-lg':'0 8px 32px 0 rgba(0,0,0,0.10), 0 4px 8px 0 rgba(0,0,0,0.04)',
        'brand':  '0 4px 16px 0 rgba(16,185,129,0.25)',
        'inner-sm':'inset 0 1px 3px 0 rgba(0,0,0,0.06)',
      },

      // ── Animations ───────────────────────────────────────────────────────────
      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-right': {
          '0%':   { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition:  '200% center' },
        },
        'ping-slow': {
          '0%':   { transform: 'scale(1)',    opacity: '0.4' },
          '75%':  { transform: 'scale(1.8)', opacity: '0'   },
          '100%': { transform: 'scale(1.8)', opacity: '0'   },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':       { transform: 'translateY(-4px)' },
        },
        'progress-fill': {
          '0%':   { width: '0%' },
          '100%': { width: 'var(--progress-width, 100%)' },
        },
        'count-up': {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in':       'fade-in 0.3s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in-right': 'fade-in-right 0.3s cubic-bezier(0.22,1,0.36,1) both',
        'scale-in':      'scale-in 0.25s cubic-bezier(0.22,1,0.36,1) both',
        'shimmer':       'shimmer 2.5s linear infinite',
        'ping-slow':     'ping-slow 2s ease-out infinite',
        'float':         'float 3s ease-in-out infinite',
        'progress-fill': 'progress-fill 1s cubic-bezier(0.22,1,0.36,1) both',
        'count-up':      'count-up 0.4s cubic-bezier(0.22,1,0.36,1) both',
      },

      // ── Transitions ──────────────────────────────────────────────────────────
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      transitionDuration: {
        '400': '400ms',
      },
    },
  },
  plugins: [],
};