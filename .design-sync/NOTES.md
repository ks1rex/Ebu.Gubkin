# design-sync notes — Ebu.Gubkin

## Repo shape

This is an app repo, not a published component library: no `package.json`
`main`/`module`/`exports`, no built `dist` library, no Storybook. Most of
`src/components/` are page-level layouts wired to this app's `AuthContext`
(real Supabase client) and `react-router`'s `Outlet`. All 14 are now
rendered for real (see "Auth/network mocking" below) — none show the floor
card.

## Auth/network mocking (all 14 rendered)

- `src/contexts/AuthContext.tsx`: `AuthContext` itself is now exported
  (`export const AuthContext = ...`, was previously module-private). Purely
  additive — `AuthProvider`/`useAuth` behavior is unchanged. This lets
  `.design-sync/auth-preview.tsx` supply a static fake context value
  directly (`<AuthContext.Provider value={...}>`), bypassing the real
  `AuthProvider` entirely — no Supabase calls, ever, from any preview.
- `.design-sync/auth-preview.tsx` (preview-only, not real app code) exports
  `PreviewAuthProvider` — wraps children in a fake admin-user `AuthContext`
  value (`is_admin: true`, static profile/session, no-op
  signIn/signOut/etc). Re-exported from `.design-sync/entry.tsx` as a named
  bundle export so `cfg.provider` can reference it.
- `cfg.provider` is a 3-level chain: `MemoryRouter` → `ToastProvider` (the
  real one — it's pure client state, no network, safe to use as-is) →
  `PreviewAuthProvider`. Applied to every preview uniformly; components
  that don't use router/toast/auth simply ignore the unused context.
- `ChatWindow` needed NO additional mocking: its default (floor) props
  leave `conversationId` undefined, and `loadMessages` early-returns when
  `!conversationId` — renders a real "Чат не найден" empty state, no fetch.
  Verified via `.render-check.json` (no errors, no `firstErr`).
- `ReportModal`/`BuyTokensModal` only fetch on form SUBMIT, not on mount —
  safe to preview with fake props, no mocking needed.
- `CreateThreadModal` fetches `/forum/categories` on mount UNLESS
  `prefillCategoryId` is passed — the authored preview always passes it to
  skip the fetch.
- None of this touches `apiCall`/`fetch` globally — if a future component
  needs real `apiCall()` data on mount (not just on submit), it will need
  either a `prefill`-style prop to skip the fetch (preferred) or a
  preview-local `window.fetch` stub written in that component's own
  `.design-sync/previews/<Name>.tsx` (never touch app source for this).

## Known converter quirk: `position:fixed` modals in `cardMode:single`

Components with NO in-flow content besides a `fixed inset-0 ...
flex items-center justify-center` root (Modal, ReportModal, BuyTokensModal,
CreateThreadModal) rendered CROPPED at the top in `cardMode:single` —
confirmed in both the validate diagnostic screenshot and the actual grading
capture (`_screenshots/review/...`), not just a Playwright artifact. Root
cause: the converter's `.ds-single` transform wrapper has zero in-flow
height (its only child is `position:fixed`, taken out of flow), so the
fixed element's containing block collapses to 0 height and `flex
items-center` centers the (taller) content symmetrically around that
zero-height point — clipping everything above it.
**Fix applied in the preview files only** (not app source, not converter
lib — `lib/emit.mjs` defines `.ds-single` and is off-limits to fork): wrap
each such preview's return value in `<div style={{ minHeight: 700 }}>`,
matching the `cfg.overrides.<Name>.viewport` height set for that
component. This gives `.ds-single` real in-flow height so the fixed modal
centers correctly. **Apply this same wrapper to any future authored
preview of a `fixed inset-0`-rooted component**, or it will silently crop.

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
