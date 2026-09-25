import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { Button } from '@hirobius/design-system';

import { ColorSwatchGrid } from './components/color-swatch-grid';
import { PropsTable } from './components/props-table';
import { TypeScaleRow } from './components/type-scale-row';

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Button,
    ColorSwatchGrid,
    PropsTable,
    TypeScaleRow,
    ...components,
  };
}
