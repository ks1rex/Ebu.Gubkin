# Design

## North Star

**Dark violet glassmorphism**, with **`teal-legacy` as a deliberate, scoped
second accent.**

The primary system: a dark violet (`#1a1140` canvas) glass UI — translucent
"frosted" surfaces (`rgba(255,255,255,.06)`), one saturated violet accent
(`#7c3aed`), Sora typeface. This is the actual shipped theme (confirmed
against `tailwind.config.ts`), superseding an earlier "academic minimalism"
concept that was written into docs but never implemented.

**`teal-legacy` (`#14a89a`) is not an error or leftover to silently purge.**
It's the accent color of the Биржа (marketplace) section, inherited from the
standalone reshbirga frontend that predates integration into Ebu.Gubkin, and
it is *intentionally* still declared as a first-class Tailwind token
(`teal-legacy` / `teal-legacy-hover`) rather than a raw hex scattered through
the codebase. It is also the default color of two components shared across
every section — `Spinner` and `ChatWindow` — which is why teal appears
outside Биржа too (e.g. in an admin chat window, in the ГОСТ chat). Treat
this as: **"one deliberate exception, fully tokenized, until Биржа is
migrated"** — not as undocumented drift. The migration itself is out of
scope for day-to-day design work; flag new *undocumented* off-palette colors,
don't flag `teal-legacy` usage itself as a defect.

**Second documented exception: the profile cover-banner gradient.**
`src/components/ProfileView.tsx`'s profile header banner
(`linear-gradient(120deg,#7c3aed,#db2777 55%,#0ea5e9)`) intentionally uses
two off-palette colors (`#db2777`, `#0ea5e9`) alongside `accent`. This is a
**sanctioned exception, not a defect** — it's a purely decorative element
with no status/semantic role, and it deliberately reaches outside the main
palette so the banner stands out against the rest of the (otherwise
consistent) UI. Don't flag it in future audits and don't migrate it to
tokens; if the banner's look changes, that's a deliberate design decision,
not a token-hygiene fix.

## Color

| Token | Value | Role |
|---|---|---|
| `accent` | `#7c3aed` (hover `#6d28d9`) | Primary actions, links, active icons — everywhere except Биржа |
| `canvas` | `#1a1140` | Page background |
| `surface` | `rgba(255,255,255,.06)` | Glass cards, panels, forms |
| `panel` | `rgba(255,255,255,.1)` | Hover / alt surface |
| `ink` / `subtle` / `subtle2` | `#f4f1ff` / `#bcb4e0` / `#9a92c0` | Text hierarchy on dark bg |
| `line` | `rgba(255,255,255,.14)` | Borders, dividers |
| `success` / `warning` / `error` | `#5eead4` / `#ffd27a` / `#fb7185` | Status |
| `mint` / `lav` / `pink` / `gold` | `#5eead4` / `#c4b5fd` / `#f5a3e8` / `#ffd27a` | Extra status/badge accents when 3 base status colors aren't enough (e.g. multi-state order badges in Admin) |
| **`teal-legacy`** | **`#14a89a`** (hover `#0e8a7d`) | **Sanctioned exception** — Биржа section + `ChatWindow`/`Spinner` defaults |

**Off-palette colors** (a raw hex that is none of the above, not a Tailwind
default like `slate-*`/`amber-500` used for grays/status, and not
`teal-legacy`) are the real defect to flag — not `teal-legacy` itself.

## Typography

Sora, `system-ui, sans-serif` fallback, 16px base. Scale: H1
`text-4xl font-bold` (36px/700), H2 `text-2xl font-semibold` (24px/600), H3
`text-xl font-semibold` (20px/600), body `text-base`, small `text-sm`,
caption `text-xs`.

## Components

- **Button (primary)**: `bg-accent text-white font-medium rounded-lg px-4 py-2 hover:bg-accent-hover`
- **Button (secondary)**: `border border-line text-ink rounded-md px-4 py-1.5 text-sm hover:bg-panel`
- **Card (glass)**: `bg-surface border border-line rounded-xl backdrop-blur-glass hover:border-accent/40`
- **Input**: `rounded-lg border border-line bg-canvas text-ink focus:ring-2 focus:ring-accent/30`
- **Status badge**: `bg-{token}/10 text-{token}` — never Tailwind default `bg-green-100 text-green-800`-style light badges (an actual defect pattern found and fixed in Admin previously)
- **NavLink (active)**: `bg-accent-subtle text-accent`

Full token/component reference: `docs/DESIGN_SYSTEM.md` (kept in sync with
`tailwind.config.ts`; treat the config as ground truth if they ever drift).

## Layout

Rounded corners: `rounded-lg` (8px) is the default card/button radius;
`rounded-xl` (12px) for larger cards/modals. Icons: Lucide React, `size={20}`
in cards, `size={16}` in inline UI elements.

## Known, accepted debt

- Биржа section (`Applications`, `NewOrder`, `MyOrders`, `OrderDetail`,
  `OrderFeed`, `AppliedOrders`, `ServiceDetail/Edit/Form`,
  `ServicesCatalog/Mine`, `MarketLayout`, `ChatWindow`, `GostChat`) runs on
  `teal-legacy`, not `accent` — expected, not a bug, per North Star above.
- `docs/DESIGN_SYSTEM.md`'s "academic minimalism" framing was replaced; this
  DESIGN.md and the Tailwind config are now the source of truth.
