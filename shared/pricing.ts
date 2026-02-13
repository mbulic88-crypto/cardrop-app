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
  stripePriceId?: string;
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
      { sr: 'Vidljivost 60 dana', en: '60 days visibility' },
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
    stripePriceId: '',
    badgeSr: 'Istaknuto',
    badgeEn: 'Featured',
    benefits: [
      { sr: '1 aktivno parking mesto', en: '1 active parking spot' },
      { sr: 'Do 3 fotografije', en: 'Up to 3 photos' },
      { sr: 'Srebrno označen pin na mapi', en: 'Silver map pin' },
      { sr: 'Oznaku „Istaknuto"', en: '"Featured" badge' },
      { sr: 'Bolja vidljivost u odnosu na Standard', en: 'Better visibility than Standard' },
      { sr: 'Prikaz iznad Standard oglasa u pretrazi', en: 'Shown above Standard listings' },
      { sr: 'Ukupno 60 dana vidljivosti (30 dana Silver + 30 dana Standard)', en: '60 days total (30 days Silver + 30 days Standard)' },
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
    stripePriceId: '',
    badgeSr: 'Top lokacija',
    badgeEn: 'Top location',
    benefits: [
      { sr: '1 aktivno parking mesto', en: '1 active parking spot' },
      { sr: 'Do 5 fotografija', en: 'Up to 5 photos' },
      { sr: 'Zlatno označen pin na mapi', en: 'Gold map pin' },
      { sr: 'Oznaku „Top lokacija"', en: '"Top location" badge' },
      { sr: 'Najvišu poziciju u pretrazi (iznad Silver i Standard)', en: 'Highest search position (above Silver and Standard)' },
      { sr: 'Reklamiranje na društvenim mrežama i u email kampanjama', en: 'Social media and email campaign promotion' },
      { sr: 'Ukupno 60 dana vidljivosti (30 dana Gold + 30 dana Standard)', en: '60 days total (30 days Gold + 30 days Standard)' },
    ],
  },
];

export function getPlanById(id: SubscriptionType): PricingPlan | undefined {
  return PRICING_PLANS.find(plan => plan.id === id);
}

export function getPlansByCategory(_category: CategoryType): PricingPlan[] {
  return PRICING_PLANS;
}

export function calculateExpiryDate(planId: SubscriptionType, startDate: Date = new Date()): Date | null {
  const plan = getPlanById(planId);
  if (!plan) throw new Error(`Invalid plan ID: ${planId}`);

  const expiryDate = new Date(startDate);
  expiryDate.setDate(expiryDate.getDate() + plan.totalVisibilityDays);
  return expiryDate;
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
