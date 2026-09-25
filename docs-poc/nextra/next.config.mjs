import { fileURLToPath } from 'url';
import path from 'path';
import nextra from 'nextra';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withNextra = nextra({
  defaultShowCopyCode: true,
});

export default withNextra({
  output: 'export',
  images: { unoptimized: true },
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: false },
  // The repo root (one level up, containing pnpm-lock.yaml) is the real
  // workspace boundary: @hirobius/design-system is depended on via
  // `file:../..`, which node_modules symlinks back out to that root, so
  // Turbopack needs it in scope to follow the symlink.
  turbopack: { root: path.resolve(__dirname, '../..') },
});
