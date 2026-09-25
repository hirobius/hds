import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs';
import type { MDXComponents } from 'nextra/mdx-components';

const docsComponents = getDocsMDXComponents();

export function useMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...docsComponents,
    ...components,
  };
}
