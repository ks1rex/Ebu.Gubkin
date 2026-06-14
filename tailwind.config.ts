import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Accent — Indigo
        accent: {
          DEFAULT: '#4f46e5',
          hover:   '#4338ca',
          subtle:  '#1e1b4b',   // тёмный indigo-тинт для тёмной темы
          muted:   '#a5b4fc',
        },
        // Поверхности (тёмная тема)
        canvas:  '#1a2332',   // фон страницы — тёмный
        surface: '#1e2a3a',   // карточки
        panel:   '#243044',   // hover/альт. поверхность
        // Типографика (светлая на тёмном)
        ink:    '#e2e8f0',    // основной текст
        subtle: '#94a3b8',    // второстепенный текст
        // Бренд
        'brand-navy':   '#1a2332',
        'brand-orange': '#f97316',
        // Разделители
        line:   '#2d3f55',
        // Статусы (lightened for dark bg)
        error:   '#f87171',
        success: '#4ade80',
        warning: '#fbbf24',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
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
