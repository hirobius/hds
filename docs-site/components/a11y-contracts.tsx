import { consumerChecklist, contractIndex, contractTotals } from '../lib/a11y-contracts';
import { loadManifestSpecs, loadStats, loadTokens } from '../lib/site-data';
import { tokenRow } from '../lib/token-tables';

/**
 * Tables for the Accessibility foundation page (hds#1228), read from the manifest's
 * `a11yRules`, the tokens and public/hds-stats.json when the site builds, so the
 * page lists exactly what the code and the gates hold.
 */

function ComponentName({ name, href }: { name: string; href: string | null }) {
  return href ? <a href={href}>{name}</a> : <>{name}</>;
}

export function A11yGuarantees() {
  const tokens = loadTokens();
  const target = tokenRow(tokens, 'semantic.size.touchTarget');
  const compact = tokenRow(tokens, 'primitive.size.interactive.minCompact');
  const { contrast } = loadStats();
  const totals = contractTotals(loadManifestSpecs());
  return (
    <div className="hds-docs-table">
      <table>
        <thead>
          <tr>
            <th>Guarantee</th>
            <th>What HDS holds</th>
            <th>Proven by</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Target size</td>
            <td>
              Every control is at least <code>{compact?.value}</code> (WCAG 2.5.8). Small controls
              lift to <code>{target?.value}</code> (<code>semantic.size.touchTarget</code>) on a
              coarse pointer or a viewport under 640px.
            </td>
            <td>
              <code>check:docs-touch-targets</code>
            </td>
          </tr>
          <tr>
            <td>Contrast</td>
            <td>
              {contrast.textPairs} text and surface pairs meet 4.5:1 in light and dark;{' '}
              {contrast.nonTextPairs} control-boundary pair meets 3:1.
            </td>
            <td>
              <code>check:contrast</code>
            </td>
          </tr>
          <tr>
            <td>Component contracts</td>
            <td>
              {totals.hds} rules on {totals.components} components, each with a named test or gate.
            </td>
            <td>
              <code>check:a11y-contracts</code>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function A11yConsumerChecklist() {
  const items = consumerChecklist(loadManifestSpecs());
  return (
    <div className="hds-docs-table">
      <table>
        <thead>
          <tr>
            <th>Component</th>
            <th>What you must do</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.component}>
              <td>
                <ComponentName name={item.component} href={item.href} />
              </td>
              <td>
                <ul>
                  {item.rules.map((r) => (
                    <li key={r.rule}>
                      {r.rule}
                      {r.required ? null : ' (recommended)'}
                    </li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function A11yContractIndex() {
  const rows = contractIndex(loadManifestSpecs());
  return (
    <div className="hds-docs-table">
      <table>
        <thead>
          <tr>
            <th>Component</th>
            <th>HDS keeps</th>
            <th>You keep</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.component}>
              <td>
                <ComponentName name={r.component} href={r.href} />
              </td>
              <td>{r.hds}</td>
              <td>{r.consumer + r.unassigned}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
