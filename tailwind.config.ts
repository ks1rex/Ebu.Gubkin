import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Accent — Indigo (академический, интеллектуальный)
        accent: {
          DEFAULT: '#4f46e5',
          hover:   '#4338ca',
          subtle:  '#eef2ff',
          muted:   '#a5b4fc',
        },
        // Поверхности
        canvas:  '#f9f8f6',   // фон страницы — слоновая кость
        surface: '#ffffff',   // карточки / панели
        panel:   '#f4f3f0',   // hover-поверхности, альт. фон
        // Типографика
        ink:    '#1c1917',    // основной текст
        subtle: '#71717a',    // второстепенный текст
        // Бренд (логотип) — тёмный фон шапки и страниц входа
        'brand-navy': '#1a2332',
        // Разделители
        line:   '#e4e4e7',
        // Статусы
        error:   '#dc2626',
        success: '#16a34a',
        warning: '#d97706',
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
