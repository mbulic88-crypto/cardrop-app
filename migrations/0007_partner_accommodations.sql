-- Create partner_accommodations table for recommended stays feature
CREATE TABLE IF NOT EXISTS "partner_accommodations" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "city" text NOT NULL,
  "instagram_url" text,
  "images" text[] DEFAULT '{}' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
