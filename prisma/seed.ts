import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Baseline category taxonomy. These are upserted by (name, kind), so the seed
// is idempotent and NON-DESTRUCTIVE: it never deletes rows and is safe to re-run
// anytime (including after a migration). No sample transactions or budgets are
// created — real data is entered through the app.
const categories: { name: string; kind: "income" | "expense" }[] = [
  // Income
  { name: "Salary", kind: "income" },
  { name: "Freelance", kind: "income" },
  { name: "Investments", kind: "income" },
  { name: "Allowance", kind: "income" },
  { name: "Miscellaneous", kind: "income" },
  // Expense
  { name: "Groceries", kind: "expense" },
  { name: "Rent", kind: "expense" },
  { name: "Dining Out", kind: "expense" },
  { name: "Transport", kind: "expense" },
  { name: "Miscellaneous", kind: "expense" },
];

async function main() {
  for (const { name, kind } of categories) {
    await prisma.category.upsert({
      where: { name_kind: { name, kind } },
      create: { name, kind },
      update: {}, // already exists → leave as-is (no overwrite, no delete)
    });
  }

  console.log(
    `Seed complete ✅  (${categories.length} categories upserted; no data deleted)`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
