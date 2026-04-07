/**
 * Maintenance: 2026-04-07
 * Delete Safe Zone for user 48484779 (lat=45.2658, lng=19.8522, near Vanizelisova, Novi Sad)
 *
 * Reason: User's Safe Zone appeared as an unwanted dark orange circle on the
 * night-mode map. User requested deletion. deleteMapSafeZone() storage method
 * and DELETE /api/map-hack/safe-zone route added in the same commit.
 *
 * This script is idempotent — safe to run multiple times.
 * Already executed: DELETE 1 (verified: COUNT = 0)
 */
import { db } from "./db";
import { mapSafeZones } from "../shared/schema";
import { eq } from "drizzle-orm";

async function run() {
  const result = await db
    .delete(mapSafeZones)
    .where(eq(mapSafeZones.userId, "48484779"))
    .returning();
  console.log(`Deleted ${result.length} safe zone(s) for user 48484779.`);
}

run().catch(console.error).finally(() => process.exit(0));
