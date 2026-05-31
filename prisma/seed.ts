import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// First day of the current month (UTC) — used to anchor budgets and recent transactions.
function startOfMonthUTC(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

// A date N days into the current month (UTC).
function dayThisMonth(day: number): Date {
  const base = startOfMonthUTC();
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), day));
}

async function main() {
  // Start clean so the seed is idempotent.
  await prisma.transaction.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.category.deleteMany();

  // Income categories — distinct from the expense set below.
  const salary = await prisma.category.create({
    data: { name: "Salary", kind: "income" },
  });
  const freelance = await prisma.category.create({
    data: { name: "Freelance", kind: "income" },
  });
  const investments = await prisma.category.create({
    data: { name: "Investments", kind: "income" },
  });
  const allowance = await prisma.category.create({
    data: { name: "Allowance", kind: "income" },
  });

  // Expense categories.
  const groceries = await prisma.category.create({
    data: { name: "Groceries", kind: "expense" },
  });
  const rent = await prisma.category.create({
    data: { name: "Rent", kind: "expense" },
  });
  const dining = await prisma.category.create({
    data: { name: "Dining Out", kind: "expense" },
  });
  const transport = await prisma.category.create({
    data: { name: "Transport", kind: "expense" },
  });

  const month = startOfMonthUTC();

  // Monthly budgets for expense categories (peso amounts).
  await prisma.budget.createMany({
    data: [],
  });

  // Sample transactions for the current month (peso amounts).
  await prisma.transaction.createMany({
    data: [],
  });

  console.log("Seed complete ✅");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
