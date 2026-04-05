export interface TemplateEntry {
  slug: string;
  title: string;
  category: string;
}

export const TEMPLATES: TemplateEntry[] = [
  { slug: 'adhd-tips', title: 'Adhd Tips', category: 'health' },
  { slug: 'alien-worlds', title: 'Alien Worlds', category: 'other' },
  { slug: 'anime-vibes', title: 'Anime Vibes', category: 'creative' },
  { slug: 'architecture-that-smooth', title: 'Architecture That Smooth', category: 'other' },
  { slug: 'baby-tiny-wins', title: 'Baby Tiny Wins', category: 'health' },
  { slug: 'ballet-moves', title: 'Ballet Moves', category: 'creative' },
  { slug: 'balloons-are-us', title: 'Balloons Are Us', category: 'other' },
  { slug: 'barber-shop-luxury', title: 'Barber Shop Luxury', category: 'services' },
  { slug: 'barbers-cut', title: 'Barbers Cut', category: 'services' },
  { slug: 'beach-glow', title: 'Beach Glow', category: 'other' },
  { slug: 'bear-country', title: 'Bear Country', category: 'other' },
  { slug: 'bee-stitch', title: 'Bee Stitch', category: 'health' },
  { slug: 'brand-mood', title: 'Brand Mood', category: 'other' },
  { slug: 'calendars-unite', title: 'Calendars Unite', category: 'other' },
  { slug: 'candle-light-the-mood', title: 'Candle Light The Mood', category: 'food/bev' },
  { slug: 'canvas-current', title: 'Canvas Current', category: 'other' },
  { slug: 'card-decks', title: 'Card Decks', category: 'other' },
  { slug: 'carpet-palace', title: 'Carpet Palace', category: 'services' },
  { slug: 'cars-beyond', title: 'Cars Beyond', category: 'other' },
  { slug: 'casino-time', title: 'Casino Time', category: 'finance' },
  { slug: 'celebrities-around', title: 'Celebrities Around', category: 'other' },
  { slug: 'ceramic-factory', title: 'Ceramic Factory', category: 'other' },
  { slug: 'christmas-home-glow', title: 'Christmas Home Glow', category: 'other' },
  { slug: 'cinema-rush', title: 'Cinema Rush', category: 'creative' },
  { slug: 'cinematic-caves', title: 'Cinematic Caves', category: 'creative' },
  { slug: 'circus-is-here', title: 'Circus Is Here', category: 'creative' },
  { slug: 'clean-sweep', title: 'Clean Sweep', category: 'services' },
  { slug: 'coffee-please', title: 'Coffee Please', category: 'food/bev' },
  { slug: 'comedy-clubs-open', title: 'Comedy Clubs Open', category: 'other' },
  { slug: 'construction-junction', title: 'Construction Junction', category: 'services' },
  { slug: 'cornhole-fun', title: 'Cornhole Fun', category: 'other' },
  { slug: 'cosmetic-glam-vibe', title: 'Cosmetic Glam Vibe', category: 'other' },
  { slug: 'cosmic-visuals', title: 'Cosmic Visuals', category: 'other' },
  { slug: 'criminal-attorney', title: 'Criminal Attorney', category: 'legal' },
  { slug: 'daily-prompts', title: 'Daily Prompts', category: 'other' },
  { slug: 'deep-sea-diving', title: 'Deep Sea Diving', category: 'other' },
  { slug: 'demolition-services', title: 'Demolition Services', category: 'services' },
  { slug: 'dental-office-with-glow', title: 'Dental Office With Glow', category: 'health' },
  { slug: 'dessert-ebook', title: 'Dessert Ebook', category: 'food/bev' },
  { slug: 'digital-art-vault', title: 'Digital Art Vault', category: 'creative' },
  { slug: 'digital-product-experience', title: 'Digital Product Experience', category: 'creative' },
  { slug: 'digital-product-experience-v2', title: 'Digital Product Experience V2', category: 'creative' },
  { slug: 'digital-stickers', title: 'Digital Stickers', category: 'creative' },
  { slug: 'dog-memorial-ecards', title: 'Dog Memorial Ecards', category: 'other' },
  { slug: 'dogs-who-are-calm', title: 'Dogs Who Are Calm', category: 'health' },
  { slug: 'doll-house', title: 'Doll House', category: 'other' },
  { slug: 'elegant-french-restraurant', title: 'Elegant French Restraurant', category: 'other' },
  { slug: 'event-posters', title: 'Event Posters', category: 'other' },
];

const CATEGORY_LABELS: Record<string, string> = {
  health: 'health & wellness',
  finance: 'finance',
  legal: 'legal',
  'food/bev': 'food & beverage',
  creative: 'creative',
  services: 'services',
  other: 'business',
};

export function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? 'business';
}
