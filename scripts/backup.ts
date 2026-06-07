import { PrismaClient } from "@prisma/client";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

// One-off, read-only export of all app data to a timestamped JSON file under
// /backups. Decimal/Date fields serialize to strings, which Prisma accepts back
// on restore. Run with: npx tsx scripts/backup.ts
const prisma = new PrismaClient();

async function main() {
  const [categories, transactions, budgets] = await Promise.all([
    prisma.category.findMany(),
    prisma.transaction.findMany(),
    prisma.budget.findMany(),
  ]);

  const backup = {
    exportedAt: new Date().toISOString(),
    counts: {
      categories: categories.length,
      transactions: transactions.length,
      budgets: budgets.length,
    },
    data: { categories, transactions, budgets },
  };

  const dir = path.join(process.cwd(), "backups");
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(dir, `backup-${stamp}.json`);
  writeFileSync(file, JSON.stringify(backup, null, 2));

  console.log(`Backed up to ${file}`);
  console.log(backup.counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
