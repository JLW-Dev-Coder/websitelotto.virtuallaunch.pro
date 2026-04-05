import { MetadataRoute } from 'next';
import { TEMPLATES } from '@/lib/templates';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://websitelotto.virtuallaunch.pro';

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date() },
    { url: `${base}/scratch`, lastModified: new Date() },
    { url: `${base}/affiliate`, lastModified: new Date() },
    { url: `${base}/sign-in`, lastModified: new Date() },
    { url: `${base}/support`, lastModified: new Date() },
  ];

  const templatePages: MetadataRoute.Sitemap = TEMPLATES.map(t => ({
    url: `${base}/sites/${t.slug}`,
    lastModified: new Date(),
  }));

  return [...staticPages, ...templatePages];
}
