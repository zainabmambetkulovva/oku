-- Вход через Google и язык писем пользователя

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "google_id" TEXT,
ADD COLUMN     "locale" VARCHAR(2) NOT NULL DEFAULT 'ru';

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- Только поддерживаемые языки сайта
ALTER TABLE "users" ADD CONSTRAINT "users_locale_check" CHECK ("locale" IN ('ru', 'ky'));
