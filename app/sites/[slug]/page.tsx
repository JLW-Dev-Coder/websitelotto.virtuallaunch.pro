import type { Metadata } from 'next';
import { TEMPLATES, getCategoryLabel } from '@/lib/templates';
import SiteClient from './SiteClient';

export function generateStaticParams() {
  return TEMPLATES.map(t => ({ slug: t.slug }));
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = TEMPLATES.find(t => t.slug === slug);
  const title = entry?.title ?? slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const category = entry ? getCategoryLabel(entry.category) : 'business';

  return {
    title: `${title} — Professional Website Template | Website Lotto`,
    description: `Get a professionally designed ${category} website. ${title} is ready to launch — claim it via subscription, auction, or buy-now.`,
  };
}

export default async function SitePage({ params }: Props) {
  const { slug } = await params;
  return <SiteClient slug={slug} />;
}
