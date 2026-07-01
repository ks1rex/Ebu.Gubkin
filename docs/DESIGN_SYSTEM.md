# Ebu.Gubkin — Design System

## Концепция: «Современный академический минимализм»

Нейтральная база (слоновая кость + графит) с одним ярким акцентным цветом.
Чистая иерархия, нет декоративного шума. Светлая тема — читаемость в учебном контексте.

---

## Акцентный цвет: Индиго

**Выбор Indigo vs Amber:**
Индиго выбран потому, что:
- Это цвет академической среды (университеты, научные публикации)
- Conveeys интеллектуальный авторитет и фокус, без агрессии
- Хорошо отличается от teal/navy — фирменных цветов связанного проекта Биржи
- Amber ассоциируется с e-commerce и стартапами, не с образованием

---

## Палитра

| Токен               | Hex       | Использование                          |
|---------------------|-----------|----------------------------------------|
| `accent`            | `#4f46e5` | CTA-кнопки, активные ссылки, иконки    |
| `accent-hover`      | `#4338ca` | Hover-состояние кнопок                 |
| `accent-subtle`     | `#eef2ff` | Лёгкий фон активных элементов          |
| `accent-muted`      | `#a5b4fc` | Декоративный / disabled акцент         |
| `canvas`            | `#f9f8f6` | Фон страницы (тёплая слоновая кость)   |
| `surface`           | `#ffffff`  | Карточки, панели, формы               |
| `panel`             | `#f4f3f0` | Hover-поверхности, альтернативный фон  |
| `ink`               | `#1c1917` | Основной текст (тёплый графит)         |
| `subtle`            | `#71717a` | Вторичный текст, плейсхолдеры          |
| `line`              | `#e4e4e7` | Разделители, границы                   |
| `error`             | `#dc2626` | Ошибки, деструктивные действия         |
| `success`           | `#16a34a` | Успешные операции                      |
| `warning`           | `#d97706` | Предупреждения                         |

**Что не использовать**: teal (`#14a89a`) в интерфейсных элементах — это акцентный цвет Биржи (reshbirga).

---

## Бренд-токены (логотип)

Эти цвета присутствуют в логотипе `assets/logo.png` и используются **только** для брендинга — не для интерфейсных элементов.

| Токен          | Hex       | Использование                              |
|----------------|-----------|---------------------------------------------|
| `brand-navy`   | `#1a2332` | Фон шапки и страниц входа/регистрации       |
| `brand-gold`   | `#C9A84C` | Акцентный цвет логотипа (золотые элементы)  |
| `brand-blue`   | `#2E6DB4` | Синие элементы логотипа                     |
| `brand-red`    | `#C0392B` | Красные элементы логотипа                   |

**Правила логотипа**:
- Логотип всегда на тёмном фоне (`brand-navy: #1a2332`)
- В шапке: горизонтальный вариант, высота 36px (`h-9`)
- На страницах входа/регистрации: вертикальный вариант, высота 112px (`h-28`)
- Не масштабировать логотип ниже 32px высоты — читаемость теряется

---

## Типографика

- **Шрифт**: Inter (Google Fonts, wght 400/500/600/700)
- **Стек**: `'Inter', system-ui, sans-serif`
- **Базовый размер**: 16px
- **Сглаживание**: `-webkit-font-smoothing: antialiased`

| Элемент        | Размер | Вес        | Токен Tailwind          |
|----------------|--------|------------|-------------------------|
| Заголовок H1   | 36px   | 700        | `text-4xl font-bold`    |
| Заголовок H2   | 24px   | 600        | `text-2xl font-semibold`|
| Заголовок H3   | 20px   | 600        | `text-xl font-semibold` |
| Тело           | 16px   | 400        | `text-base`             |
| Малый текст    | 14px   | 400/500    | `text-sm`               |
| Подпись        | 12px   | 400        | `text-xs`               |

---

## Компоненты

### Кнопка (primary)
```
bg-accent text-white font-medium rounded-lg px-4 py-2
hover:bg-accent-hover transition-colors
disabled:opacity-50
```

### Кнопка (secondary / outline)
```
border border-line text-ink rounded-md px-4 py-1.5 text-sm
hover:bg-panel transition-colors
```

### Карточка
```
bg-surface border border-line rounded-xl
hover:border-accent/40 hover:shadow-sm transition-all
```

### Input
```
w-full px-3 py-2 rounded-lg border border-line bg-canvas text-ink text-sm
focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent
transition-colors
```

### NavLink (active)
```
bg-accent-subtle text-accent px-3 py-1.5 rounded-md text-sm font-medium
```

---

## Иконки

[Lucide React](https://lucide.dev/icons) — `lucide-react`  
Размер по умолчанию: `size={20}` в карточках, `size={16}` в интерфейсных элементах.

---

## Tailwind config (основные токены)

```ts
colors: {
  accent: { DEFAULT: '#4f46e5', hover: '#4338ca', subtle: '#eef2ff', muted: '#a5b4fc' },
  canvas:  '#f9f8f6',
  surface: '#ffffff',
  panel:   '#f4f3f0',
  ink:     '#1c1917',
  subtle:  '#71717a',
  line:    '#e4e4e7',
  error:   '#dc2626',
  success: '#16a34a',
  warning: '#d97706',
}
```
