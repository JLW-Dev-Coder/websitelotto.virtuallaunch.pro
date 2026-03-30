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

export function createCheckout(slug: string, type: 'buy_now'): Promise<{ url: string }> {
  return apiFetch('/v1/wlvlp/checkout', {
    method: 'POST',
    body: JSON.stringify({ slug, type }),
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
