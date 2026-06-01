/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Base surfaces
        canvas:  '#0a0e1a',
        surface: '#111827',
        border:  '#1e2d40',

        // Text
        'text-primary':   '#f1f5f9',
        'text-secondary': '#94a3b8',
        'text-mono':      '#93c5fd',

        // Interactive / brand
        accent:    '#2563eb',
        secondary: '#7c3aed',

        // WAF pillar semantic colors — each pillar owns one color throughout the UI
        waf: {
          reliability:   '#3b82f6', // blue
          security:      '#7c3aed', // violet
          cost:          '#10b981', // emerald
          operations:    '#f59e0b', // amber
          performance:   '#06b6d4', // cyan
        },

        // Status
        positive: '#10b981',
        warning:  '#f59e0b',
        critical: '#ef4444',

        // Engagement tiers — teal family, muted→bright = simple→enterprise
        tier: {
          land:   '#0f766e', // teal-700 — entry level, subdued
          scale:  '#0d9488', // teal-600 — growing complexity
          govern: '#2dd4bf', // teal-400 — full enterprise, most prominent
        },
      },

      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body:    ['Inter', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },

      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
      },

      borderRadius: {
        DEFAULT: '2px',
        sm:      '2px',
        md:      '4px',
        lg:      '4px',
        xl:      '4px',
        '2xl':   '4px',
        full:    '4px',
      },

      boxShadow: {
        none: 'none',
        card: 'inset 0 0 0 1px #1e2d40',
      },

      spacing: {
        '18': '4.5rem',
        '72': '18rem',
        '80': '20rem',
        '88': '22rem',
      },

      transitionDuration: {
        DEFAULT: '150ms',
      },
    },
  },
  plugins: [],
}
