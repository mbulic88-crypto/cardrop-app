ALTER TABLE "parking_spots" ADD COLUMN "pending_changes" jsonb;--> statement-breakpoint
ALTER TABLE "parking_spots" ADD COLUMN "pending_changes_from" timestamp;