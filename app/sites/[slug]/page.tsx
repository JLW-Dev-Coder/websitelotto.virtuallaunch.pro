import SiteClient from './SiteClient';

export function generateStaticParams() {
  return [];
}

export const dynamicParams = true;

export default function SitePage() {
  return <SiteClient />;
}
