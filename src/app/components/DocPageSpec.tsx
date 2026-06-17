/** @internal — utility-tier component; not part of @hirobius/design-system public API. */
// @doc-exempt: doc-infrastructure — renders machine-readable JSON-LD on HDS doc pages. Not a design-system UI primitive.

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HdsSpecComponent {
  name: string;
  description: string;
  token?: string;
  tokens?: string[];
  variants?: string[];
  usage?: string;
}

export interface HdsSpecDecision {
  rule: string;
  rationale?: string;
}

export interface HdsSpecToken {
  path: string;
  role: string;
}

export interface PageSpec {
  page: string;
  path: string;
  category: string;
  summary: string;
  components?: HdsSpecComponent[];
  tokens?: HdsSpecToken[];
  decisions?: HdsSpecDecision[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DocPageSpec({ spec }: { spec: PageSpec }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    name: `Hirobius Design System — ${spec.page}`,
    description: spec.summary,
    url: `https://adrianmilsap.com${spec.path}`,
    isPartOf: {
      '@type': 'SoftwareApplication',
      name: 'Hirobius Design System',
      url: 'https://adrianmilsap.com/hds',
    },
    ...(spec.components && {
      hasPart: spec.components.map(c => ({
        '@type': 'DefinedTerm',
        name: c.name,
        description: c.description,
        ...(c.token  && { identifier: c.token }),
        ...(c.tokens && { additionalProperty: c.tokens.map(t => ({ '@type': 'PropertyValue', value: t })) }),
        ...(c.usage  && { usageInfo: c.usage }),
      })),
    }),
    ...(spec.decisions && {
      abstract: spec.decisions.map(d => d.rule).join(' | '),
    }),
    keywords: [
      spec.category,
      ...(spec.components?.map(c => c.name) ?? []),
      ...(spec.tokens?.map(t => t.path) ?? []),
    ].join(', '),
  };

  // JSON-LD always in DOM — readable by LLMs and structured-data crawlers
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /> // security-ok: JSON.stringify output — no user input, no raw HTML
  );
}
