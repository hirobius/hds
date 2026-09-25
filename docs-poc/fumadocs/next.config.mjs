import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Static export needs trailing slashes disabled to keep /docs/foo -> foo.html
  // resolution working under a plain static file server.
  trailingSlash: false,
  transpilePackages: ['@hirobius/design-system'],
  turbopack: {
    root: import.meta.dirname,
  },
};

export default withMDX(config);
