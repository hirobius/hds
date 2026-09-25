'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

/**
 * nextra-theme-docs drives its own compiled Tailwind dark-mode utilities off
 * an html.dark CLASS (baked in at build time). @hirobius/design-system's
 * tokens.css drives dark mode off an html[data-theme="dark"] ATTRIBUTE.
 *
 * Passing `nextThemes={{ attribute: ['class', 'data-theme'] }}` to `<Layout>`
 * would ask next-themes to write both directly, but nextra-theme-docs 4.6.x's
 * `attribute` validator (a zod `z.custom` string check) throws a raw
 * `TypeError` when zod's `z.union` probes it with an array value instead of a
 * string, which aborts the whole static export. Rather than patch a
 * dependency, this bridges the two systems at runtime: next-themes owns the
 * `class`, and this component mirrors the resolved theme onto
 * `data-theme` so HDS's own dark tokens activate too.
 */
export function ThemeBridge() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!resolvedTheme) return;
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  return null;
}
