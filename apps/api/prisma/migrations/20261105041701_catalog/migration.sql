-- AlterTable
ALTER TABLE "audiobooks" ADD COLUMN     "sales_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "books" ADD COLUMN     "sales_count" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "audiobooks_status_sales_count_idx" ON "audiobooks"("status", "sales_count");

-- CreateIndex
CREATE INDEX "books_status_sales_count_idx" ON "books"("status", "sales_count");

-- Язык книги и аудиокниги — только коды ru, ky, en
ALTER TABLE "books"
  ADD CONSTRAINT "books_language_chk" CHECK ("language" IS NULL OR "language" IN ('ru', 'ky', 'en')),
  ADD CONSTRAINT "books_sales_count_non_negative_chk" CHECK ("sales_count" >= 0);

ALTER TABLE "audiobooks"
  ADD CONSTRAINT "audiobooks_language_chk" CHECK ("language" IS NULL OR "language" IN ('ru', 'ky', 'en')),
  ADD CONSTRAINT "audiobooks_sales_count_non_negative_chk" CHECK ("sales_count" >= 0);
