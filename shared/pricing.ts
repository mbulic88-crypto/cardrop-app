export type SubscriptionType = 'standard' | 'silver' | 'gold';

export type CategoryType = 'private' | 'company' | 'truck_stop' | 'residential' | 'car_lot';

export interface PlanBenefit {
  sr: string;
  en: string;
}

export interface PricingPlan {
  id: SubscriptionType;
  name: string;
  nameEn: string;
  price: number;
  activeDays: number;
  totalVisibilityDays: number;
  maxPhotos: number;
  benefits: PlanBenefit[];
  tier: 'standard' | 'silver' | 'gold';
  badgeSr?: string;
  badgeEn?: string;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'standard',
    name: 'Standard',
    nameEn: 'Standard',
    price: 0,
    activeDays: 60,
    totalVisibilityDays: 60,
    maxPhotos: 2,
    tier: 'standard',
    benefits: [
      { sr: '1 aktivno parking mesto', en: '1 active parking spot' },
      { sr: 'Do 2 fotografije', en: 'Up to 2 photos' },
      { sr: 'Prikaz na mapi', en: 'Shown on map' },
      { sr: 'Kontakt informacije', en: 'Contact information' },
      { sr: 'Trajno aktivno', en: 'Permanently active' },
    ],
  },
  {
    id: 'silver',
    name: 'Silver',
    nameEn: 'Silver',
    price: 800,
    activeDays: 30,
    totalVisibilityDays: 60,
    maxPhotos: 3,
    tier: 'silver',
    badgeSr: 'Istaknuto',
    badgeEn: 'Featured',
    benefits: [
      { sr: '1 aktivno parking mesto', en: '1 active parking spot' },
      { sr: 'Do 3 fotografije', en: 'Up to 3 photos' },
      { sr: 'Srebrno označen pin na mapi', en: 'Silver map pin' },
      { sr: 'Oznaku „Istaknuto"', en: '"Featured" badge' },
      { sr: 'Bolja vidljivost u odnosu na Standard', en: 'Better visibility than Standard' },
      { sr: 'Prikaz iznad Standard oglasa u pretrazi', en: 'Shown above Standard listings' },
      { sr: 'Trajno aktivno', en: 'Permanently active' },
    ],
  },
  {
    id: 'gold',
    name: 'Gold',
    nameEn: 'Gold',
    price: 1200,
    activeDays: 30,
    totalVisibilityDays: 60,
    maxPhotos: 5,
    tier: 'gold',
    badgeSr: 'Top lokacija',
    badgeEn: 'Top location',
    benefits: [
      { sr: '1 aktivno parking mesto', en: '1 active parking spot' },
      { sr: 'Do 5 fotografija', en: 'Up to 5 photos' },
      { sr: 'Zlatno označen pin na mapi', en: 'Gold map pin' },
      { sr: 'Oznaku „Top lokacija"', en: '"Top location" badge' },
      { sr: 'Najvišu poziciju u pretrazi (iznad Silver i Standard)', en: 'Highest search position (above Silver and Standard)' },
      { sr: 'Reklamiranje na društvenim mrežama i u email kampanjama', en: 'Social media and email campaign promotion' },
      { sr: 'Trajno aktivno', en: 'Permanently active' },
    ],
  },
];

export function getPlanById(id: SubscriptionType): PricingPlan | undefined {
  return PRICING_PLANS.find(plan => plan.id === id);
}

export function getPlansByCategory(_category: CategoryType): PricingPlan[] {
  return PRICING_PLANS;
}

export function calculateExpiryDate(_planId: SubscriptionType, _startDate: Date = new Date()): Date | null {
  return null;
}

export function getMaxPhotos(planId: SubscriptionType): number {
  const plan = getPlanById(planId);
  if (!plan) return 2;
  return plan.maxPhotos;
}

export function getStripeAmount(planId: SubscriptionType): number {
  const plan = getPlanById(planId);
  if (!plan) throw new Error(`Invalid plan ID: ${planId}`);
  return plan.price * 100;
}

export function getSortPriority(planId: SubscriptionType): number {
  switch (planId) {
    case 'gold': return 3;
    case 'silver': return 2;
    case 'standard': return 1;
    default: return 0;
  }
}
