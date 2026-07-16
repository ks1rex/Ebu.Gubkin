import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Accent — violet (primary actions sitewide; keeps white-text contrast)
        accent: {
          DEFAULT: '#7c3aed',
          hover:   '#6d28d9',
          subtle:  'rgba(124,58,237,.15)',
          muted:   '#c4b5fd',
        },
        // Поверхности — translucent glass (over the gradient body background)
        canvas:  '#1a1140',            // opaque fills: inputs, modal overlays
        surface: 'rgba(255,255,255,.06)', // glass cards
        panel:   'rgba(255,255,255,.1)',  // hover / alt surface
        // Типографика
        ink:    '#f4f1ff',
        subtle: '#bcb4e0',
        subtle2: '#9a92c0',
        // Доп. акценты дизайн-системы (glassmorphism handoff)
        mint: '#5eead4',
        lav:  '#c4b5fd',
        pink: '#f5a3e8',
        gold: '#ffd27a',
        // ponytail: legacy teal from pre-integration reshbirga frontend — Биржа only, not a themed accent. Remove once Биржа is migrated (see docs/AUDIT_DESIGN_2026.md §1)
        'teal-legacy': { DEFAULT: '#14a89a', hover: '#0e8a7d' },
        // Разделители
        line: 'rgba(255,255,255,.14)',
        // Статусы
        error:   '#fb7185',
        success: '#5eead4',
        warning: '#ffd27a',
      },
      fontFamily: {
        sans: ['Sora', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        glass: '20px',
      },
      animation: {
        'slide-up': 'slideUp 0.15s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)'   },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
