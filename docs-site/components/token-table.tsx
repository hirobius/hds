import { buildTokenSections, type TokenRow } from '../lib/token-tables';
import { loadTokens } from '../lib/site-data';
import { FoundationVisual } from './foundation-visuals';

/**
 * A raw value (hex, px) is code; a composite's summary ("150 ms · ease-out") is prose in
 * the UI font, with its raw part (the curve) under it as code. Mono is for code only.
 */
function Value({
  value,
  fill,
  literal = true,
  detail,
}: {
  value: string;
  fill: string | null;
  literal?: boolean;
  detail?: string | null;
}) {
  if (!literal) {
    return (
      <span className="hds-token-composite">
        <span className="hds-token-text">{value}</span>
        {detail ? <code className="hds-token-detail">{detail}</code> : null}
      </span>
    );
  }
  return (
    <span className="hds-token-value">
      {fill ? (
        <span className="hds-token-swatch" style={{ background: fill }} aria-hidden="true" />
      ) : null}
      <code>{value}</code>
    </span>
  );
}

/**
 * The shared table: token, light value, dark value, description. A column that
 * would say nothing (no token differs in dark, no token has a description) is
 * left out rather than filled with blanks; a token with no Dark mode shows its one
 * value in the Dark column too.
 */
export function TokenRows({
  rows,
  descriptionLabel = 'Description',
}: {
  rows: TokenRow[];
  descriptionLabel?: string;
}) {
  const hasDark = rows.some((r) => r.darkValue !== null && r.darkValue !== r.value);
  const hasDescription = rows.some((r) => r.description);
  const valueLabel = hasDark ? 'Light' : 'Value';
  // data-label names each cell's column: below sm the rows stack and print it (globals.css).
  return (
    <div className="hds-token-table-scroll">
      <table className="hds-token-table">
        <thead>
          <tr>
            <th scope="col">Token</th>
            <th scope="col">{valueLabel}</th>
            {hasDark ? <th scope="col">Dark</th> : null}
            {hasDescription ? <th scope="col">{descriptionLabel}</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.token}>
              <td data-label="Token">
                <code>{row.cssVar ?? row.token}</code>
              </td>
              <td data-label={valueLabel}>
                <Value
                  value={row.value}
                  fill={row.swatch ? row.fill : null}
                  literal={row.literal}
                  detail={row.detail}
                />
              </td>
              {hasDark ? (
                <td data-label="Dark">
                  {/* A token with no Dark mode has the same value in both themes: show it. */}
                  <Value
                    value={row.darkValue ?? row.value}
                    fill={row.swatch ? (row.darkFill ?? row.fill) : null}
                    literal={row.literal}
                    detail={row.darkValue === null ? row.detail : row.darkDetail}
                  />
                </td>
              ) : null}
              {hasDescription ? <td data-label={descriptionLabel}>{row.description}</td> : null}
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
  // The visual gallery leads; each table group folds under it, so the full
  // reference is one click away (and still in the page for search).
  return (
    <div className="hds-token-tables">
      <FoundationVisual page={page} />
      {sections.map((section) => (
        <details key={section.title} className="hds-fold">
          <summary>
            {section.title} · {section.rows.length} {section.rows.length === 1 ? 'token' : 'tokens'}
          </summary>
          <TokenRows rows={section.rows} />
        </details>
      ))}
    </div>
  );
}
