import AssetClient from './AssetClient';

// With `output: 'export'`, dynamic segments require generateStaticParams.
// Asset pages are generated at runtime from R2 with arbitrary prospect slugs,
// so we build a single placeholder shell and Cloudflare Pages rewrites
// `/asset/*` -> `/asset/__shell__/` (see public/_redirects). The client
// reads the real slug from `window.location.pathname`.
export function generateStaticParams() {
  return [{ slug: '__shell__' }];
}

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function AssetPage({ params }: Props) {
  const { slug } = await params;
  return <AssetClient initialSlug={slug} />;
}
