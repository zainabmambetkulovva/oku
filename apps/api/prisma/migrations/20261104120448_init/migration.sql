-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BANNED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('BOOK', 'AUDIOBOOK');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'CASH', 'TERMINAL', 'ONLINE', 'QR');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('COURIER', 'PICKUP', 'POST');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ORDER_CREATED', 'ORDER_PAID', 'ORDER_SHIPPED', 'ORDER_COMPLETED', 'ORDER_CANCELLED', 'ACCESS_GRANTED', 'REVIEW_CREATED', 'PROMOTION', 'SYSTEM');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "phone" TEXT,
    "avatar_key" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "email_verified_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "recipient_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "building" TEXT NOT NULL,
    "apartment" TEXT,
    "postal_code" TEXT,
    "comment" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "image_key" TEXT,
    "parent_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "books" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "description" TEXT,
    "cover_key" TEXT,
    "publisher" TEXT,
    "publication_year" INTEGER,
    "pages" INTEGER,
    "language" TEXT,
    "isbn" TEXT,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KGS',
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_categories" (
    "book_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,

    CONSTRAINT "book_categories_pkey" PRIMARY KEY ("book_id","category_id")
);

-- CreateTable
CREATE TABLE "book_images" (
    "id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "alt_text" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audiobooks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "narrator" TEXT,
    "description" TEXT,
    "cover_key" TEXT,
    "language" TEXT,
    "duration_seconds" INTEGER NOT NULL DEFAULT 0,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KGS',
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audiobooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_chapters" (
    "id" TEXT NOT NULL,
    "audiobook_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "chapter_number" INTEGER NOT NULL,
    "duration_seconds" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "is_free_preview" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audio_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audiobook_categories" (
    "audiobook_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,

    CONSTRAINT "audiobook_categories_pkey" PRIMARY KEY ("audiobook_id","category_id")
);

-- CreateTable
CREATE TABLE "audio_access" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "audiobook_id" TEXT NOT NULL,
    "order_item_id" TEXT,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audio_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "book_id" TEXT,
    "audiobook_id" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "subtotal" INTEGER NOT NULL,
    "delivery_price" INTEGER NOT NULL DEFAULT 0,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KGS',
    "recipient_name" TEXT NOT NULL,
    "recipient_phone" TEXT NOT NULL,
    "delivery_address" TEXT,
    "delivery_method" "DeliveryMethod" NOT NULL DEFAULT 'COURIER',
    "payment_method" "PaymentMethod" NOT NULL DEFAULT 'ONLINE',
    "comment" TEXT,
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_type" "ProductType" NOT NULL,
    "book_id" TEXT,
    "audiobook_id" TEXT,
    "product_title" TEXT NOT NULL,
    "product_author" TEXT NOT NULL,
    "product_cover_key" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "total_price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KGS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "old_status" "OrderStatus",
    "new_status" "OrderStatus" NOT NULL,
    "changed_by_id" TEXT,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_payment_id" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KGS',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "payment_method" "PaymentMethod" NOT NULL DEFAULT 'ONLINE',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "external_event_id" TEXT NOT NULL,
    "payment_id" TEXT,
    "event_type" TEXT NOT NULL,
    "payload" JSONB,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "book_id" TEXT,
    "audiobook_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "book_id" TEXT,
    "audiobook_id" TEXT,
    "rating" INTEGER NOT NULL,
    "text" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listening_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "audiobook_id" TEXT NOT NULL,
    "chapter_id" TEXT,
    "position_seconds" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "last_listened_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listening_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newsletter_subscribers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "subscribed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribed_at" TIMESTAMP(3),

    CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "old_data" JSONB,
    "new_data" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "addresses_user_id_idx" ON "addresses"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_user_id_key" ON "email_verification_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_token_hash_key" ON "email_verification_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "email_verification_tokens_expires_at_idx" ON "email_verification_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_user_id_key" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parent_id_idx" ON "categories"("parent_id");

-- CreateIndex
CREATE INDEX "categories_is_active_sort_order_idx" ON "categories"("is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "books_slug_key" ON "books"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "books_isbn_key" ON "books"("isbn");

-- CreateIndex
CREATE INDEX "books_title_trgm_idx" ON "books" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "books_author_trgm_idx" ON "books" USING GIN ("author" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "books_status_created_at_idx" ON "books"("status", "created_at");

-- CreateIndex
CREATE INDEX "books_status_price_idx" ON "books"("status", "price");

-- CreateIndex
CREATE INDEX "book_categories_category_id_idx" ON "book_categories"("category_id");

-- CreateIndex
CREATE INDEX "book_images_book_id_sort_order_idx" ON "book_images"("book_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "audiobooks_slug_key" ON "audiobooks"("slug");

-- CreateIndex
CREATE INDEX "audiobooks_title_trgm_idx" ON "audiobooks" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "audiobooks_author_trgm_idx" ON "audiobooks" USING GIN ("author" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "audiobooks_status_created_at_idx" ON "audiobooks"("status", "created_at");

-- CreateIndex
CREATE INDEX "audiobooks_status_price_idx" ON "audiobooks"("status", "price");

-- CreateIndex
CREATE UNIQUE INDEX "audio_chapters_audiobook_id_chapter_number_key" ON "audio_chapters"("audiobook_id", "chapter_number");

-- CreateIndex
CREATE INDEX "audiobook_categories_category_id_idx" ON "audiobook_categories"("category_id");

-- CreateIndex
CREATE INDEX "audio_access_audiobook_id_idx" ON "audio_access"("audiobook_id");

-- CreateIndex
CREATE INDEX "audio_access_order_item_id_idx" ON "audio_access"("order_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "audio_access_user_id_audiobook_id_key" ON "audio_access"("user_id", "audiobook_id");

-- CreateIndex
CREATE UNIQUE INDEX "carts_user_id_key" ON "carts"("user_id");

-- CreateIndex
CREATE INDEX "cart_items_book_id_idx" ON "cart_items"("book_id");

-- CreateIndex
CREATE INDEX "cart_items_audiobook_id_idx" ON "cart_items"("audiobook_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cart_id_book_id_key" ON "cart_items"("cart_id", "book_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cart_id_audiobook_id_key" ON "cart_items"("cart_id", "audiobook_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_user_id_created_at_idx" ON "orders"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "orders_status_created_at_idx" ON "orders"("status", "created_at");

-- CreateIndex
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_book_id_idx" ON "order_items"("book_id");

-- CreateIndex
CREATE INDEX "order_items_audiobook_id_idx" ON "order_items"("audiobook_id");

-- CreateIndex
CREATE INDEX "order_status_history_order_id_created_at_idx" ON "order_status_history"("order_id", "created_at");

-- CreateIndex
CREATE INDEX "order_status_history_changed_by_id_idx" ON "order_status_history"("changed_by_id");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_created_at_idx" ON "payments"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_provider_payment_id_key" ON "payments"("provider", "provider_payment_id");

-- CreateIndex
CREATE INDEX "payment_events_payment_id_idx" ON "payment_events"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_provider_external_event_id_key" ON "payment_events"("provider", "external_event_id");

-- CreateIndex
CREATE INDEX "favorites_book_id_idx" ON "favorites"("book_id");

-- CreateIndex
CREATE INDEX "favorites_audiobook_id_idx" ON "favorites"("audiobook_id");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_user_id_book_id_key" ON "favorites"("user_id", "book_id");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_user_id_audiobook_id_key" ON "favorites"("user_id", "audiobook_id");

-- CreateIndex
CREATE INDEX "reviews_book_id_status_idx" ON "reviews"("book_id", "status");

-- CreateIndex
CREATE INDEX "reviews_audiobook_id_status_idx" ON "reviews"("audiobook_id", "status");

-- CreateIndex
CREATE INDEX "reviews_status_idx" ON "reviews"("status");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_user_id_book_id_key" ON "reviews"("user_id", "book_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_user_id_audiobook_id_key" ON "reviews"("user_id", "audiobook_id");

-- CreateIndex
CREATE INDEX "listening_progress_user_id_last_listened_at_idx" ON "listening_progress"("user_id", "last_listened_at");

-- CreateIndex
CREATE INDEX "listening_progress_audiobook_id_idx" ON "listening_progress"("audiobook_id");

-- CreateIndex
CREATE INDEX "listening_progress_chapter_id_idx" ON "listening_progress"("chapter_id");

-- CreateIndex
CREATE UNIQUE INDEX "listening_progress_user_id_audiobook_id_key" ON "listening_progress"("user_id", "audiobook_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscribers_email_key" ON "newsletter_subscribers"("email");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_categories" ADD CONSTRAINT "book_categories_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_categories" ADD CONSTRAINT "book_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_images" ADD CONSTRAINT "book_images_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_chapters" ADD CONSTRAINT "audio_chapters_audiobook_id_fkey" FOREIGN KEY ("audiobook_id") REFERENCES "audiobooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audiobook_categories" ADD CONSTRAINT "audiobook_categories_audiobook_id_fkey" FOREIGN KEY ("audiobook_id") REFERENCES "audiobooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audiobook_categories" ADD CONSTRAINT "audiobook_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_access" ADD CONSTRAINT "audio_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_access" ADD CONSTRAINT "audio_access_audiobook_id_fkey" FOREIGN KEY ("audiobook_id") REFERENCES "audiobooks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_access" ADD CONSTRAINT "audio_access_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_audiobook_id_fkey" FOREIGN KEY ("audiobook_id") REFERENCES "audiobooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_audiobook_id_fkey" FOREIGN KEY ("audiobook_id") REFERENCES "audiobooks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_audiobook_id_fkey" FOREIGN KEY ("audiobook_id") REFERENCES "audiobooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_audiobook_id_fkey" FOREIGN KEY ("audiobook_id") REFERENCES "audiobooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listening_progress" ADD CONSTRAINT "listening_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listening_progress" ADD CONSTRAINT "listening_progress_audiobook_id_fkey" FOREIGN KEY ("audiobook_id") REFERENCES "audiobooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listening_progress" ADD CONSTRAINT "listening_progress_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "audio_chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- CHECK-ограничения (docs/database-specification.md, раздел 15).
-- Prisma не описывает CHECK в схеме и не трогает их при следующих миграциях.
-- ═══════════════════════════════════════════════════════════════════════════

-- Книги: цена положительная (спецификация 4.2), остаток не отрицательный
ALTER TABLE "books"
  ADD CONSTRAINT "books_price_positive_chk" CHECK ("price" > 0),
  ADD CONSTRAINT "books_stock_quantity_non_negative_chk" CHECK ("stock_quantity" >= 0),
  ADD CONSTRAINT "books_pages_positive_chk" CHECK ("pages" IS NULL OR "pages" > 0);

-- Аудиокниги: цена не отрицательная; у опубликованной аудиокниги длительность > 0
ALTER TABLE "audiobooks"
  ADD CONSTRAINT "audiobooks_price_non_negative_chk" CHECK ("price" >= 0),
  ADD CONSTRAINT "audiobooks_duration_non_negative_chk" CHECK ("duration_seconds" >= 0),
  ADD CONSTRAINT "audiobooks_active_duration_positive_chk"
    CHECK ("status" <> 'ACTIVE' OR "duration_seconds" > 0);

-- Главы: положительные номер и длительность
ALTER TABLE "audio_chapters"
  ADD CONSTRAINT "audio_chapters_chapter_number_positive_chk" CHECK ("chapter_number" > 0),
  ADD CONSTRAINT "audio_chapters_duration_positive_chk" CHECK ("duration_seconds" > 0);

-- Корзина: ровно один товар; количество > 0; аудиокнига — только 1 штука
ALTER TABLE "cart_items"
  ADD CONSTRAINT "cart_items_one_product_chk" CHECK (num_nonnulls("book_id", "audiobook_id") = 1),
  ADD CONSTRAINT "cart_items_quantity_positive_chk" CHECK ("quantity" > 0),
  ADD CONSTRAINT "cart_items_audiobook_quantity_chk" CHECK ("audiobook_id" IS NULL OR "quantity" = 1);

-- Заказы: суммы не отрицательные, итог = подытог + доставка − скидка
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_subtotal_non_negative_chk" CHECK ("subtotal" >= 0),
  ADD CONSTRAINT "orders_delivery_price_non_negative_chk" CHECK ("delivery_price" >= 0),
  ADD CONSTRAINT "orders_discount_non_negative_chk" CHECK ("discount" >= 0),
  ADD CONSTRAINT "orders_total_non_negative_chk" CHECK ("total" >= 0),
  ADD CONSTRAINT "orders_total_consistent_chk"
    CHECK ("total" = "subtotal" + "delivery_price" - "discount");

-- Позиции заказа: ссылка на товар соответствует product_type (после удаления
-- товара ссылка может стать NULL); количество > 0; аудиокнига — 1 штука;
-- сумма позиции = цена × количество
ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_product_type_chk" CHECK (
    ("product_type" = 'BOOK' AND "audiobook_id" IS NULL)
    OR ("product_type" = 'AUDIOBOOK' AND "book_id" IS NULL)
  ),
  ADD CONSTRAINT "order_items_quantity_positive_chk" CHECK ("quantity" > 0),
  ADD CONSTRAINT "order_items_audiobook_quantity_chk"
    CHECK ("product_type" <> 'AUDIOBOOK' OR "quantity" = 1),
  ADD CONSTRAINT "order_items_unit_price_non_negative_chk" CHECK ("unit_price" >= 0),
  ADD CONSTRAINT "order_items_total_price_consistent_chk"
    CHECK ("total_price" = "unit_price" * "quantity");

-- Платежи: сумма положительная
ALTER TABLE "payments"
  ADD CONSTRAINT "payments_amount_positive_chk" CHECK ("amount" > 0);

-- Избранное и отзывы: ровно один товар; рейтинг 1–5
ALTER TABLE "favorites"
  ADD CONSTRAINT "favorites_one_product_chk" CHECK (num_nonnulls("book_id", "audiobook_id") = 1);

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_one_product_chk" CHECK (num_nonnulls("book_id", "audiobook_id") = 1),
  ADD CONSTRAINT "reviews_rating_range_chk" CHECK ("rating" BETWEEN 1 AND 5);

-- Прогресс прослушивания: позиция не отрицательная
ALTER TABLE "listening_progress"
  ADD CONSTRAINT "listening_progress_position_non_negative_chk" CHECK ("position_seconds" >= 0);

-- Категория не может быть родителем самой себя
ALTER TABLE "categories"
  ADD CONSTRAINT "categories_not_self_parent_chk" CHECK ("parent_id" IS NULL OR "parent_id" <> "id");
