# Changelog

All notable changes to Budgeteer. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/).

## [Unreleased] — 2026-06-12

### Added
- **Activity streak grid (GitHub-style).** New `ActivityGrid` component
  (`src/components/ActivityGrid.tsx`) renders a 52-week (1-year) grid of day
  squares on the Dashboard. Each square is filled dark (`bg-slate-900`) if the
  user logged at least one transaction that day, and light (`bg-slate-100`)
  otherwise. Future days in the current week appear as `bg-slate-50`. Month
  labels and Mon/Wed/Fri day-of-week labels match GitHub's contribution graph
  layout. Grid is anchored to `Asia/Manila` via the existing `todayDateString()`
  helper so dates stay consistent regardless of server timezone.
  - Dashboard gains one parallel DB query (transaction dates over the past year
    → `Set<string>`) and a new "Activity / Last year" card section between the
    CTA buttons and the two-column widgets.
- **Dev/prod OAuth environment split.**
  - `.env.local` (gitignored) — holds dev-only `AUTH_GITHUB_ID` /
    `AUTH_GITHUB_SECRET` that override `.env` locally. Production (Vercel) never
    loads this file and continues using its own env vars.
  - `.env.example` (committed) — documents all required env vars with
    placeholder values and instructions for creating separate dev vs. prod
    GitHub OAuth Apps.

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

### Added
- **Category CRUD.** New `/categories` page (added to the nav) to create, rename,
  change kind, and delete categories, so reports can use a specific taxonomy
  instead of dumping everything into "Miscellaneous".
  - API: `POST /api/categories` (now returns 409 on duplicate name+kind),
    `PATCH`/`DELETE /api/categories/:id`. Delete is blocked with a clear 409 if the
    category is still used by any transaction or budget.
  - New `CategoryRow` component (inline edit + delete); mutations invalidate the
    shared `["categories"]` query so forms across the app stay in sync.
- **"Miscellaneous" category in both income and expense.** Required relaxing the
  `Category.name` global unique to a composite `@@unique([name, kind])`, so the
  same name can exist once per kind (migration
  `migrations/20260601065524_category_unique_per_kind`). Seed adds both.

### Fixed
- **Budgets page could show income categories** (budgets are expense-only). Cause:
  it fetched under the shared `["categories"]` query key but filtered to expenses
  *inside* the query fn, so when another page populated that cache with the full
  list, Budgets rendered all kinds. Now it fetches the full list (consistent with
  other pages) and filters to expenses in the component.
- **Timezone: "current" month/day now use the app timezone (`Asia/Manila`),**
  not UTC. Previously the Dashboard month and the transaction form's default date
  were derived from UTC (`getUTCMonth`, `toISOString`), so early in the day in
  PHT (UTC+8) they showed the *previous* day/month. New helpers `dateToMonthString`
  / `todayDateString` (and `formatDate`) compute calendar values in `APP_TIME_ZONE`
  via `Intl`, so they're correct in the browser, local dev, and on a UTC server
  (Vercel). Month storage anchors (`monthStringToDate`/`monthRange`) stay UTC.

### Changed
- **Seed is now idempotent and non-destructive.** Rewrote `prisma/seed.ts` to
  `upsert` the baseline categories by `(name, kind)` and removed the
  `deleteMany()` calls and all sample transactions/budgets. Re-running the seed
  (or `migrate dev`) no longer wipes user-entered data; real data is added through
  the app. (Previously the seed deleted all rows first, which could erase
  transactions on any re-run.)
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
