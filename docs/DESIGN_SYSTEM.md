# Ebu.Gubkin — Design System

> **Иерархия документов**: `DESIGN.md` в корне репозитория — North Star,
> источник истины для решений и осознанных исключений (teal-legacy,
> градиент профильного баннера и т.п.). Этот файл — подробный справочник
> токенов/компонентов, при расхождении с `DESIGN.md` прав `DESIGN.md`.

## Концепция: тёмная glassmorphism-тема

Тёмный фиолетовый фон, полупрозрачные «стеклянные» поверхности
(`backdrop-blur`), один акцентный фиолетовый цвет. Источник истины —
`tailwind.config.ts`; этот документ его описывает, а не наоборот — при
расхождении сверяться с конфигом.

---

## Акцентный цвет: фиолетовый (violet)

Основной цвет действий по всему сайту (кнопки, активные ссылки, иконки),
держит контраст с белым текстом поверх себя.

---

## Палитра

| Токен               | Hex / значение             | Использование                          |
|---------------------|-----------------------------|----------------------------------------|
| `accent`            | `#7c3aed`                   | CTA-кнопки, активные ссылки, иконки    |
| `accent-hover`      | `#6d28d9`                   | Hover-состояние кнопок                 |
| `accent-subtle`     | `rgba(124,58,237,.15)`       | Лёгкий фон активных элементов          |
| `accent-muted`      | `#c4b5fd`                   | Декоративный / disabled акцент         |
| `canvas`            | `#1a1140`                   | Фон страницы (тёмно-фиолетовый)        |
| `surface`           | `rgba(255,255,255,.06)`      | Стеклянные карточки, панели, формы     |
| `panel`             | `rgba(255,255,255,.1)`       | Hover-поверхности, альтернативный фон  |
| `ink`               | `#f4f1ff`                   | Основной текст (светлый, на тёмном фоне) |
| `subtle`            | `#bcb4e0`                   | Вторичный текст, плейсхолдеры          |
| `subtle2`           | `#9a92c0`                   | Третичный текст                        |
| `line`              | `rgba(255,255,255,.14)`       | Разделители, границы                   |
| `error`             | `#fb7185`                   | Ошибки, деструктивные действия         |
| `success`           | `#5eead4`                   | Успешные операции                      |
| `warning`           | `#ffd27a`                   | Предупреждения                         |
| `mint`              | `#5eead4`                   | Доп. акцент (glassmorphism handoff)    |
| `lav`               | `#c4b5fd`                   | Доп. акцент (glassmorphism handoff)    |
| `pink`              | `#f5a3e8`                   | Доп. акцент (glassmorphism handoff)    |
| `gold`              | `#ffd27a`                   | Доп. акцент (glassmorphism handoff)    |

**Запрещённые цвета**: teal (`#14a89a`) — не использовать в новых
интерфейсных элементах. Это цвет старой, домиграционной палитры раздела
«Биржа» (унаследован от отдельного фронтенда reshbirga до интеграции в
Ebu.Gubkin) — раздел ещё не переведён на текущую тему (см.
`docs/AUDIT_DESIGN_2026.md`, §1). Помету снять только после того, как
Биржа (`Applications`, `NewOrder`, `MyOrders`, `OrderDetail`, `OrderFeed`,
`AppliedOrders`, `ServiceDetail/Edit/Form`, `ServicesCatalog/Mine`,
`MarketLayout`, `ChatWindow`, `GostChat`) будет переписана на токены выше.

**Второе осознанное исключение**: градиент cover-баннера профиля
(`src/components/ProfileView.tsx`, `linear-gradient(120deg,#7c3aed,#db2777
55%,#0ea5e9)`) намеренно использует два цвета вне палитры — чисто
декоративный элемент без смысловой роли, задуман так, чтобы выделяться на
фоне остального UI. Не переводить на токены, не отмечать как дефект
(подробнее — в `DESIGN.md`).

---

## Логотип

Логотип — PNG-файл (`logoV` в `src/pages/Login.tsx`, а также в шапке через
`Navbar.tsx`), без отдельной брендовой палитры вокруг него: фон под
логотипом — тот же `canvas` (`#1a1140`), что и фон всего приложения,
единая тёмная тема без специального "брендового" контейнера.

**Правила логотипа**:
- В шапке: горизонтальный вариант, высота 36px (`h-9`)
- На страницах входа/регистрации: вертикальный вариант, высота ~120px
- Не масштабировать логотип ниже 32px высоты — читаемость теряется

---

## Типографика

- **Шрифт**: Sora (Google Fonts)
- **Стек**: `'Sora', system-ui, sans-serif`
- **Базовый размер**: 16px

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

### Карточка (стеклянная)
```
bg-surface border border-line rounded-xl backdrop-blur-glass
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

### Статусные бейджи (не базовые 3 цвета)
Когда `success`/`warning`/`error` не хватает на все состояния одного
списка (например статусы заказов в Админке), использовать `mint`/`lav`/
`pink`/`gold` тем же паттерном — `bg-{token}/10 text-{token}`, не
дефолтные Tailwind-цвета (`bg-green-100` и т.п.).

---

## Иконки

[Lucide React](https://lucide.dev/icons) — `lucide-react`
Размер по умолчанию: `size={20}` в карточках, `size={16}` в интерфейсных элементах.

---

## Tailwind config (основные токены)

```ts
colors: {
  accent: { DEFAULT: '#7c3aed', hover: '#6d28d9', subtle: 'rgba(124,58,237,.15)', muted: '#c4b5fd' },
  canvas:  '#1a1140',
  surface: 'rgba(255,255,255,.06)',
  panel:   'rgba(255,255,255,.1)',
  ink:     '#f4f1ff',
  subtle:  '#bcb4e0',
  subtle2: '#9a92c0',
  mint: '#5eead4',
  lav:  '#c4b5fd',
  pink: '#f5a3e8',
  gold: '#ffd27a',
  line:    'rgba(255,255,255,.14)',
  error:   '#fb7185',
  success: '#5eead4',
  warning: '#ffd27a',
}
fontFamily: {
  sans: ['Sora', 'system-ui', 'sans-serif'],
}
backdropBlur: {
  glass: '20px',
}
```
