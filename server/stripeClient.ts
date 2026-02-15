import Stripe from 'stripe';

function getSecretKey(): string {
  const key = process.env.CARDROP_SK;
  if (!key) {
    throw new Error('CARDROP_SK environment variable is not set');
  }
  return key;
}

function getPublishableKeyFromEnv(): string {
  const key = process.env.CARDROP_PK;
  if (!key) {
    throw new Error('CARDROP_PK environment variable is not set');
  }
  return key;
}

export async function getUncachableStripeClient() {
  return new Stripe(getSecretKey(), {
    apiVersion: '2025-08-27.basil' as any,
  });
}

export async function getStripePublishableKey() {
  return getPublishableKeyFromEnv();
}

export async function getStripeSecretKey() {
  return getSecretKey();
}

let stripeSync: any = null;

export async function getStripeSync() {
  if (!stripeSync) {
    const { StripeSync } = await import('stripe-replit-sync');
    const secretKey = getSecretKey();

    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL!,
        max: 2,
      },
      stripeSecretKey: secretKey,
    });
  }
  return stripeSync;
}
