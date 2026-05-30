ALTER TABLE "parking_spots" ADD COLUMN IF NOT EXISTS "total_spaces" integer NOT NULL DEFAULT 1;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "space_number" integer NOT NULL DEFAULT 1;
