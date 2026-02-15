import { getUncachableStripeClient } from './stripeClient';

async function seedProducts() {
  const stripe = await getUncachableStripeClient();

  const existingProducts = await stripe.products.search({ query: "metadata['app']:'cardrop'" });
  if (existingProducts.data.length > 0) {
    console.log('CarDrop products already exist in Stripe. Skipping seed.');
    console.log('Existing products:');
    for (const p of existingProducts.data) {
      console.log(`  - ${p.name} (${p.id})`);
    }
    return;
  }

  console.log('Creating CarDrop subscription products in Stripe...');

  const silverProduct = await stripe.products.create({
    name: 'CarDrop Silver',
    description: 'Silver pretplata za parking oglas - Istaknuto mesto na mapi, do 3 fotografije, srebrni pin, 30 dana Silver + 30 dana Standard vidljivosti',
    metadata: {
      app: 'cardrop',
      tier: 'silver',
      activeDays: '30',
      totalVisibilityDays: '60',
      maxPhotos: '3',
    },
  });

  const silverPrice = await stripe.prices.create({
    product: silverProduct.id,
    unit_amount: 80000,
    currency: 'rsd',
    metadata: {
      app: 'cardrop',
      tier: 'silver',
    },
  });

  console.log(`Silver product created: ${silverProduct.id}`);
  console.log(`Silver price created: ${silverPrice.id} (800 RSD)`);

  const goldProduct = await stripe.products.create({
    name: 'CarDrop Gold',
    description: 'Gold pretplata za parking oglas - Top lokacija, do 5 fotografija, zlatni pin, najviša pozicija u pretrazi, 30 dana Gold + 30 dana Standard vidljivosti',
    metadata: {
      app: 'cardrop',
      tier: 'gold',
      activeDays: '30',
      totalVisibilityDays: '60',
      maxPhotos: '5',
    },
  });

  const goldPrice = await stripe.prices.create({
    product: goldProduct.id,
    unit_amount: 120000,
    currency: 'rsd',
    metadata: {
      app: 'cardrop',
      tier: 'gold',
    },
  });

  console.log(`Gold product created: ${goldProduct.id}`);
  console.log(`Gold price created: ${goldPrice.id} (1200 RSD)`);

  console.log('\n=== Stripe Products Created Successfully ===');
  console.log(`Silver: product=${silverProduct.id}, price=${silverPrice.id}`);
  console.log(`Gold: product=${goldProduct.id}, price=${goldPrice.id}`);
}

seedProducts().catch(console.error);
