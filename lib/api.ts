import catalog from '@/wlvlp-catalog.json';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'https://api.virtuallaunch.pro';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export interface Session {
  account_id: string;
  email: string;
}

export interface Template {
  slug: string;
  title: string;
  category: string;
  description?: string;
  status: 'available' | 'auction' | 'sold';
  thumbnail_url?: string;
  vote_count: number;
  current_bid?: number;
  auction_ends_at?: string;
  price_monthly: number;
}

export interface Bid {
  account_id: string;
  amount: number;
  created_at: string;
}

export interface ScratchTicket {
  ticket_id: string;
  status: 'unscratched' | 'revealed';
  prize?: string;
  prize_code?: string;
}

export interface BuyerDashboard {
  account_id: string;
  template: Template;
  subscription_status: string;
  stripe_portal_url?: string;
  site_config: Record<string, string>;
  scratch_ticket?: ScratchTicket;
}

export function getSession(): Promise<Session> {
  return apiFetch('/v1/auth/session');
}

export function getTemplates(params?: Record<string, string>): Promise<Template[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch(`/v1/wlvlp/templates${qs}`);
}

interface CatalogSite {
  slug: string;
  title: string;
  categories: string[];
  status?: string;
  price?: number | null;
}

const CATEGORY_MAP: Record<string, Template['category']> = {
  'Tax and Finance': 'finance',
  'Legal': 'legal',
  'Food and Beverage': 'food/bev',
  'Sports and Fitness': 'health',
  'Services': 'services',
  'Beauty and Fashion': 'creative',
  'Entertainment': 'creative',
  'Real Estate and Home': 'services',
  'Tech and Digital': 'services',
  'Lifestyle and Hobby': 'other',
  'Travel and Adventure': 'other',
  'Uncategorized': 'other',
};

export function getTemplatesFromCatalog(): Template[] {
  const sites = (catalog as { sites: CatalogSite[] }).sites;
  return sites
    .filter(s => s.slug && s.slug !== 'index')
    .map(s => {
      const primary = s.categories?.[0] ?? 'Uncategorized';
      return {
        slug: s.slug,
        title: s.title,
        category: CATEGORY_MAP[primary] ?? 'other',
        status: (s.status as Template['status']) ?? 'available',
        vote_count: 0,
        price_monthly: 0,
      };
    });
}

export async function getTemplatesWithFallback(): Promise<Template[]> {
  try {
    const list = await getTemplates();
    if (Array.isArray(list) && list.length > 0) return list;
    return getTemplatesFromCatalog();
  } catch {
    return getTemplatesFromCatalog();
  }
}

export function getTemplate(slug: string): Promise<Template> {
  return apiFetch(`/v1/wlvlp/templates/${slug}`);
}

export function getTemplateBids(slug: string): Promise<Bid[]> {
  return apiFetch(`/v1/wlvlp/templates/${slug}/bids`);
}

export function voteTemplate(slug: string): Promise<{ vote_count: number }> {
  return apiFetch(`/v1/wlvlp/templates/${slug}/vote`, { method: 'POST' });
}

export function placeBid(slug: string, amount: number): Promise<{ ok: boolean }> {
  return apiFetch(`/v1/wlvlp/templates/${slug}/bid`, {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}

export interface CheckoutResponse {
  session_url?: string;
  url?: string;
}

export function createCheckout(
  slug: string,
  tier: 'standard' | 'premium',
  email?: string
): Promise<CheckoutResponse> {
  return apiFetch('/v1/wlvlp/checkout', {
    method: 'POST',
    body: JSON.stringify({ slug, tier, ...(email ? { email } : {}) }),
  });
}

export function createScratchTicket(): Promise<ScratchTicket> {
  return apiFetch('/v1/wlvlp/scratch', { method: 'POST' });
}

export function revealScratchTicket(ticket_id: string): Promise<ScratchTicket> {
  return apiFetch(`/v1/wlvlp/scratch/${ticket_id}/reveal`, { method: 'POST' });
}

export function getBuyerDashboard(account_id: string): Promise<BuyerDashboard> {
  return apiFetch(`/v1/wlvlp/buyer/${account_id}`);
}

export interface PurchasedSite {
  slug: string;
  title: string;
  category?: string;
  purchased_at: string;
  hosting_status: 'active' | 'expired' | 'pending';
  hosting_expires_at?: string;
  site_url: string;
}

export function getMySites(account_id: string): Promise<PurchasedSite[]> {
  return apiFetch(`/v1/wlvlp/sites/by-account/${account_id}`);
}

export function updateConfig(slug: string, config: Record<string, string>): Promise<{ ok: boolean }> {
  return apiFetch(`/v1/wlvlp/config/${slug}`, {
    method: 'PATCH',
    body: JSON.stringify(config),
  });
}

export async function uploadLogo(slug: string, file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append('logo', file);
  form.append('slug', slug);
  const res = await fetch(`${API_BASE}/v1/wlvlp/upload-logo`, {
    credentials: 'include',
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(`uploadLogo → ${res.status}`);
  return res.json();
}

export function logout(): Promise<{ ok: boolean }> {
  return apiFetch('/v1/auth/logout', { method: 'POST' });
}

export interface Affiliate {
  referral_code: string;
  connect_status: string;
  balance_pending: number;
  balance_paid: number;
  referral_url: string;
}

export interface AffiliateEvent {
  platform: string;
  gross_amount: number;
  commission_amount: number;
  status: 'pending' | 'paid';
  created_at: string;
}

export function getAffiliate(account_id: string): Promise<Affiliate> {
  return apiFetch(`/v1/affiliates/${account_id}`);
}

export function getAffiliateEvents(account_id: string): Promise<AffiliateEvent[]> {
  return apiFetch(`/v1/affiliates/${account_id}/events`);
}

export function startAffiliateOnboarding(): Promise<{ onboard_url: string }> {
  return apiFetch('/v1/affiliates/connect/onboard', { method: 'POST' });
}

export function requestPayout(amount: number): Promise<{ payout_id: string; amount: number; status: string }> {
  return apiFetch('/v1/affiliates/payout/request', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}
