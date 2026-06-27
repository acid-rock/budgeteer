# Changelog

All notable changes to Budgeteer. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/).

## [Unreleased] — 2026-06-26

### Added
- **Operational safety (backups & monitoring).**
  - **Sentry error monitoring.** `@sentry/nextjs` reports client **and** server
    errors. Because every API route is wrapped in `withErrorHandling` (which
    catches errors before Next's `onRequestError` hook fires), the unhandled-500
    branch in `src/lib/http.ts` calls `Sentry.captureException` directly; the two
    client error boundaries (`error.tsx`, `global-error.tsx`) capture there too.
    Runtime init lives in `sentry.{server,edge}.config.ts` +
    `instrumentation-client.ts`, loaded from `src/instrumentation.ts`
    (`register` / `onRequestError`); `next.config.ts` is wrapped in
    `withSentryConfig`. Browser events tunnel through a same-origin `/monitoring`
    route so the strict `connect-src 'self'` CSP doesn't block them (that route is
    excluded from the auth middleware). **Finance-data scrubbing** is mandatory:
    `sendDefaultPii: false` plus a `beforeSend` (`src/lib/sentry-scrub.ts`) that
    drops request bodies/cookies and redacts amounts/notes/emails by key; the same
    redaction runs in the logger's `normalizeMeta`. Session Replay is off; tracing
    sample rate is 0. The SDK runs disabled when `NEXT_PUBLIC_SENTRY_DSN` is unset,
    so the app boots with no DSN. Source maps upload from CI when
    `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT` are set, skipped gracefully
    otherwise.
  - **Error sink (fallback).** `src/lib/logger.ts` still forwards production
    error-level logs (fire-and-forget JSON) to an optional `ERROR_SINK_URL`
    webhook for anyone not on Sentry — edge-safe, dormant when a DSN is set.
  - **Docs.** New **Production operations** section in the README covering Neon
    point-in-time recovery / history retention, Sentry, and pointing an uptime
    monitor at the existing `GET /api/health` probe. Refreshed the stale
    feature-status table (budget-vs-actual, CSP, PWA, CSV, account deletion, etc.
    now marked done).

### Changed
- **Concurrency hardening (savings withdrawals).** The withdrawal balance check
  in `POST /api/savings/movements` reads the running balance then inserts; under
  default isolation two concurrent withdrawals could both pass and overdraw the
  bucket. The `$transaction` now runs at **Serializable** isolation so Postgres
  aborts the racing write, and serialization conflicts (`P2034`) map to a clean
  **409 "please try again"** in `handleApiError` instead of a 500. `GET` also
  gains an explicit ownership pre-check on `?categoryId` (defense-in-depth: a
  foreign id is now a clear 404 rather than a silently-empty list).

### Added
- **Account deletion.** New `DELETE /api/account` permanently removes the
  authenticated user and all their data, then clears the session cookie so the
  orphaned JWT can't be replayed. Because `Transaction`/`Budget` → `Category` are
  `onDelete: Restrict`, a bare `user.delete` cascade could trip the FK check, so
  the route deletes transactions → budgets → categories → user in one
  `$transaction` (accounts/sessions still cascade). A **Danger zone** on the
  Settings page (`src/components/DeleteAccount.tsx`) gates it behind a typed
  `DELETE` confirmation and nudges the user to export their data first.
- **Insights & alerts.**
  - **Overspend warning (Reports).** A category that has reached or passed its
    monthly budget limit (`spent ≥ limit`) now raises a warning banner at the top
    of the report listing each over-budget category with its spend / limit / %,
    and the per-row budget bar turns red at the limit (not only past it). Backed
    by a pure `overBudgetCategories` helper in `src/lib/utils.ts`.
  - **Prior-month trend deltas (Dashboard).** The Income and Expenses stat cards
    show a `▲/▼ N% vs last month` line, tone-aware (rising income green, rising
    spending red). Reuses `getMonthTotals` over the `priorMonthsRange(month, 1)`
    window and a new pure `percentDelta` helper (null baseline → line hidden).
- **Installable PWA.** Budgeteer can now be installed to a phone home screen and
  launched standalone.
  - **Manifest.** New `src/app/manifest.ts` (served at `/manifest.webmanifest`)
    with name, standalone display, Sprout theme/background colors, and a
    "Quick add" launch shortcut that deep-links to `/?quickadd=1`. The QuickAdd
    component opens its sheet when that param is present (then strips it).
  - **Icons.** Generated home-screen PNGs (192/512 + a maskable 512 + an Apple
    touch icon) from the green-tile / lime-"B" brand mark via a committed
    `scripts/generate-pwa-icons.mjs` (sharp; the "B" is drawn as vector paths so
    rasterization doesn't depend on a system font). Wired the manifest link,
    `theme-color`, and `apple-touch-icon` into `src/app/layout.tsx`.
  - **Service worker + offline shell.** `public/sw.js` (registered in production
    via `ServiceWorkerRegister`) gives installability and serves a cached
    `public/offline.html` when a navigation fails offline. It caches only static
    build assets + icons — never API responses or HTML — so no per-user data is
    stored on the device.
  - **Auth middleware** now treats the manifest, service worker, offline shell,
    and icon PNGs as public (like `favicon.ico`/`icon.svg`) so they're fetchable
    without a session; all other routes stay guarded.
- **CSV export.** New `GET /api/transactions/export` streams the authenticated
  user's full ledger as a downloadable CSV — RFC 4180 quoting, a UTF-8 BOM so
  Excel renders peso signs / unicode notes, and savings transfers excluded (same
  as the ledger API). An **Export CSV** button sits in the Reports page header.
  Shared CSV helpers live in `src/lib/csv.ts` (unit-tested) so the upcoming
  import flow can reuse the column format.
- **CSV import.** New `POST /api/transactions/import` ingests a CSV ledger for
  the authenticated user. Columns are auto-mapped by header (case-insensitive,
  any order — so an exported file round-trips); `Note` is optional. Parsing is
  server-side via a new RFC 4180 `parseCsv` in `src/lib/csv.ts`, every row is
  validated against a new `transactionImportRowSchema` Zod schema, and the
  **whole file is rejected on the first bad row** (400 with the spreadsheet row
  number — no partial import). Valid rows are written in a single Prisma
  `$transaction`, match-or-creating categories by `(name, kind)`. An **Import
  CSV** button (`src/components/ImportCsv.tsx`) sits beside Export in the Reports
  header and refreshes every affected view on success.

### Changed
- **Transaction indexes & explicit FK actions** (migration
  `schema_index_hardening`). Replaced the single-column `[date]` and `[userId]`
  indexes on `Transaction` with composite `[userId, date]` and `[userId, type]`
  — matching how every ledger query scopes by user first, then filters by date
  range or type (dashboard, reports, export). The `[categoryId]` FK index stays.
  Also made the `Category → Transaction` and `Category → Budget` relations'
  `onDelete: Restrict` explicit in the schema (it was already the effective
  default and backs the app-level "category in use" pre-delete check), so no FK
  SQL change was required.
- **Enforced Content-Security-Policy.** Switched the CSP from
  `Content-Security-Policy-Report-Only` (which allowed `'unsafe-inline'` /
  `'unsafe-eval'`) to an **enforcing** `Content-Security-Policy`, now built
  per-request in `src/middleware.ts` with a fresh nonce (`src/lib/csp.ts`). Next's
  inline bootstrap scripts are allowed via `'nonce-…' 'strict-dynamic'`, so
  production `script-src` no longer needs `'unsafe-inline'`/`'unsafe-eval'`
  (development keeps them for HMR's `eval`). `style-src` retains `'unsafe-inline'`
  because Recharts / next-font inline styles can't carry a nonce — that's where
  the script-side hardening matters. The static security headers stay in
  `next.config.ts`; the middleware matcher now also covers `/login`. Verified the
  served HTML: every `<script>` carries the matching nonce, zero un-nonced inline
  scripts.

## [Unreleased] — 2026-06-25

### Added
- **App-wide Quick-Add.** A floating `+` button (bottom-right, on every
  authenticated page) opens a compact modal to log an expense or income from
  anywhere — date defaults to today, the last-used category is remembered per
  kind (localStorage), and the new row appears optimistically before the round
  trip.
  - **Shared create logic, no duplication.** The create flow was extracted into a
    headless `useTransactionForm` hook (`src/hooks/useTransactionForm.ts`) used by
    both the new `QuickAdd` modal and the existing inline `TransactionForm`; the
    optimistic insert is a pure `prependTransaction` helper in
    `src/lib/transactions.ts` (unit-tested).
  - **Cross-view freshness.** A successful add invalidates `["transactions"]`,
    `["report"]`, `["category-stats"]`, and `["budgets"]`, and calls
    `router.refresh()` so the server-rendered dashboard totals update without a
    full reload — from any page.
  - **Mobile-aware.** The button respects `env(safe-area-inset-*)` so it clears a
    phone's home indicator / browser bottom bar.
- **Continuous integration (GitHub Actions).** New `.github/workflows/ci.yml` runs
  on pushes to `main`/`dev` and on every pull request: `npm ci` → `npm run lint` →
  `npm test` → `npm run build` on Node 20. The build step gets placeholder
  `DATABASE_URL`/`DIRECT_URL`/`AUTH_*` env so `prisma generate` and `next build`
  resolve their references (no real secrets; Upstash left unset so rate limiting
  self-disables). In-progress runs on the same ref are cancelled when superseded.
- **Startup environment validation.** New `src/lib/env.ts` validates the server
  env against a Zod schema — required `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`,
  and the four `AUTH_GITHUB_*`/`AUTH_GOOGLE_*` vars, plus optional
  `UPSTASH_REDIS_REST_URL`/`_TOKEN` — and exports a typed `env`. A new
  `src/instrumentation.ts` imports it at server boot (Node runtime only), so a
  missing or blank required var throws one clear error listing every problem
  *before* the first request, instead of failing deep inside a handler. The module
  is intentionally Node-only (kept out of the edge middleware to preserve the
  existing adapter-free edge boundary); the Upstash vars stay read directly in
  `rate-limit.ts` for the edge runtime. Vitest gains placeholder `test.env` so the
  module is safe to import under test, plus unit tests for the schema.
  in from scratch. A new **Auto-budget** button (Budgets header, next to the month
  picker) opens a preview panel listing every expense category with a suggested
  limit = its **average spend over the previous 3 months** (raw average to 2
  decimals — no buffer, no rounding). Each row has a checkbox (default checked)
  and an editable amount, and shows the category's current limit for that month
  (highlighted, since applying would overwrite it). "Apply selected" writes only
  the checked rows.
  - `GET /api/budgets/suggest?month=YYYY-MM` returns the suggestions (0 when a
    category has no history) + each category's existing limit. New
    `priorMonthsRange(month, n)` util computes the rolling UTC window; the endpoint
    is structured so a future `?strategy=` (last-month, all-time, …) can branch on
    the window/math.
  - `POST /api/budgets/bulk { month, items }` verifies every category is owned and
    upserts all limits in one `$transaction` (same `categoryId_month` upsert as the
    single-budget POST), so a partial apply can't half-write. New `budgetBulkSchema`.
  - Applying invalidates `["budgets", month]` and `["report", month]`, so the
    budgets summary and Reports reflect the change immediately.
- **Savings.** A new **Savings** area (nav + `/savings`) for setting money aside
  into named buckets, modeled as *transfers* rather than expenses — so deposits
  and withdrawals never touch Income/Expense/Net totals, reports, or the
  Transactions ledger.
  - **Modeled additively.** A category `kind: "savings"` and transaction
    `type: "deposit" | "withdraw"` slot into the existing schema (one nullable
    `Category.target` Decimal for the optional goal; migration `savings`). Because
    every ledger aggregation already sums only `income`/`expense` or filters
    `kind === "expense"`, savings are excluded automatically; the only explicit
    guards added are `type: { in: ["income","expense"] }` on `GET /api/transactions`
    and hiding savings buckets on the Categories page.
  - **Buckets with optional goals.** Each bucket tracks a running balance
    (deposited − withdrawn). A progress bar + "to go" line appears **only** when a
    target is set; goal-less buckets are pure balance tracking. Create buckets
    inline (name + optional goal); edit the goal or delete a bucket from its card.
  - **Deposit / withdraw.** New `POST /api/savings/movements` records a movement
    (atomic ownership + `kind === "savings"` check), and **rejects a withdrawal
    that exceeds the bucket balance** with a 400. `GET /api/savings` returns
    per-bucket balances + total saved; `GET /api/savings/movements` is
    cursor-paginated (optional `?categoryId`). New `src/lib/savings-data.ts`
    aggregates balances in Postgres (`groupBy`), wrapped in React `cache()`.
  - **UI.** Total-saved / goals stats, a bucket-card grid, a deposit/withdraw
    form, and an infinite-scroll movement history — all on the Sprout design
    system, with a piggy-bank icon and a distinct lime tile for savings.

### Fixed
- **Stale `categories` API tests.** The `makeCategory` test factory predated the
  savings migration's nullable `Category.target` column, so its objects lacked
  `target` while the API serializes every category through `serializeCategory`
  (which always emits `target: null` for income/expense). Two full-object
  assertions failed as a result; the factory now models the real row shape. (This
  unblocked the CI suite — it was red on the base branch.)

## [Unreleased] — 2026-06-24

### Added
- **Category icons.** Every category now shows a line icon on a colored tile,
  consistent across the Categories grid, transaction rows, the dashboard's recent
  activity, Budgets, and Reports (replacing the plain colored dots/squares). A
  curated 24×24 / 1.7-stroke icon set (`src/lib/category-icon.tsx`, ported from
  the "Sprout" design) is matched to a category by name keyword — e.g. Groceries →
  cart, Dining → utensils, Transport → bus, Rent → house, Salary → banknote,
  Investments → trending-up — with a kind-based fallback so custom categories
  still get a sensible icon. Tiles follow the design: expense categories use a
  soft 16% tint of their color with a dark-green icon, income categories a solid
  positive-green tile with a white icon (`categoryTile()` in `src/lib/colors.ts`).
  Icons are inline SVG, so there's no new runtime dependency.

## [Unreleased] — 2026-06-21

### Added
- **Production hardening, Phase 3 — tooling & polish.**
  - **ESLint.** Added a flat config (`eslint.config.mjs`) that extends
    `eslint-config-next` v16's native flat config; `npm run lint` now runs
    `eslint .` and passes clean. (`next lint` was removed in Next 16.)
  - **Transaction pagination.** `GET /api/transactions` is now cursor-paginated —
    `?limit` (default 20, max 100) + `?cursor=<id>`, returning
    `{ items, nextCursor }` instead of the full list. `TransactionList` uses
    `useInfiniteQuery` with a **Load more** button (same query key, so mutations
    elsewhere still invalidate it). Ordered by `date desc, id desc` for a stable
    cursor across same-day rows.
  - **Health check.** New public `GET /api/health` (excluded from the auth
    middleware) runs a `SELECT 1` — `200 { status: "ok" }` when the database is
    reachable, `503` when not — for load-balancer / uptime probes.

### Changed
- **Pinned `next-auth`** to the exact `5.0.0-beta.31` (dropped the `^`) to avoid
  surprise beta bumps.
- **Extracted the daily-spending "heavy spend" threshold** (₱300) and the two bar
  colors to named constants in `DailyBarChart.tsx`.

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
- **Production hardening, Phase 2 — security & data hardening.**
  - **Security headers.** `next.config.ts` now sets `X-Content-Type-Options:
    nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy:
    strict-origin-when-cross-origin`, `Strict-Transport-Security` (production
    only), and a **report-only** `Content-Security-Policy` on every route. CSP is
    report-only for now because Next emits inline scripts/styles; it needs nonce
    wiring + a report endpoint before it can be enforced.
  - **Atomic multi-step writes.** Wrapped the check-then-write races in
    `prisma.$transaction`: transaction create/PATCH (category-ownership check +
    write), budget create (category check + upsert), and category delete (usage
    count + delete, with the `onDelete: Restrict` FK as the backstop). New
    `NotFoundError` / `ConflictError` in `src/lib/http.ts` map in-transaction
    failures to 404 / 409.
  - **Input validation with Zod.** Added `zod`; per-route schemas live in
    `src/lib/schemas.ts` (parsed via `parseWith()` → `400` with the first issue's
    message). Adds protections the hand-rolled checks lacked: unparseable dates
    rejected, `note` ≤ 500 chars, category `name` ≤ 80, all trimmed. POST
    `/categories` keeps its lenient "unknown kind → expense" default; PATCH stays
    strict.
  - **Rate limiting (Upstash Redis).** `src/middleware.ts` now throttles `/api/*`
    per IP (sliding window, 100 req/60s) and returns `429` with `X-RateLimit-*` /
    `Retry-After` headers when exceeded, before any handler or DB work. Backed by
    `@upstash/ratelimit` + `@upstash/redis` (`src/lib/rate-limit.ts`); disabled
    gracefully when `UPSTASH_REDIS_REST_URL` / `_TOKEN` are unset (local/CI). Set
    those env vars in the host (incl. at build time — edge middleware inlines env
    on build). Verified live: 120 requests → first 100 pass, next 20 get `429`.
  - **Tests.** +`$transaction` mocks and invalid-date / oversized-note cases;
    suite at 135 passing.

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

### Fixed
- **Login page was reachable while authenticated.** The middleware deliberately
  excludes `/login` from its guard, so a signed-in user could still open it.
  `/login` now calls `auth()` and redirects to the dashboard when a session
  exists. No redirect loop: the dashboard only bounces *unauthenticated* users the
  other way.

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
