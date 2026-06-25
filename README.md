# Budgeteer

A personal finance tracker with OAuth sign-in, per-user data isolation, and a
monthly budget workflow.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 + "Sprout" design system (`globals.css`) |
| Fonts | DM Sans + Space Grotesk (via `next/font`) |
| Auth | NextAuth v5 (GitHub + Google OAuth) |
| Database | PostgreSQL via Neon (serverless) |
| ORM | Prisma (pooled + direct connection) |
| Client data | TanStack Query v5 |
| Charts | Recharts (spending donut + daily-spend bars) |
| Validation | Zod (per-route request schemas) |
| Rate limiting | Upstash Redis (`@upstash/ratelimit`) |
| Tooling | ESLint (flat config) · Vitest |

## Design

The UI uses the **Sprout** theme — a green-forward palette (`#0E5A3C` with a lime
`#BFF24A` accent on an off-white `#F3F6F0` canvas). The design system is a set of
`.mint-*` component classes in `src/app/globals.css`, scoped under a `.mint`
wrapper applied in `layout.tsx`, with tokens exposed as CSS variables. The layout
is responsive down to phone widths (grids collapse, top-bar nav scrolls, the
activity heatmap scrolls sideways).

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Required variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon pooled connection string |
| `DIRECT_URL` | Neon direct connection string (for migrations) |
| `AUTH_SECRET` | Random string — generate with `openssl rand -base64 32` |
| `AUTH_GITHUB_ID` | GitHub OAuth App client ID |
| `AUTH_GITHUB_SECRET` | GitHub OAuth App client secret |
| `AUTH_GOOGLE_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |

Optional (API rate limiting — disabled when unset):

| Variable | Description |
|---|---|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL (from console.upstash.com) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |

> **Deploying with rate limiting:** the limiter runs in edge middleware, which
> inlines env vars **at build time** — set the `UPSTASH_*` vars in your host
> (e.g. Vercel) before building, or production will build with rate limiting off.

### 3. Dev vs. production OAuth

GitHub OAuth Apps only support one redirect URI, so create **two separate apps**
— one for development, one for production:

- **Dev callback URL:** `http://localhost:3000/api/auth/callback/github`
- **Prod callback URL:** `https://yourdomain.com/api/auth/callback/github`

Put the dev app credentials in `.env.local` (gitignored, overrides `.env`
locally). Vercel reads its own env vars and never loads `.env.local`.

### 4. Apply the database schema

```bash
npx prisma migrate deploy
```

### 5. Run

```bash
npm run dev   # http://localhost:3000
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (`prisma generate` + `next build`) |
| `npm start` | Serve the production build |
| `npm run lint` | Lint with ESLint |
| `npm test` | Run the Vitest suite |
| `npm run db:migrate` | Create and apply a new Prisma migration |
| `npm run db:seed` | Seed starter categories for a user |
| `npm run db:studio` | Open Prisma Studio |

## Project layout

```
prisma/              schema, migrations, seed
src/
  app/               routes + API
    api/             REST endpoints (transactions, categories, budgets, reports, health)
    budgets/         monthly budget limits per category
    categories/      category management
    login/           OAuth sign-in
    reports/         monthly report (income, expenses, net savings)
    settings/        user settings + provider linking + sign out
    transactions/    transaction list + add form
    error.tsx / not-found.tsx / global-error.tsx   App Router error boundaries
    icon.svg         app icon (favicon)
    globals.css      Sprout design system (.mint-* classes, tokens)
    layout.tsx       app shell: fonts, top bar, .mint wrapper
    page.tsx         dashboard (server-rendered, Suspense-streamed panels)
  components/        shared UI: TopBar, Donut, DailyBarChart, ActivityGrid, Skeletons, row/form components
  lib/               Prisma client, utils, colors, category-icon, session,
                     dashboard-data, http (error handling), schemas (Zod),
                     logger, rate-limit
  middleware.ts      edge auth guard + per-IP API rate limiting
  types/             shared TypeScript interfaces
```

## Feature status

| Feature | Status |
|---|---|
| GitHub + Google OAuth, per-user data | Done |
| Transactions — add, edit, delete | Done |
| Categories — create, rename, change kind, delete | Done |
| Budgets — set/update/remove monthly limits per category | Done |
| Dashboard — totals, spending donut, 14-day bars, activity heatmap, recent + top spending | Done |
| Reports — totals, donut breakdown, per-category share table | Done |
| Sprout visual redesign + responsive layout | Done |
| Category icons — per-category line icons on tinted tiles, app-wide | Done |
| Top-bar month pill — switches the dashboard's active month | Done |
| Transactions — cursor pagination ("Load more") | Done |
| Reliability — error boundaries, safe JSON parsing, centralized error handling + logging | Done |
| Security — Zod validation, atomic multi-step writes, security headers, per-IP API rate limiting | Done |
| Tooling — ESLint, Vitest API suite, `/api/health` probe | Done |
| Reports — budget-vs-actual progress bar visualization | TODO |
| CSP — currently report-only; needs nonce wiring before enforcing | TODO |
