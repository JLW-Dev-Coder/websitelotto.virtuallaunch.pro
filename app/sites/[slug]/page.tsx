import SiteClient from './SiteClient';

export function generateStaticParams() {
  return [{ slug: '__placeholder__' }];
}

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function SitePage({ params }: Props) {
  const { slug } = await params;
  return <SiteClient slug={slug} />;
}
