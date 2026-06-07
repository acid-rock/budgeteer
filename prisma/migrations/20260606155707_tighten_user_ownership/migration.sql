-- DropIndex
DROP INDEX "Category_name_kind_key";

-- AlterTable
ALTER TABLE "Budget" ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Category" ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "userId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Category_userId_name_kind_key" ON "Category"("userId", "name", "kind");
