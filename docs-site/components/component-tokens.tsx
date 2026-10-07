import { tokenRow, type TokenRow } from '../lib/token-tables';
import { loadManifestSpecs, loadTokens } from '../lib/site-data';
import { TokenRows } from './token-table';

/** kebab slug -> manifest name, so the remark plugin only has to know the file name. */
function nameForSlug(slug: string): string | undefined {
  const specs = loadManifestSpecs();
  return Object.keys(specs).find(
    (n) => n.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase() === slug,
  );
}

/**
 * `{/* generated: tokens *\/}` marker target on a component page: the tokens the
 * manifest says this component uses (`tokenMapping`), with light and dark values
 * resolved from hirobius.tokens.json.
 */
export function ComponentTokens({ slug }: { slug: string }) {
  const name = nameForSlug(slug);
  const mapping = (name && loadManifestSpecs()[name]?.tokenMapping) || {};
  const tokens = loadTokens();
  const rows: TokenRow[] = [];
  for (const [role, path] of Object.entries(mapping)) {
    const row = tokenRow(tokens, path);
    if (row) rows.push({ ...row, description: role });
  }
  if (!rows.length) return <p>No component-specific tokens are documented for this component.</p>;
  return <TokenRows rows={rows} descriptionLabel="Role" />;
}
