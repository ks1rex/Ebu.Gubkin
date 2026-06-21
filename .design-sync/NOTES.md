# design-sync notes — Ebu.Gubkin

## Repo shape

This is an app repo, not a published component library: no `package.json`
`main`/`module`/`exports`, no built `dist` library, no Storybook. Most of
`src/components/` are page-level layouts wired to this app's `AuthContext`
(real Supabase client) and `react-router`'s `Outlet`, not portable
presentational components. Only `Modal`, `Spinner`, `StarRating`,
`EmptyState`, `GostLayout`, `MarketLayout` render meaningfully standalone.
User explicitly chose to sync all 14 anyway, accepting that the
auth-coupled ones (`AdminRoute`, `ChatWindow`, `Navbar`, `ProtectedRoute`,
`Layout`, `CreateThreadModal`, `ReportModal`, `BuyTokensModal`) show the
floor card rather than a real render.

## Setup specifics

- No `dist` library entry → synth-entry mode via a hand-written
  `.design-sync/entry.tsx` that re-exports each component's `export default`
  as a named export (the converter's own `export *` synth wouldn't have
  re-exported defaults).
- `node_modules/ebu-gubkin` is a Windows junction (`mklink /J`) back to the
  repo root — required so `cfg.pkg`/`PKG_DIR` resolution finds a
  `package.json` and `src/` without a real npm publish/link. Recreate it on
  a fresh clone: `mklink /J node_modules\ebu-gubkin .` (or `ln -s` on
  POSIX).
- `cfg.cssEntry` points at the **hashed** `dist/assets/index-*.css` file —
  the filename changes every `npm run build`. Run `npm run build` first on
  any re-sync and update `cssEntry` to the new hash, or the build will fall
  back to an empty `[CSS_RUNTIME]` stylesheet.
- `cfg.provider.component = MemoryRouter` (via `extraEntries:
  ["react-router-dom"]`) so `Outlet`/`Link`/`useLocation` don't crash.
  `useAuth()` (real `AuthContext`) is NOT mocked — components that call it
  show the floor card by design (see above); mocking would require either
  wrapping in the real `AuthProvider` (makes live Supabase calls from every
  preview render — rejected) or adding an injectable-client seam to
  `src/lib/supabase.ts` (out of scope for this sync).
- `src/lib/supabase.ts` was changed to fall back to placeholder
  strings instead of throwing when `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`
  are undefined (the esbuild/synth-entry context never injects Vite env
  vars). Without this, `createClient()` threw at module-init time and
  crashed the *entire* shared IIFE bundle, floor-carding even
  auth-unrelated components like `Modal`/`Spinner`. Production behavior is
  unchanged (real env vars are always set there).
- `runtimeFontPrefixes: ["Inter"]` — Inter loads from Google Fonts via a
  `<link>` in `index.html`, not a shipped `@font-face`.

## Known render warns (triaged, expected on re-sync)

- None outstanding as of this sync — `StarRating`'s earlier
  `[RENDER_THIN]` ("no text, paints nothing") was a false positive: the
  card is two icon-only star rows with no text by design. Confirmed via
  `_screenshots/general__StarRating.png`. If it reappears after a content
  change, re-check the screenshot before treating it as new.

## Re-sync risks

- The `node_modules/ebu-gubkin` junction is not committed (node_modules is
  gitignored) — must be recreated on every fresh clone/CI run before
  building.
- `cssEntry`'s hashed filename WILL go stale after any `npm run build` —
  always re-check `dist/assets/` and update the config path.
- The `src/lib/supabase.ts` placeholder fallback is a real (small,
  intentional) source change living in the app, not sync-local config — if
  a future contributor "cleans it up" back to a hard throw, the next
  design-sync rebuild will silently break again (whole-bundle crash). Worth
  a one-line comment in that file pointing here (not added, to keep the
  diff minimal — revisit if this becomes a recurring trip-up).
- `.design-sync/entry.tsx` must be kept in sync by hand if components are
  added/removed/renamed under `src/components/` — it is not auto-derived.
