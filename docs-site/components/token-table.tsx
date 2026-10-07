import { buildTokenSections, type TokenRow } from '../lib/token-tables';
import { loadTokens } from '../lib/site-data';

function Value({ value, swatch }: { value: string; swatch: boolean }) {
  return (
    <span className="hds-token-value">
      {swatch ? (
        <span className="hds-token-swatch" style={{ background: value }} aria-hidden="true" />
      ) : null}
      <code>{value}</code>
    </span>
  );
}

/** The shared table: token, light value, dark value, description. */
export function TokenRows({
  rows,
  descriptionLabel = 'Description',
}: {
  rows: TokenRow[];
  descriptionLabel?: string;
}) {
  return (
    <div className="hds-token-table-scroll">
      <table className="hds-token-table">
        <thead>
          <tr>
            <th scope="col">Token</th>
            <th scope="col">Light</th>
            <th scope="col">Dark</th>
            <th scope="col">{descriptionLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.token}>
              <td>
                <code>{row.cssVar ?? row.token}</code>
              </td>
              <td>
                <Value value={row.value} swatch={row.swatch} />
              </td>
              <td>
                {/* A token with no Dark mode is the same in both themes. */}
                {row.darkValue === null ? (
                  <span className="hds-token-same">Same as light</span>
                ) : (
                  <Value value={row.darkValue} swatch={row.swatch} />
                )}
              </td>
              <td>{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Server component: renders the token tables for a docs page. Generated from
 * hirobius.tokens.json at build time, so docs can never drift from the tokens.
 */
export function TokenTable({ page }: { page: string }) {
  const sections = buildTokenSections(loadTokens(), page);
  return (
    <div className="hds-token-tables">
      {sections.map((section) => (
        <section key={section.title}>
          <h3>{section.title}</h3>
          <TokenRows rows={section.rows} />
        </section>
      ))}
    </div>
  );
}
