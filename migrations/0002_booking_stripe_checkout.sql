ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "saved_license_plate" varchar(30);
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "license_plate" varchar(30);
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "booking_stripe_session_id" varchar(255);
ALTER TABLE "bookings" ADD CONSTRAINT IF NOT EXISTS "bookings_booking_stripe_session_id_unique" UNIQUE("booking_stripe_session_id");
