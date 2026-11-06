/**
 * Build-time generators for the Accessibility foundation page (hds#1228).
 *
 * The rows come from the `@a11y` JSDoc contracts that `pnpm manifest:generate`
 * writes to `componentSpecs[].a11yRules` in public/hds-manifest.json, so the page
 * cannot drift from the code. Deprecated components are left out.
 */

export interface A11yRule {
  rule: string;
  required?: boolean;
  owner?: 'component' | 'consumer';
  testId?: string;
}

export interface A11ySpec {
  docsPage?: string;
  deprecated?: string;
  a11yRules?: A11yRule[];
}

export interface ConsumerItem {
  component: string;
  href: string | null;
  rules: { rule: string; required: boolean }[];
}

export interface ContractRow {
  component: string;
  href: string | null;
  /** Rules the component keeps (owner: component), each backed by a test or gate. */
  hds: number;
  /** Rules the consumer keeps (owner: consumer). */
  consumer: number;
  /** Rules with no stated owner (legacy tags; check-a11y-contracts E2 on interactive roots). */
  unassigned: number;
}

function documented(specs: Record<string, A11ySpec>): [string, A11ySpec, A11yRule[]][] {
  return Object.entries(specs)
    .filter(([, s]) => !s.deprecated && s.a11yRules?.length)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, s]) => [name, s, s.a11yRules!]);
}

/** Every consumer-owned rule, grouped one row per component, sorted by component. */
export function consumerChecklist(specs: Record<string, A11ySpec>): ConsumerItem[] {
  return documented(specs)
    .map(([component, s, rules]) => ({
      component,
      href: s.docsPage ?? null,
      rules: rules
        .filter((r) => r.owner === 'consumer')
        .map((r) => ({ rule: r.rule, required: r.required !== false })),
    }))
    .filter((item) => item.rules.length);
}

/** One row per component with a contract: how many rules each side keeps. */
export function contractIndex(specs: Record<string, A11ySpec>): ContractRow[] {
  return documented(specs).map(([component, s, rules]) => ({
    component,
    href: s.docsPage ?? null,
    hds: rules.filter((r) => r.owner === 'component').length,
    consumer: rules.filter((r) => r.owner === 'consumer').length,
    unassigned: rules.filter((r) => !r.owner).length,
  }));
}

export function contractTotals(specs: Record<string, A11ySpec>) {
  const rows = contractIndex(specs);
  const sum = (k: 'hds' | 'consumer' | 'unassigned') => rows.reduce((n, r) => n + r[k], 0);
  return {
    components: rows.length,
    hds: sum('hds'),
    consumer: sum('consumer'),
    unassigned: sum('unassigned'),
  };
}
