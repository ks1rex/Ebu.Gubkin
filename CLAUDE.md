# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Vite dev server
npm run build     # tsc (type-check, no emit) then vite build → dist/
npm run preview   # preview production build
```

No test runner or linter is configured in this repo. `npm run build` is the only correctness gate (TypeScript `strict`, `noUnusedLocals`, `noUnusedParameters`).

Deploy is automatic: push to `main` triggers `.github/workflows/deploy.yml`, which builds with secrets (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_BACKEND_URL`, `VITE_GOST_URL`) and publishes `dist/` to GitHub Pages. Vite `base` is `/Ebu.Gubkin/` — routing uses `basename={import.meta.env.BASE_URL}` in `App.tsx`, so local dev and Pages deploy resolve routes differently; don't hardcode absolute paths.

## Architecture

This frontend is one of three services that share a single Supabase project (see project instructions for full DB schema): a Node/Express "Биржа" (marketplace) backend, a separate Python/FastAPI "ГОСТ" backend, and this React app. It talks to both backends over plain `fetch`, and to Supabase directly for auth, direct-table reads, and Realtime.

**Two independent API clients, two env vars:**
- `src/lib/api.ts` — `apiCall(method, path, body)` wraps `fetch` against `VITE_BACKEND_URL` (the Биржа backend). It pulls the Supabase session token via `supabase.auth.getSession()` and attaches `Authorization: Bearer <token>`, JSON-encodes non-`FormData` bodies, and throws an `Error` with `.data` set to the parsed error body on non-2xx. Almost all marketplace/forum/wallet/admin data flows through this one function — reuse it rather than calling `fetch` directly.
- `VITE_GOST_URL` (the ГОСТ backend) is read ad hoc per-page (`Gost.tsx`, `GostChat.tsx`, `Admin/GostTemplates.tsx`) with its own inline `fetch` calls — there is no shared client for it. Pages guard on `if (!GOST)` and show a "не настроен" message when the env var is missing.
- `src/lib/supabase.ts` exports a single `supabase` client used for auth (`AuthContext`), direct profile reads, Storage (avatars), and Realtime subscriptions (chat).

**Auth/profile state** lives in `AuthContext` (`src/contexts/AuthContext.tsx`), sourced from `supabase.auth` + a direct `profiles` table `select`, not from the backend API. It exposes `session`, `user`, `profile` (includes `is_admin`, `balance`, `token_balance`, referral fields), and `signUp`/`signIn`/`signOut`/`refreshProfile`. Profile rows are created server-side by a Postgres trigger (`handle_new_user`) reading `nickname`/`ref_code` out of `signUp` metadata — the frontend never inserts into `profiles` directly (RLS blocks it; see `docs/TODO_BACKEND.md` "lock_writes" note). `useAuth()` throws if called outside the provider.

**Routing** (`src/App.tsx`) is one flat `react-router-dom` v6 tree under a single `Layout`, with three route-guard/layout patterns:
- `ProtectedRoute` — redirects to `/` unless `useAuth().user` exists (after `loading` resolves).
- `AdminRoute` — same, but gates on `profile?.is_admin`.
- Nested layouts `MarketLayout` and `GostLayout` wrap sub-trees (`market/*`, `gost/*`) for section-local chrome (e.g. sub-nav); admin sub-pages nest under `AdminLayout` (`pages/Admin/index.tsx`) similarly.

Each of the four product sections (Биржа/market, Форум/forum, ГОСТ/gost, Кошелёк/wallet) is a flat set of page components under `src/pages/`, not separate route modules — new pages get added directly into the `Routes` tree in `App.tsx`.

**Design**: `docs/DESIGN_SYSTEM.md` is the source of truth for colors/spacing (dark navy/teal, see project instructions §7). `src/components/glass/` (`GlassCard`, `Button`, `Chip`, `Avatar`, `Stars`) is a small implemented component kit derived from the `design_handoff_glassmorphism/` mockups at repo root — check which pages actually import from `glass/` before assuming it's used everywhere.

**DB write restrictions**: after migration `010_lock_writes.sql`, the frontend can only `UPDATE` safe columns on its own `profiles` row and `INSERT` into `messages`/`message_attachments` for itself — everything else (orders, transactions, disputes, wallet mutations) must go through the backend API (`apiCall`), never a direct Supabase mutation. Keep this in mind before adding a new Supabase `.insert()`/`.update()` call — check `docs/TODO_BACKEND.md` first.
