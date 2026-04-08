import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  // trailingSlash:true makes Next.js emit each page as <route>/index.html
  // (e.g. out/asset/__shell__/index.html). This is required so Cloudflare
  // Pages can serve the SCALE asset shell page via the _redirects rewrite
  // /asset/* -> /asset/__shell__/ — without it, Next emits a flat
  // <route>.html file which Cloudflare 308-redirects, causing a rewrite loop.
  trailingSlash: true,
};

export default nextConfig;
