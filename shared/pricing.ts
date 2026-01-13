// Pricing plans for parking spot listings

export type SubscriptionType = 'free' | 'premium_monthly' | 'premium_half_yearly' | 'premium_yearly' | 'company_basic' | 'company_premium' | 'company_basic_half_yearly' | 'company_premium_half_yearly';

export type CategoryType = 'private' | 'company' | 'truck_stop' | 'residential' | 'car_lot';

export interface PricingPlan {
  id: SubscriptionType;
  name: string;
  nameEn: string;
  duration: number; // in days
  price: number; // in RSD
  pricePerMonth: number; // calculated for comparison
  savings: number; // percentage savings compared to monthly
  popular?: boolean;
  isFree?: boolean;
  isPremium: boolean; // whether this is a premium plan
  category: 'private' | 'company'; // which category this plan applies to
  description?: string;
  descriptionEn?: string;
  maxSpots?: number; // for company plans
  maxPhotosPerSpot?: number; // for company plans
}

// Premium benefits (shown in UI)
export const PREMIUM_BENEFITS = {
  sr: [
    'Zlatan okvir na mapi i u listi',
    'Parking prikazan na vrhu liste',
    'Veća vidljivost i više pregleda',
  ],
  en: [
    'Golden border on map and list',
    'Parking shown at top of list',
    'More visibility and views',
  ],
};

// Private/Individual pricing plans
export const PRIVATE_PRICING_PLANS: PricingPlan[] = [
  // Basic plans
  {
    id: 'free',
    name: 'Besplatno',
    nameEn: 'Free',
    duration: -1, // unlimited
    price: 0,
    pricePerMonth: 0,
    savings: 0,
    isFree: true,
    isPremium: false,
    category: 'private',
    description: 'Osnovna postavka parkinga',
    descriptionEn: 'Basic parking listing',
  },
  // Premium plans
  {
    id: 'premium_monthly',
    name: 'Premium 1 Mesec',
    nameEn: 'Premium 1 Month',
    duration: 30,
    price: 1000,
    pricePerMonth: 1000,
    savings: 0,
    isPremium: true,
    category: 'private',
  },
  {
    id: 'premium_half_yearly',
    name: 'Premium 6 Meseci',
    nameEn: 'Premium 6 Months',
    duration: 180,
    price: 5000,
    pricePerMonth: 833.33,
    savings: 17,
    popular: true,
    isPremium: true,
    category: 'private',
  },
  {
    id: 'premium_yearly',
    name: 'Premium 12 Meseci',
    nameEn: 'Premium 12 Months',
    duration: 365,
    price: 9000,
    pricePerMonth: 750,
    savings: 25,
    isPremium: true,
    category: 'private',
  },
];

// Company pricing plans
export const COMPANY_PRICING_PLANS: PricingPlan[] = [
  // Basic plans
  {
    id: 'company_basic',
    name: 'Osnovni Mesečno',
    nameEn: 'Basic Monthly',
    duration: 30,
    price: 3000,
    pricePerMonth: 3000,
    savings: 0,
    isPremium: false,
    category: 'company',
    description: 'Do 5 parking mesta, 3 slike po mestu',
    descriptionEn: 'Up to 5 parking spots, 3 photos per spot',
    maxSpots: 5,
    maxPhotosPerSpot: 3,
  },
  {
    id: 'company_basic_half_yearly',
    name: 'Osnovni 6 Meseci',
    nameEn: 'Basic 6 Months',
    duration: 180,
    price: 15000,
    pricePerMonth: 2500,
    savings: 17,
    isPremium: false,
    category: 'company',
    description: 'Do 5 parking mesta, 3 slike po mestu',
    descriptionEn: 'Up to 5 parking spots, 3 photos per spot',
    maxSpots: 5,
    maxPhotosPerSpot: 3,
  },
  // Premium plans
  {
    id: 'company_premium',
    name: 'Premium Mesečno',
    nameEn: 'Premium Monthly',
    duration: 30,
    price: 6000,
    pricePerMonth: 6000,
    savings: 0,
    popular: true,
    isPremium: true,
    category: 'company',
    description: 'Neograničen broj mesta i slika',
    descriptionEn: 'Unlimited spots and photos',
    maxSpots: -1,
    maxPhotosPerSpot: -1,
  },
  {
    id: 'company_premium_half_yearly',
    name: 'Premium 6 Meseci',
    nameEn: 'Premium 6 Months',
    duration: 180,
    price: 30000,
    pricePerMonth: 5000,
    savings: 17,
    isPremium: true,
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

export function calculateExpiryDate(planId: SubscriptionType, startDate: Date = new Date()): Date | null {
  const plan = getPlanById(planId);
  if (!plan) throw new Error(`Invalid plan ID: ${planId}`);
  
  // Free plans have no expiry
  if (plan.duration === -1) {
    return null;
  }
  
  const expiryDate = new Date(startDate);
  expiryDate.setDate(expiryDate.getDate() + plan.duration);
  return expiryDate;
}

// Helper to get basic and premium plans separately
export function getBasicPlans(category: CategoryType): PricingPlan[] {
  return getPlansByCategory(category).filter(p => !p.isPremium);
}

export function getPremiumPlans(category: CategoryType): PricingPlan[] {
  return getPlansByCategory(category).filter(p => p.isPremium);
}

// Stripe amount in smallest currency unit (para for RSD)
export function getStripeAmount(planId: SubscriptionType): number {
  const plan = getPlanById(planId);
  if (!plan) throw new Error(`Invalid plan ID: ${planId}`);
  
  // Convert RSD to para (1 RSD = 100 para)
  return plan.price * 100;
}
