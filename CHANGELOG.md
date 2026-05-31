# Changelog

All notable changes to Budgeteer. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/).

## [Unreleased] — 2026-05-31

### Added
- **Initial scaffold** — full-stack Next.js (App Router) + TypeScript, Tailwind
  CSS v4, SQLite via Prisma, and TanStack Query.
  - Prisma models: `Category`, `Transaction`, `Budget`; initial migration + seed.
  - Routes: Dashboard, Transactions, Budgets, Reports.
  - API: CRUD for transactions/categories/budgets + `/api/reports` monthly
    aggregation (income, expenses, net savings, per-category breakdown).
  - Transactions add-form + list wired end to end (DB → UI via Query cache).
- **Transaction edit & delete** — inline row editor and delete with confirm.
  - New `PATCH`/`DELETE /api/transactions/:id` (404 on missing, 400 on invalid input).
  - New `TransactionRow` component; list gained an Actions column.
- **Budgets CRUD** — Budgets page is now fully functional (was a skeleton).
  - New `PATCH`/`DELETE /api/budgets/:id`; `POST /api/budgets` still upserts
    (create/update) by category + month.
  - Month picker, one row per expense category with set/update + remove.
  - New `BudgetRow` component.

### Changed
- **Deployment prep (Vercel).**
  - `build` script now runs `prisma generate && next build` so the Prisma client
    is regenerated on every Vercel build (Vercel caches `node_modules`).
  - Dashboard marked `export const dynamic = "force-dynamic"` so it renders
    per-request from the DB instead of being statically prerendered at build.
  - Verified a clean production build locally (`/` and all `/api/*` are dynamic;
    `/budgets`, `/reports`, `/transactions` are static client pages).
- **Money columns switched from `Float` to `Decimal(12,2)`** (Postgres `numeric`)
  for exact money math. Migration `migrations/20260531191605_money_decimal`.
  - Prisma returns `Decimal` objects; added `src/lib/serialize.ts` to convert
    `amount`/`limit` to plain numbers at the API boundary, so the wire format and
    all frontend code stay unchanged (money is still `number`).
  - Dashboard and `/api/reports` now sum in the database (`groupBy._sum`) instead
    of in JS, keeping aggregation exact (verified `0.10 + 0.20 → 0.3`, not
    `0.30000000000000004`).
- **Database migrated from local SQLite to Neon serverless Postgres.**
  - `schema.prisma` datasource → `provider = "postgresql"` with `url` (pooled)
    and `directUrl` (direct) from env.
  - `.env` now holds Neon pooled + direct connection strings.
  - Established a clean migration baseline: single Postgres migration
    `migrations/20260531100512_init` applied to Neon (`migrate status` → up to
    date); seed loads the 8 categories. Verified the live app reads from Neon.
  - Fixed a malformed `DIRECT_URL` in `.env` (stray `DATABASE_URL=` prefix, wrong
    host/password) so `migrate` uses the unpooled Neon endpoint; password rotated.
- **Currency switched from USD to PHP** (`formatCurrency` → `en-PH` / `PHP`);
  applies across Dashboard, Transactions, Budgets, and Reports.
- **Income and expense now use separate category sets** — the transaction form
  filters categories by the selected type and clears the choice when the type
  changes; seed split into distinct income vs. expense categories.
- Upgraded **Next.js 15.1.7 → 16.2.6** to resolve a critical CVE in the
  originally-installed version.
- Reset/reseeded sample data to peso-scale amounts.

### Notes
- **Reports** intentionally excludes income from the per-category breakdown
  (that table is budget-vs-actual, and budgets exist only for expenses); income
  is still reflected in Total Income and Net Savings.
- Edit/delete and budget mutations currently invalidate only their own query —
  Dashboard and Reports won't live-update until refetched.
- Reports page budget-vs-actual visualization (progress bars/chart) remains a TODO.
- Migration history is now clean (one Postgres `init` baseline); the old stale
  SQLite migrations and leftover `_prisma_migrations` record were cleared via
  `migrate reset` before re-baselining.
- Editor (Zed) had been re-saving a stale `schema.prisma` buffer over edits,
  flipping the datasource back to `sqlite`; resolved by reloading the file from
  disk. Runtime was never affected (the generated client + `DATABASE_URL` drive
  the app) — only `generate`/`migrate` need the file correct on disk.
- **Deploying:** set `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) as env vars
  in the host (Vercel), not from `.env`. Vercel builds production from `main`, so
  this branch must be merged there first. Apply future schema changes with
  `prisma migrate deploy` (not `migrate dev`).
