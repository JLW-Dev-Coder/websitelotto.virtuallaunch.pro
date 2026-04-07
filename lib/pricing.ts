import catalog from '@/wlvlp-catalog.json';

export type Tier = 'premium' | 'standard';

export const PREMIUM_CATEGORIES = [
  'Tax and Finance',
  'Legal',
  'Services',
  'Real Estate and Home',
  'Tech and Digital',
] as const;

interface CatalogSite {
  slug: string;
  title: string;
  categories: string[];
}

const SITES: CatalogSite[] = (catalog as { sites: CatalogSite[] }).sites;

const SLUG_TO_CATEGORIES: Record<string, string[]> = SITES.reduce(
  (acc, s) => {
    acc[s.slug] = s.categories ?? [];
    return acc;
  },
  {} as Record<string, string[]>
);

export function getTier(categories: string[] | undefined): Tier {
  if (!categories) return 'standard';
  return categories.some(c => (PREMIUM_CATEGORIES as readonly string[]).includes(c))
    ? 'premium'
    : 'standard';
}

export function getPrice(tier: Tier): number {
  return tier === 'premium' ? 399 : 249;
}

export function getTierForSlug(slug: string): Tier {
  return getTier(SLUG_TO_CATEGORIES[slug]);
}

export function getPriceForSlug(slug: string): number {
  return getPrice(getTierForSlug(slug));
}
