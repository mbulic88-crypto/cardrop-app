import Stripe from 'stripe';
import { getUncachableStripeClient } from './stripeClient';

export type ProductCategory = 'private' | 'company' | 'truck_stop' | 'residential' | 'car_lot' | 'sale';
export type ProductTier = 'silver' | 'gold';

interface ProductDefinition {
  category: ProductCategory;
  tier: ProductTier;
  name: string;
  description: string;
  priceRSD: number;
}

const PRODUCT_DEFINITIONS: ProductDefinition[] = [
  { category: 'private', tier: 'silver', name: 'CarDrop - Privatni Parking - Silver', description: 'Silver plan za privatne parkinge i garaže', priceRSD: 800 },
  { category: 'private', tier: 'gold', name: 'CarDrop - Privatni Parking - Gold', description: 'Gold plan za privatne parkinge i garaže', priceRSD: 1200 },
  { category: 'company', tier: 'silver', name: 'CarDrop - Firma - Silver', description: 'Silver plan za firme i agencije', priceRSD: 800 },
  { category: 'company', tier: 'gold', name: 'CarDrop - Firma - Gold', description: 'Gold plan za firme i agencije', priceRSD: 1200 },
  { category: 'truck_stop', tier: 'silver', name: 'CarDrop - Kamion Stajalište - Silver', description: 'Silver plan za stajališta za kamione', priceRSD: 800 },
  { category: 'truck_stop', tier: 'gold', name: 'CarDrop - Kamion Stajalište - Gold', description: 'Gold plan za stajališta za kamione', priceRSD: 1200 },
  { category: 'residential', tier: 'silver', name: 'CarDrop - Stambena Zajednica - Silver', description: 'Silver plan za stambene zajednice', priceRSD: 800 },
  { category: 'residential', tier: 'gold', name: 'CarDrop - Stambena Zajednica - Gold', description: 'Gold plan za stambene zajednice', priceRSD: 1200 },
  { category: 'car_lot', tier: 'silver', name: 'CarDrop - Auto Plac - Silver', description: 'Silver plan za auto placeve', priceRSD: 800 },
  { category: 'car_lot', tier: 'gold', name: 'CarDrop - Auto Plac - Gold', description: 'Gold plan za auto placeve', priceRSD: 1200 },
  { category: 'sale', tier: 'silver', name: 'CarDrop - Prodaja - Silver', description: 'Silver plan za oglase prodaje', priceRSD: 800 },
  { category: 'sale', tier: 'gold', name: 'CarDrop - Prodaja - Gold', description: 'Gold plan za oglase prodaje', priceRSD: 1200 },
];

const priceIdCache: Map<string, string> = new Map();

function getCacheKey(category: ProductCategory, tier: ProductTier): string {
  return `${category}_${tier}`;
}

export function getStripePriceId(category: ProductCategory, tier: ProductTier): string | undefined {
  return priceIdCache.get(getCacheKey(category, tier));
}

export async function syncStripeProducts(): Promise<void> {
  let stripe: Stripe;
  try {
    stripe = await getUncachableStripeClient();
  } catch (error) {
    console.error('Stripe not configured, skipping product sync');
    return;
  }

  console.log('Syncing Stripe products...');

  try {
    const existingProducts = await stripe.products.list({ limit: 100, active: true });

    for (const def of PRODUCT_DEFINITIONS) {
      const metadataKey = getCacheKey(def.category, def.tier);

      const existing = existingProducts.data.find(
        (p) => p.metadata?.app === 'cardrop' && p.metadata?.category === def.category && p.metadata?.tier === def.tier
      );

      if (existing) {
        const prices = await stripe.prices.list({ product: existing.id, active: true, limit: 1 });
        if (prices.data.length > 0) {
          priceIdCache.set(metadataKey, prices.data[0].id);
          console.log(`Found existing: ${def.name} -> ${prices.data[0].id}`);
          continue;
        }
      }

      console.log(`Creating product: ${def.name}`);
      const product = await stripe.products.create({
        name: def.name,
        description: def.description,
        metadata: {
          app: 'cardrop',
          category: def.category,
          tier: def.tier,
        },
      });

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: def.priceRSD * 100,
        currency: 'rsd',
        metadata: {
          app: 'cardrop',
          category: def.category,
          tier: def.tier,
        },
      });

      priceIdCache.set(metadataKey, price.id);
      console.log(`Created: ${def.name} -> ${price.id}`);
    }

    console.log('Stripe products synced successfully. Products:', priceIdCache.size);
  } catch (error) {
    console.error('Error syncing Stripe products:', error);
  }
}
