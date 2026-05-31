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
    data: [
      { categoryId: groceries.id, month, limit: 12000 },
      { categoryId: rent.id, month, limit: 18000 },
      { categoryId: dining.id, month, limit: 6000 },
      { categoryId: transport.id, month, limit: 4000 },
    ],
  });

  // Sample transactions for the current month (peso amounts).
  await prisma.transaction.createMany({
    data: [
      { type: "income", amount: 45000, date: dayThisMonth(1), note: "Monthly pay", categoryId: salary.id },
      { type: "income", amount: 12000, date: dayThisMonth(8), note: "Logo design gig", categoryId: freelance.id },
      { type: "income", amount: 1500, date: dayThisMonth(15), note: "Dividend payout", categoryId: investments.id },
      { type: "expense", amount: 18000, date: dayThisMonth(2), note: "Apartment rent", categoryId: rent.id },
      { type: "expense", amount: 3200, date: dayThisMonth(3), note: "Weekly shop", categoryId: groceries.id },
      { type: "expense", amount: 850, date: dayThisMonth(6), note: "Pizza night", categoryId: dining.id },
      { type: "expense", amount: 1200, date: dayThisMonth(7), note: "Bus & jeepney load", categoryId: transport.id },
      { type: "expense", amount: 2750, date: dayThisMonth(10), note: "Groceries", categoryId: groceries.id },
      { type: "expense", amount: 600, date: dayThisMonth(12), note: "Lunch out", categoryId: dining.id },
    ],
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
