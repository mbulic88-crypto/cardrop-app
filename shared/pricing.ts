// Pricing plans for parking spot listings

export type SubscriptionType = 'trial' | 'monthly' | 'half_yearly' | 'yearly' | 'company_basic' | 'company_premium' | 'company_half_yearly' | 'company_premium_half_yearly';

export type CategoryType = 'private' | 'company' | 'truck' | 'residential' | 'carlot';

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
  category: 'private' | 'company'; // which category this plan applies to
  description?: string;
  descriptionEn?: string;
  maxSpots?: number; // for company plans
  maxPhotosPerSpot?: number; // for company plans
}

// Private/Individual pricing plans
export const PRIVATE_PRICING_PLANS: PricingPlan[] = [
  {
    id: 'trial',
    name: 'Besplatno Probni Period',
    nameEn: 'Free Trial',
    duration: 14, // 2 weeks
    price: 0,
    pricePerMonth: 0,
    savings: 100,
    isTrial: true,
    category: 'private',
  },
  {
    id: 'monthly',
    name: '1 Mesec',
    nameEn: '1 Month',
    duration: 30,
    price: 1000,
    pricePerMonth: 1000,
    savings: 0,
    category: 'private',
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
    category: 'private',
  },
  {
    id: 'yearly',
    name: '12 Meseci',
    nameEn: '12 Months',
    duration: 365,
    price: 9000,
    pricePerMonth: 750,
    savings: 25,
    category: 'private',
  },
];

// Company pricing plans
export const COMPANY_PRICING_PLANS: PricingPlan[] = [
  {
    id: 'trial',
    name: 'Besplatno Probni Period',
    nameEn: 'Free Trial',
    duration: 14,
    price: 0,
    pricePerMonth: 0,
    savings: 100,
    isTrial: true,
    category: 'company',
    maxSpots: 5,
    maxPhotosPerSpot: 3,
  },
  {
    id: 'company_basic',
    name: 'Osnovni Paket',
    nameEn: 'Basic Package',
    duration: 30,
    price: 3000,
    pricePerMonth: 3000,
    savings: 0,
    category: 'company',
    description: 'Do 5 parking mesta, 3 slike po mestu',
    descriptionEn: 'Up to 5 parking spots, 3 photos per spot',
    maxSpots: 5,
    maxPhotosPerSpot: 3,
  },
  {
    id: 'company_premium',
    name: 'Premium Paket',
    nameEn: 'Premium Package',
    duration: 30,
    price: 6000,
    pricePerMonth: 6000,
    savings: 0,
    popular: true,
    category: 'company',
    description: 'Neograničen broj mesta i slika',
    descriptionEn: 'Unlimited spots and photos',
    maxSpots: -1, // unlimited
    maxPhotosPerSpot: -1, // unlimited
  },
  {
    id: 'company_half_yearly',
    name: 'Osnovni 6 Meseci',
    nameEn: 'Basic 6 Months',
    duration: 180,
    price: 15000,
    pricePerMonth: 2500,
    savings: 17,
    category: 'company',
    description: 'Do 5 parking mesta, 3 slike po mestu',
    descriptionEn: 'Up to 5 parking spots, 3 photos per spot',
    maxSpots: 5,
    maxPhotosPerSpot: 3,
  },
  {
    id: 'company_premium_half_yearly',
    name: 'Premium 6 Meseci',
    nameEn: 'Premium 6 Months',
    duration: 180,
    price: 30000,
    pricePerMonth: 5000,
    savings: 17,
    category: 'company',
    description: 'Neograničen broj mesta i slika',
    descriptionEn: 'Unlimited spots and photos',
    maxSpots: -1,
    maxPhotosPerSpot: -1,
  },
];

// Combined for backward compatibility
export const PRICING_PLANS: PricingPlan[] = [...PRIVATE_PRICING_PLANS];

export function getPlansByCategory(category: CategoryType): PricingPlan[] {
  if (category === 'company') {
    return COMPANY_PRICING_PLANS;
  }
  return PRIVATE_PRICING_PLANS;
}

export function getPlanById(id: SubscriptionType, category: CategoryType = 'private'): PricingPlan | undefined {
  const plans = getPlansByCategory(category);
  return plans.find(plan => plan.id === id);
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
