-- AlterTable
ALTER TABLE "users" ADD COLUMN     "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "locked_until" TIMESTAMP(3);

-- Счётчик неудачных попыток входа не может быть отрицательным
ALTER TABLE "users"
  ADD CONSTRAINT "users_failed_login_attempts_non_negative_chk" CHECK ("failed_login_attempts" >= 0);
