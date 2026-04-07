import { TEMPLATES } from '@/lib/templates';
import EditClient from './EditClient';

export function generateStaticParams() {
  return TEMPLATES.map((t) => ({ slug: t.slug }));
}

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function EditSitePage({ params }: Props) {
  const { slug } = await params;
  return <EditClient slug={slug} />;
}
