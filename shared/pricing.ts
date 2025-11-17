// Pricing plans for parking spot listings

export type SubscriptionType = 'trial' | 'monthly' | 'half_yearly' | 'yearly';

export interface PricingPlan {
  id: SubscriptionType;
  name: string;
  nameEn: string;
  duration: number; // in days
  price: number; // in RSD
  pricePerMonth: number; // calculated for comparison
  savings: number; // percentage savings compared to monthly
  popular?: boolean;
  isTrial?: boolean;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'trial',
    name: 'Besplatno Probni Period',
    nameEn: 'Free Trial',
    duration: 14, // 2 weeks
    price: 0,
    pricePerMonth: 0,
    savings: 100,
    isTrial: true,
  },
  {
    id: 'monthly',
    name: '1 Mesec',
    nameEn: '1 Month',
    duration: 30,
    price: 1000,
    pricePerMonth: 1000,
    savings: 0,
  },
  {
    id: 'half_yearly',
    name: '6 Meseci',
    nameEn: '6 Months',
    duration: 180,
    price: 5000,
    pricePerMonth: 833.33,
    savings: 17,
    popular: true,
  },
  {
    id: 'yearly',
    name: '12 Meseci',
    nameEn: '12 Months',
    duration: 365,
    price: 9000,
    pricePerMonth: 750,
    savings: 25,
  },
];

export function getPlanById(id: SubscriptionType): PricingPlan | undefined {
  return PRICING_PLANS.find(plan => plan.id === id);
}

export function calculateExpiryDate(planId: SubscriptionType, startDate: Date = new Date()): Date {
  const plan = getPlanById(planId);
  if (!plan) throw new Error(`Invalid plan ID: ${planId}`);
  
  const expiryDate = new Date(startDate);
  expiryDate.setDate(expiryDate.getDate() + plan.duration);
  return expiryDate;
}

// Stripe amount in smallest currency unit (para for RSD)
export function getStripeAmount(planId: SubscriptionType): number {
  const plan = getPlanById(planId);
  if (!plan) throw new Error(`Invalid plan ID: ${planId}`);
  
  // Convert RSD to para (1 RSD = 100 para)
  return plan.price * 100;
}
