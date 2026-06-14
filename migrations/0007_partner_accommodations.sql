-- Create partner_accommodations table for recommended stays feature
CREATE TABLE IF NOT EXISTS "partner_accommodations" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "city" varchar(50) NOT NULL,
  "instagram_url" varchar(500),
  "images" text[] DEFAULT ARRAY[]::text[] NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now()
);
