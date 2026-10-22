export type PlanId = 'free' | 'plus' | 'pro';

export type Plan = {
  id: PlanId;
  name: string;
  priceLabel: string;
  priceCents: number;
  compressPerDay: number;
  aiPerDay: number;
  ads: boolean;
  blurb: string;
  features: string[];
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    priceLabel: '$0',
    priceCents: 0,
    compressPerDay: 500,
    aiPerDay: 50,
    ads: true,
    blurb: 'Generous daily use with ads. Images still process on your device.',
    features: ['500 compressions / day', '50 AI drafts / day', 'JPG, PNG, WebP, resize', 'Community support'],
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    priceLabel: '$2.99/mo',
    priceCents: 299,
    compressPerDay: 5_000,
    aiPerDay: 300,
    ads: false,
    blurb: 'No ads and a larger AI allowance for regular publishers.',
    features: ['5,000 compressions / day', '300 AI drafts / day', 'No ads', 'Priority AI quota'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceLabel: '$5.99/mo',
    priceCents: 599,
    compressPerDay: 50_000,
    aiPerDay: 2_000,
    ads: false,
    blurb: 'Cheap studio plan for teams that compress in bulk.',
    features: ['50,000 compressions / day', '2,000 AI drafts / day', 'No ads', 'Highest daily AI cap'],
  },
};

export function planOf(id: string | undefined | null): Plan {
  if (id === 'plus' || id === 'pro') return PLANS[id];
  return PLANS.free;
}
