## Ebu.Gubkin conventions

This is a Tailwind utility-class system (dark theme only — there is no
light-mode palette). Most components are plain `<div>`/`<button>` markup
styled with Tailwind classes; a few (`EmptyState`, `StarRating`, `Spinner`)
use inline `style={}` instead of Tailwind. Match whichever idiom the
component you're extending already uses — don't introduce a third one.

**Color tokens** (from `tailwind.config.ts`, use as `bg-<name>` / `text-<name>` / `border-<name>`):

| Token | Hex | Use |
|---|---|---|
| `canvas` | `#1a2332` | page background |
| `surface` | `#1e2a3a` | card background |
| `panel` | `#243044` | hover / alt surface |
| `ink` | `#e2e8f0` | primary text |
| `subtle` | `#94a3b8` | secondary text |
| `line` | `#2d3f55` | borders/dividers |
| `accent` / `accent-hover` / `accent-subtle` / `accent-muted` | `#4f46e5` / `#4338ca` / `#1e1b4b` / `#a5b4fc` | primary action color (indigo) |
| `error` / `success` / `warning` | `#f87171` / `#4ade80` / `#fbbf24` | status colors |

Typical card: `bg-surface border border-line rounded-xl`. Typical primary
button: `bg-accent hover:bg-accent-hover text-white rounded-md`. Icons are
[lucide-react](https://lucide.dev), default `size={18-24}`.

**Wrapping.** Components that use `react-router-dom` (`Link`, `Outlet`,
`useLocation`) need a `<MemoryRouter>` (or `<BrowserRouter>` in a real app)
ancestor — without it they throw. Several components (`Navbar`,
`AdminRoute`, `ProtectedRoute`, `ChatWindow`, `Layout`, `CreateThreadModal`,
`ReportModal`, `BuyTokensModal`) also call `useAuth()`, which requires a
real `AuthProvider` backed by a live Supabase session — these are NOT
mocked in this sync (it would mean either real network calls from every
preview or hand-authoring fake auth state) and show the floor card here.
Treat their `.d.ts` as the real API contract, but expect to compose new UI
from `Modal`, `Spinner`, `StarRating`, `EmptyState`, `GostLayout`, and
`MarketLayout`, which render standalone.

**Where the truth lives.** `_ds_bundle.css` (imported by `styles.css`) is
the compiled Tailwind output — read it for the full generated utility
class list. Font: Inter, loaded at runtime from Google Fonts (not shipped
as a static asset).

**Example** (real, from the `Modal` preview):

```tsx
<Modal open onClose={() => {}} title="Подтвердите действие">
  <p className="text-subtle">Вы уверены, что хотите выполнить это действие?</p>
</Modal>
```
