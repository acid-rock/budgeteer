# Budgeteer

A personal finance tracker with OAuth sign-in, per-user data isolation, and a
monthly budget workflow.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 |
| Auth | NextAuth v5 (GitHub + Google OAuth) |
| Database | PostgreSQL via Neon (serverless) |
| ORM | Prisma (pooled + direct connection) |
| Client data | TanStack Query v5 |

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
| `npm run db:migrate` | Create and apply a new Prisma migration |
| `npm run db:seed` | Seed starter categories for a user |
| `npm run db:studio` | Open Prisma Studio |

## Project layout

```
prisma/              schema, migrations, seed
src/
  app/               routes + API
    (auth)/          login page
    api/             REST endpoints (transactions, categories, budgets, reports)
    budgets/         monthly budget limits per category
    categories/      category management
    reports/         monthly report (income, expenses, net savings)
    settings/        user settings + provider linking
    transactions/    transaction list + add form
    page.tsx         dashboard (server-rendered)
  components/        shared UI components
  lib/               Prisma client, utilities, session helpers
  types/             shared TypeScript interfaces
```

## Feature status

| Feature | Status |
|---|---|
| GitHub + Google OAuth, per-user data | Done |
| Transactions — add, edit, delete | Done |
| Categories — create, rename, change kind, delete | Done |
| Budgets — set/update/remove monthly limits per category | Done |
| Dashboard — current-month totals, activity streak grid, recent activity, top spending | Done |
| Reports — monthly totals + per-category breakdown table | Done |
| Reports — budget-vs-actual progress bar visualization | TODO |
