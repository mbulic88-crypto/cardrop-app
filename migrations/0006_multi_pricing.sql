-- Add multi-pricing columns to parking_spots
ALTER TABLE "parking_spots" ADD COLUMN IF NOT EXISTS "price_per_day" numeric(10, 2);
ALTER TABLE "parking_spots" ADD COLUMN IF NOT EXISTS "price_per_week" numeric(10, 2);
ALTER TABLE "parking_spots" ADD COLUMN IF NOT EXISTS "price_per_month" numeric(10, 2);

-- Backfill: for spots with daily pricingType, copy pricePerHour into pricePerDay
UPDATE "parking_spots" SET "price_per_day" = "price_per_hour"
  WHERE "pricing_type" = 'daily' AND "price_per_day" IS NULL AND "price_per_hour" IS NOT NULL;

-- Backfill: for spots with monthly pricingType, copy pricePerHour into pricePerMonth
UPDATE "parking_spots" SET "price_per_month" = "price_per_hour"
  WHERE "pricing_type" = 'monthly' AND "price_per_month" IS NULL AND "price_per_hour" IS NOT NULL;

-- Add pricingType column to bookings table
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "pricing_type" varchar(20) NOT NULL DEFAULT 'daily';
