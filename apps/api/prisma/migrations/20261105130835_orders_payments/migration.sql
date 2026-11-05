-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "expires_at" TIMESTAMP(3),
ALTER COLUMN "delivery_method" DROP NOT NULL,
ALTER COLUMN "delivery_method" DROP DEFAULT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "payment_url" TEXT,
ADD COLUMN     "requires_review" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "review_reason" TEXT;

-- CreateIndex
CREATE INDEX "orders_status_expires_at_idx" ON "orders"("status", "expires_at");

-- CreateIndex
CREATE INDEX "payments_requires_review_idx" ON "payments"("requires_review");

-- Курьер и почта — только с адресом доставки
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_delivery_address_required_chk"
    CHECK ("delivery_method" NOT IN ('COURIER', 'POST') OR "delivery_address" IS NOT NULL);
