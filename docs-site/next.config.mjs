import { resolve } from 'node:path';
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
  turbopack: {
    // Repo root, not docs-site/: the content source (../content/docs) and the
    // linked @hirobius/design-system (..) both live above this directory.
    root: resolve(import.meta.dirname, '..'),
  },
};

export default withMDX(config);
