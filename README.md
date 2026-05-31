# 💰 Budgeteer

A minimal personal finance tracker. Single local user, no auth.

## Stack
- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS** v4
- **SQLite** via **Prisma**
- **TanStack Query** for client data fetching/caching

## Getting started

```bash
npm install
npx prisma migrate dev --name init   # create the SQLite DB + tables
npm run db:seed                       # load sample categories + transactions
npm run dev                           # http://localhost:3000
```

## Scripts
| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build + serve |
| `npm run db:migrate` | Create/apply a Prisma migration |
| `npm run db:seed` | Seed sample data |
| `npm run db:reset` | Drop, re-migrate, and re-seed the DB |
| `npm run db:studio` | Open Prisma Studio |

## Layout
```
prisma/            schema, migrations, seed
src/app/           routes (dashboard, transactions, budgets, reports) + /api
src/components/    UI components
src/lib/           db client (db.ts) + helpers (utils.ts)
src/types/         shared TS types
```

## Status
- ✅ **Transactions** — add form + list, fully wired DB → UI.
- ✅ **API** — CRUD for transactions/categories/budgets + `/api/reports` aggregation.
- ✅ **Dashboard** — current-month totals (server-rendered).
- 🚧 **Budgets page** — shows data; editing flow is a stubbed TODO.
- 🚧 **Reports page** — shows totals + table; budget-vs-actual viz is a TODO.
