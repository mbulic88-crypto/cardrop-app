import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';

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

    try {
      const stripe = await getUncachableStripeClient();
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      userId = subscription.metadata?.userId;
      plan = subscription.metadata?.plan;
      currentPeriodEnd = (subscription as any).current_period_end;
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
    // also handle Map Hack subscription events.
    try {
      const event = JSON.parse(payload.toString()) as { type: string; data: { object: Record<string, unknown> } };
      await handleMapHackWebhookEvent(event);
    } catch (err) {
      console.error('[MapHack Webhook] Error handling Map Hack event:', err);
    }
  }
}
