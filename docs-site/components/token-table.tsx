import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildTokenSections } from '../lib/token-tables';

// Read once per build process. The docs app runs from docs-site/, tokens live at the repo root.
let cached: unknown;
function loadTokens(): unknown {
  cached ??= JSON.parse(readFileSync(resolve(process.cwd(), '../hirobius.tokens.json'), 'utf8'));
  return cached;
}

/**
 * Server component: renders the token tables for a docs page. Generated from
 * hirobius.tokens.json at build time, so docs can never drift from the tokens.
 * Colour swatches paint with the live CSS variable, so they follow the theme.
 */
export function TokenTable({ page }: { page: string }) {
  const sections = buildTokenSections(loadTokens(), page);
  return (
    <div className="hds-token-tables">
      {sections.map((section) => (
        <section key={section.title}>
          <h3>{section.title}</h3>
          <div className="hds-token-table-scroll">
            <table className="hds-token-table">
              <thead>
                <tr>
                  <th scope="col">Token</th>
                  <th scope="col">Value (light)</th>
                  <th scope="col">Description</th>
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row) => (
                  <tr key={row.token}>
                    <td>
                      <code>{row.cssVar ?? row.token}</code>
                    </td>
                    <td>
                      <span className="hds-token-value">
                        {row.swatch && row.cssVar ? (
                          <span
                            className="hds-token-swatch"
                            style={{ background: `var(${row.cssVar})` }}
                            aria-hidden="true"
                          />
                        ) : null}
                        <code>{row.value}</code>
                      </span>
                    </td>
                    <td>{row.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
