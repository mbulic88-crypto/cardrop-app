import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';
import { sendMapHackRenewalEmail, sendMapHackCancellationEmail, sendSpotListingPurchaseEmail } from './email';

async function handleMapHackWebhookEvent(event: { type: string; data: { object: Record<string, unknown> } }): Promise<void> {
  // ── Subscription cancelled ────────────────────────────────────────────────
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const metadata = subscription.metadata as Record<string, string> | undefined;
    const userId = metadata?.userId;
    if (!userId) return;

    const user = await storage.getUser(userId);
    if (!user) return;

    // Only reset if the subscription ID matches what we have stored
    const subId = subscription.id as string | undefined;
    if (subId && user.stripeSubscriptionId && user.stripeSubscriptionId !== subId) return;

    await storage.updateMapHackPlan(userId, 'free', null);
    await storage.updateMapHackSubscription(userId, { stripeSubscriptionId: null });
    console.log(`[MapHack Webhook] Subscription cancelled for user ${userId}, plan reset to free`);
    const cancelledPlan = (subscription.metadata as Record<string, string> | undefined)?.plan || 'premium';
    if (user.email) {
      sendMapHackCancellationEmail(user.email, user.firstName || user.email, cancelledPlan).catch(() => {});
    }

  // ── Subscription renewed (Stripe's authoritative period dates) ────────────
  } else if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object;
    const subscriptionId = invoice.subscription as string | undefined;
    if (!subscriptionId) return;

    // Only handle subscription renewal/creation invoices (not one-time payments)
    const billingReason = invoice.billing_reason as string | undefined;
    if (billingReason !== 'subscription_cycle' && billingReason !== 'subscription_create') return;

    // Fetch subscription to get authoritative period_end and metadata
    let userId: string | undefined;
    let plan: string | undefined;
    let currentPeriodEnd: number | undefined;

    // In newer Stripe API versions (basil) the subscription shape may differ;
    // define only the fields we actually read to stay type-safe without `any`.
    interface StripeSubscriptionFields {
      metadata?: Record<string, string>;
      current_period_end?: number;
    }

    try {
      const stripe = await getUncachableStripeClient();
      const raw = await stripe.subscriptions.retrieve(subscriptionId);
      const subscription = raw as unknown as StripeSubscriptionFields;
      userId = subscription.metadata?.userId;
      plan = subscription.metadata?.plan;
      currentPeriodEnd = subscription.current_period_end;
    } catch (err) {
      console.error('[MapHack Webhook] Could not fetch subscription for invoice.payment_succeeded:', err);
      return;
    }

    if (!userId || !plan) return;
    if (plan !== 'premium' && plan !== 'godisnji_premium') return;

    const user = await storage.getUser(userId);
    if (!user) return;

    // Validate subscription ID to prevent stale/duplicate events
    if (user.stripeSubscriptionId && user.stripeSubscriptionId !== subscriptionId) {
      console.warn(`[MapHack Webhook] Subscription ID mismatch for user ${userId}, skipping renewal`);
      return;
    }

    // Use Stripe's authoritative current_period_end; fall back to fixed offsets
    const expiresAt = currentPeriodEnd
      ? new Date(currentPeriodEnd * 1000)
      : plan === 'godisnji_premium'
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await storage.updateMapHackPlan(userId, plan, expiresAt);
    console.log(`[MapHack Webhook] Subscription renewed for user ${userId}, plan=${plan}, expires=${expiresAt.toISOString()}`);
    // Only send renewal email on actual renewal cycles, not initial purchase
    if (billingReason === 'subscription_cycle' && user.email) {
      sendMapHackRenewalEmail(user.email, user.firstName || user.email, plan, expiresAt).catch(() => {});
    }

  // ── Subscription updated (e.g. trial→active, plan change) ────────────────
  } else if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object;
    const metadata = subscription.metadata as Record<string, string> | undefined;
    const userId = metadata?.userId;
    const plan = metadata?.plan;
    if (!userId || !plan) return;
    if (plan !== 'premium' && plan !== 'godisnji_premium') return;

    const status = subscription.status as string | undefined;
    if (status !== 'active' && status !== 'trialing') return;

    const user = await storage.getUser(userId);
    if (!user) return;

    const subId = subscription.id as string | undefined;
    if (subId && user.stripeSubscriptionId && user.stripeSubscriptionId !== subId) return;

    const periodEnd = subscription.current_period_end as number | undefined;
    const expiresAt = periodEnd
      ? new Date(periodEnd * 1000)
      : plan === 'godisnji_premium'
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await storage.updateMapHackPlan(userId, plan, expiresAt);
    console.log(`[MapHack Webhook] Subscription updated for user ${userId}, plan=${plan}, expires=${expiresAt.toISOString()}`);
  }
}

async function handleMapHackDayPassWebhookEvent(event: { type: string; data: { object: Record<string, unknown> } }): Promise<void> {
  if (event.type !== 'checkout.session.completed') return;

  const session = event.data.object;
  const metadata = session.metadata as Record<string, string> | undefined;
  if (metadata?.type !== 'map_hack') return;
  if (metadata?.plan !== 'day_pass') return;

  const { userId } = metadata;
  if (!userId) {
    console.error('[MapHack DayPass Webhook] Missing userId in metadata');
    return;
  }

  const paymentStatus = session.payment_status as string | undefined;
  if (paymentStatus !== 'paid') {
    console.log(`[MapHack DayPass Webhook] payment_status=${paymentStatus}, skipping`);
    return;
  }

  const stripeSessionId = session.id as string | undefined;
  if (!stripeSessionId) return;

  try {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const user = await storage.activateMapHackPlanWithSession(userId, 'day_pass', expiresAt, stripeSessionId);

    if (!user) {
      console.error('[MapHack DayPass Webhook] User not found:', userId);
      return;
    }

    console.log(`[MapHack DayPass Webhook] Day Pass activated for user ${userId}, expires=${expiresAt.toISOString()}`);

    if (user.email) {
      sendMapHackPurchaseEmail(user.email, user.firstName || user.email, 'day_pass', expiresAt).catch(() => {});
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('unique') || msg.includes('duplicate')) {
      console.log(`[MapHack DayPass Webhook] Session ${stripeSessionId} already consumed, skipping`);
    } else {
      console.error('[MapHack DayPass Webhook] Error activating Day Pass:', err);
    }
  }
}

async function handleSpotListingWebhookEvent(event: { type: string; data: { object: Record<string, unknown> } }): Promise<void> {
  if (event.type !== 'checkout.session.completed') return;

  const session = event.data.object;
  const metadata = session.metadata as Record<string, string> | undefined;
  if (metadata?.type !== 'spot_listing') return;

  const { spotId, userId, tier } = metadata;
  if (!spotId || !userId || !tier) {
    console.error('[Spot Listing Webhook] Missing metadata fields', { spotId, userId, tier });
    return;
  }

  const paymentStatus = session.payment_status as string | undefined;
  if (paymentStatus !== 'paid') {
    console.log(`[Spot Listing Webhook] payment_status=${paymentStatus}, skipping`);
    return;
  }

  if (tier !== 'silver' && tier !== 'gold') {
    console.error('[Spot Listing Webhook] Invalid tier:', tier);
    return;
  }

  const stripeSessionId = session.id as string | undefined;
  if (!stripeSessionId) return;

  try {
    const { calculateExpiryDate } = await import('../shared/pricing.js');
    const subscriptionExpiresAt = calculateExpiryDate(tier as 'silver' | 'gold');

    const { spot, alreadyConsumed } = await storage.activateSpotWithSession(
      spotId, tier as 'silver' | 'gold', subscriptionExpiresAt, stripeSessionId, userId
    );

    if (alreadyConsumed) {
      console.log(`[Spot Listing Webhook] Session ${stripeSessionId} already consumed, skipping`);
      return;
    }

    if (!spot) {
      console.error('[Spot Listing Webhook] Spot not found after activation:', spotId);
      return;
    }

    console.log(`[Spot Listing Webhook] Spot ${spotId} activated — plan=${tier}, user=${userId}`);

    // Send confirmation email to spot owner
    const user = await storage.getUser(userId);
    if (user?.email) {
      sendSpotListingPurchaseEmail({
        to: user.email,
        name: user.firstName || user.email,
        plan: tier as 'silver' | 'gold',
        spotTitle: spot.title,
        spotAddress: spot.address || '',
        expiresAt: spot.subscriptionExpiresAt ?? null,
      }).catch(() => {});
    }
  } catch (err) {
    console.error('[Spot Listing Webhook] Error activating spot:', err);
  }
}

async function handleCreditTopupWebhookEvent(event: { type: string; data: { object: Record<string, unknown> } }): Promise<void> {
  if (event.type !== 'checkout.session.completed') return;

  const session = event.data.object;
  const metadata = session.metadata as Record<string, string> | undefined;
  if (metadata?.type !== 'credit_topup') return;

  const userId = metadata?.userId;
  const amountRsdStr = metadata?.amountRsd;
  const stripeSessionId = session.id as string | undefined;

  if (!userId || !amountRsdStr || !stripeSessionId) {
    console.error('[Credits Webhook] Missing metadata fields', { userId, amountRsdStr, stripeSessionId });
    return;
  }

  const paymentStatus = session.payment_status as string | undefined;
  if (paymentStatus !== 'paid') {
    console.log(`[Credits Webhook] Session ${stripeSessionId} payment_status=${paymentStatus}, skipping`);
    return;
  }

  const amountRsd = parseInt(amountRsdStr, 10);
  if (!amountRsd || amountRsd <= 0) {
    console.error('[Credits Webhook] Invalid amountRsd:', amountRsdStr);
    return;
  }

  // Idempotency: skip if session already consumed
  const already = await storage.isCreditSessionConsumed(stripeSessionId);
  if (already) {
    console.log(`[Credits Webhook] Session ${stripeSessionId} already consumed, skipping`);
    return;
  }

  await storage.addCreditTopup(userId, amountRsd, stripeSessionId);
  console.log(`[Credits Webhook] Credited ${amountRsd} RSD to user ${userId} (session ${stripeSessionId})`);
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    // After the Replit sync has verified the signature and processed its events,
    // also handle Map Hack subscription events and credit topups.
    try {
      const event = JSON.parse(payload.toString()) as { type: string; data: { object: Record<string, unknown> } };
      await handleMapHackWebhookEvent(event);
      await handleMapHackDayPassWebhookEvent(event);
      await handleCreditTopupWebhookEvent(event);
      await handleSpotListingWebhookEvent(event);
    } catch (err) {
      console.error('[Webhook] Error handling custom event:', err);
    }
  }
}
