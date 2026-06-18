-- Add apple_id column to users for Sign in with Apple (App Store Guideline 4.8)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "apple_id" varchar;
ALTER TABLE "users" ADD CONSTRAINT "users_apple_id_unique" UNIQUE("apple_id");
