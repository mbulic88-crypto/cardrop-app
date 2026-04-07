/**
 * Maintenance: 2026-04-07
 * Delete Watch Area for user 48484779 (Vanizelisova, Novi Sad)
 *
 * Reason: User's Watch Area at (45.2671, 19.8301) appeared as an unwanted
 * dark circle on the night-mode map. User requested deletion.
 *
 * This script is idempotent — safe to run multiple times.
 * Already executed: DELETE 1 (verified: COUNT = 0)
 */
import { db } from "./db";
import { mapWatchAreas } from "../shared/schema";
import { eq } from "drizzle-orm";

async function run() {
  const result = await db
    .delete(mapWatchAreas)
    .where(eq(mapWatchAreas.userId, "48484779"))
    .returning();
  console.log(`Deleted ${result.length} watch area(s) for user 48484779.`);
}

run().catch(console.error).finally(() => process.exit(0));
