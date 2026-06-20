# Changelog

All notable changes to Budgeteer. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/).

## [Unreleased] — 2026-06-20

### Added
- **Production hardening, Phase 1 — reliability.** Closes the "uncaught error →
  raw 500 / silent in prod" gaps ahead of launch.
  - **App-router error boundaries.** `src/app/error.tsx` (route-segment errors —
    friendly message + "Try again", no stack trace, surfaces only Next's safe
    `digest`), `src/app/not-found.tsx` (mint-styled 404), and
    `src/app/global-error.tsx` (last-resort boundary; since it replaces the root
    layout it can't use `globals.css`/`.mint` classes, so it's styled inline with
    the Sprout palette).
  - **Safe JSON parsing.** New `src/lib/http.ts` `parseJson()` throws a tagged
    `BadRequestError` on malformed bodies → `400 { error: "Invalid JSON body" }`
    instead of an unhandled 500. Wired into every mutating route.
  - **Centralized API error handling.** `withErrorHandling()` wraps all 8 API
    route handlers: maps `BadRequestError → 400` and Prisma `P2025 → 404` /
    `P2002 → 409` as a fallback, logs anything unexpected, and returns a sanitized
    `500 { error: "Something went wrong" }`. Routes keep their own
    domain-specific messages (e.g. "Category is in use by N transaction(s)…");
    the wrapper is the safety net for what used to `throw e` into a raw 500.
  - **Structured logging.** New `src/lib/logger.ts` — zero-dependency logger
    (one-line JSON in prod for the platform's log drain, readable in dev) as a
    single swap-in seam for Sentry later. Replaces the `console.error` in
    `src/auth.ts`.
  - **Tests.** +5 malformed-JSON → 400 cases across transactions / categories /
    budgets; suite at 133 passing.

### Changed
- **Dashboard month switcher.** The top-bar month pill is now functional (was a
  display-only caret). Clicking it opens a dropdown; picking a month navigates to
  `/?month=YYYY-MM`, and the dashboard scopes its month-based panels (stats,
  spending-by-category donut, top spending) to it. The activity heatmap and 14-day
  chart stay rolling windows anchored to today. The current month uses a clean `/`
  URL. Closes the long-standing `TopBar` TODO; still desktop-only on phones to keep
  the mobile top bar uncluttered.
  - **Only months with data are offered.** The dropdown lists the distinct months
    that actually have transactions (new `getTransactionMonths()`, server-fetched
    in the layout), always including the current month so it's selectable even
    with no data yet. The active month is also surfaced client-side so a
    hand-edited `?month=` URL still appears.
  - **Loading skeleton on switch.** The month-scoped Suspense boundaries are now
    keyed by month, so changing months re-shows their skeletons while the new
    data loads — a same-route `?month=` change is otherwise a transition that
    would keep the stale panels on screen. Non-month panels stay put (no flicker).
- **Dashboard performance — Suspense streaming + DB-side aggregation.** The
  dashboard was the only route that blocked on *all* its DB queries before
  painting, so navigating to it from another page felt slow. Each panel (stats,
  spending donut, daily spending, activity, recent activity, top spending) now
  streams in independently behind its own `<Suspense>` boundary with a loading
  skeleton, so the header and shell appear instantly. Data fetching moved to
  `src/lib/dashboard-data.ts`, wrapped in React `cache()` so panels that share a
  query (e.g. donut + top-spending) hit the DB once. Per-day activity and
  daily-spending series are now aggregated in Postgres (`groupBy` with
  `_count` / `_sum`) instead of pulling one row per transaction and counting in JS.
- **Charts moved to Recharts.** The hand-rolled donut and daily-spending bars were
  replaced with [Recharts](https://recharts.org) — `src/components/Donut.tsx`
  (rewritten) and the new `src/components/DailyBarChart.tsx`. The donut keeps the
  exact same prop API, so its call sites (Dashboard, Reports) didn't change. The
  daily-spending bars show a themed hover tooltip (`<date>: <amount>`). The
  activity heatmap was intentionally left as a custom component.
- **Activity heatmap hover tooltip.** Hovering a day cell now shows a styled
  tooltip (`<date>: <count> transactions`) that matches the chart theme, replacing
  the plain browser `title`. `ActivityGrid` became a client component to track
  hover state; the tooltip is anchored to a non-scrolling wrapper around the grid
  so it isn't clipped by the heatmap's horizontal scroll on phones.
- **Entrance animations + loading skeletons across the app.** Charts and panels
  fade/scale in on load, and progress bars grow in. The client-fetched pages
  (Budgets, Reports, Categories, Transactions) now show shimmer skeletons that
  mirror each page's real layout — new `src/components/Skeletons.tsx` — instead of
  the old plain "Loading…" text, so there's no layout shift when data arrives. All
  motion respects `prefers-reduced-motion`.

## [Unreleased] — 2026-06-18

### Changed
- **Reports page responsive improvements.** The 4-column category table was too
  crowded on phones — the Share bar column is now hidden at ≤560px, and the
  remaining columns get horizontal padding so Category and amount figures don't
  run together. The month picker stretches to full width when the page header
  stacks on narrow screens. A scroll wrapper on the table prevents layout breakage
  on older WebKit when a category name is long.

## [Unreleased] — 2026-06-16

### Changed
- **Full visual redesign — the "Sprout" theme.** Green-forward palette
  (`#0E5A3C` / lime `#BFF24A` on an off-white `#F3F6F0` canvas), DM Sans for body
  and Space Grotesk for headings/numbers (loaded via `next/font`). The design
  system lives in `globals.css` as `.mint-*` component classes scoped under a
  `.mint` app wrapper; tokens are CSS variables.
  - **Chrome:** new full-width top bar (`src/components/TopBar.tsx`) with brand
    tile, active-state nav, month pill, and an avatar linking to Settings. Replaces
    the old narrow header — `Nav.tsx` and `UserMenu.tsx` were removed and sign-out
    moved to the Settings page.
  - **Dashboard:** greeting header, income/expenses/featured-net stat cards, a
    spending-by-category **donut** (`src/components/Donut.tsx`), a **14-day daily
    spending** bar chart, the activity heatmap, recent activity, and top-spending
    bars. New server queries back the donut, daily series, and per-day activity
    counts.
  - **Activity heatmap** rebuilt to GitHub-style graduated green levels driven by
    transaction *count* per day (was binary on/off), via `countByDate`.
  - **Reports** redesigned with stat cards, a donut breakdown, and a share-bar
    table. **Settings / Login** re-themed to the new system while keeping
    existing behavior.
  - **Transactions** moved from a 5-column table to a mobile-friendly list
    grouped by day — each group shows an uppercase date header with the day's
    signed net total, and each row shows a colored category tile, the note as the
    title, a category pill, and the signed amount. Edit/delete became
    **tap-to-edit**: clicking a row expands an inline editor (date, type, category,
    note, amount) with Save / Cancel / Delete that reflows on narrow screens.
  - **Budgets** moved from an editable table to a progress-bar list: three stat
    cards (total budget / spent so far / remaining) plus one bar per expense
    category showing `spent / limit`, a fill that turns red when over budget, and
    a "% used" + "left"/"over by" footer. Spent figures come from the existing
    `/api/reports?month=` aggregation. Editing is inline per row — an **Edit/Set**
    affordance reveals a limit input with Save / Cancel / Remove that reflows on
    mobile.
  - **Categories** moved from a table to a responsive **card grid** (3 / 2 / 1
    columns) — each card shows a colored swatch, name, Income/Expense pill, and a
    footer with the transaction count + total. Editing is tap-to-edit (name, kind,
    Save / Cancel / Delete). New `GET /api/categories/stats` endpoint returns
    per-category count + summed amount.
  - `src/lib/colors.ts` (new) — shared green chart palette + stable per-category
    color.
- **Responsive layout.** Breakpoints at 960 / 820 / 760 / 560px collapse the
  multi-column grids to one column, wrap the top bar (nav becomes a scrollable
  row), stack the page headers and donut, and let the heatmap scroll sideways on
  phones. Grid ratios that were inline styles moved to classes (`.mint-grid.split`,
  `.mint-formgrid`) so the media queries can override them.

### Fixed
- **Table header crowding** — `.mint-table th` had no top padding, so headers sat
  flush against the card edge; added 18px.
- **Broken table rows** — the Name column applied the flex `.nm` class directly to
  a `<td>`, which overrode `display: table-cell` and misaligned row borders. Bold
  styling is now applied without breaking table layout.
- **Donut center figure overflow** — the total now auto-scales its font by length
  (and the ring is thinner / circle larger) so 5–6 digit peso amounts fit inside.

### Notes / TODO
- The top-bar month pill is **display-only** — the caret implies a dropdown but
  nothing is wired up yet (flagged with a TODO in `TopBar.tsx`; hidden on phones).

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
