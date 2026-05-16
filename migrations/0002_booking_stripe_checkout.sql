ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "saved_license_plate" varchar(30);
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "license_plate" varchar(30);
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "booking_stripe_session_id" varchar(255);
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_booking_stripe_session_id_unique'
  ) THEN
    ALTER TABLE "bookings" ADD CONSTRAINT "bookings_booking_stripe_session_id_unique" UNIQUE("booking_stripe_session_id");
  END IF;
END $$;
