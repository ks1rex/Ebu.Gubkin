# Product

## Register

product

## Users

Students at a university (СтудБиржа / Ebu.Gubkin) using the platform on
desktop and mobile, in short goal-directed sessions between classes: posting
or browsing orders/services, checking wallet balance, reading forum threads,
looking up their class schedule, or resolving a support/dispute issue. Admins
(a small internal team) use the same UI's `/admin/*` section for moderation,
finance, and dispute resolution — a distinct workflow context from the
student-facing sections but the same visual system.

## Product Purpose

A student services marketplace: customers post orders or catalog listings,
executors apply, payment is held in escrow, released on confirmation,
disputes are arbitrated by admins. Bundled alongside the marketplace: a
forum, a wallet, a ГОСТ-calculator tool, a class schedule viewer, and VIP
subscription perks. Success looks like: students trust the escrow/wallet
enough to transact for real money, and admins can moderate/arbitrate without
fighting the UI.

## Brand Personality

Confident, contemporary, a little bit nightlife-tech — not academic-sterile.
The shipped visual system is a dark violet glassmorphism theme (see
DESIGN.md), chosen over an earlier "academic minimalism" concept that never
shipped. Three words: **modern, energetic, trustworthy** (trust matters
because real money moves through escrow).

## Anti-references

- Not academic/institutional (no beige, no serif, no "university portal"
  starchiness) — an earlier design direction like that was abandoned in
  favor of the current dark violet theme; don't reintroduce it.
- Not generic SaaS-dashboard-cream (light gray cards on off-white).
- Not the leftover teal-branded look inherited from the pre-integration
  standalone reshbirga frontend — see DESIGN.md's `teal-legacy` note.

## Design Principles

1. **One dark violet glass system, one deliberate legacy exception.** Every
   surface should read as the same product; Биржа's `teal-legacy` accent is
   the one sanctioned exception, not a licence for more one-offs.
2. **Money UI earns extra restraint.** Wallet, escrow, deposit/withdrawal,
   and dispute screens should look and feel more sober/precise than forum or
   schedule screens — this is where trust is made or lost.
3. **Admin is a workbench, not a showcase.** Density and speed of scanning
   (tables, badges, filters) matter more than visual flourish in `/admin/*`.
4. **Reuse before restyle.** `src/components/glass/*` and the Tailwind
   color tokens are the system; new screens should compose from them, not
   reinvent inline styles (see the Биржа section's known-debt history).

## Accessibility & Inclusion

No formal WCAG target has been set for this project yet. Text contrast on
the dark violet background should stay readable (this was flagged as a
worthwhile follow-up during Impeccable setup, not yet audited in depth).
Russian is the only shipped language; no i18n requirement currently.
