import webPush from 'web-push';
import { db } from './db';
import { pushSubscriptions } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    'mailto:info@cardrop.app',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  console.log('VAPID keys configured for push notifications');
} else {
  console.warn('VAPID keys not found - push notifications disabled. PUBLIC:', !!VAPID_PUBLIC_KEY, 'PRIVATE:', !!VAPID_PRIVATE_KEY);
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

export async function saveSubscription(userId: string, subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  try {
    // Upsert: update keys if the endpoint already exists (handles key rotation)
    await db.insert(pushSubscriptions).values({
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    }).onConflictDoUpdate({
      target: [pushSubscriptions.userId, pushSubscriptions.endpoint],
      set: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
    return true;
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return false;
  }
}

export async function removeSubscription(userId: string, endpoint: string) {
  try {
    await db.delete(pushSubscriptions)
      .where(and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.endpoint, endpoint)
      ));
    return true;
  } catch (error) {
    console.error('Error removing push subscription:', error);
    return false;
  }
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.log('[PUSH] VAPID keys not configured, skipping');
    return;
  }

  const subscriptions = await db.select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  if (subscriptions.length === 0) {
    console.log(`[PUSH] No subscriptions for userId=${userId}`);
    return;
  }

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const ep = sub.endpoint.slice(0, 60);
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (error: any) {
        const status = error.statusCode ?? error.status ?? 'unknown';
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`[PUSH] Stale sub removed userId=${userId} endpoint=${ep}`);
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
        } else {
          console.error(`[PUSH ERROR] userId=${userId} status=${status} msg=${error.message}`);
        }
        throw error;
      }
    })
  );

  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  if (subscriptions.length > 0) {
    console.log(`[PUSH] userId=${userId} sent=${succeeded} failed=${failed} total=${subscriptions.length}`);
  }
  return results;
}

export async function sendPushToAll(payload: PushPayload) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.log('[PUSH] VAPID keys not configured, skipping');
    return;
  }

  const subscriptions = await db.select().from(pushSubscriptions);

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const ep = sub.endpoint.slice(0, 60);
      console.log(`[PUSH] Sending to userId=${sub.userId} endpoint=${ep}...`);
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
          },
          JSON.stringify(payload)
        );
        console.log(`[PUSH] Success userId=${sub.userId} endpoint=${ep}`);
      } catch (error: any) {
        const status = error.statusCode ?? error.status ?? 'unknown';
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`[PUSH ERROR 410] Deleted stale sub for userId=${sub.userId} endpoint=${ep}`);
          await db.delete(pushSubscriptions)
            .where(eq(pushSubscriptions.id, sub.id));
        } else {
          console.error(`[PUSH ERROR] userId=${sub.userId} status=${status} msg=${error.message} endpoint=${ep}`);
        }
        throw error;
      }
    })
  );

  return results;
}
