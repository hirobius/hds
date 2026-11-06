import { caseStudyFacts } from '../lib/case-study';
import { loadCaseStudySources } from '../lib/site-data';

/**
 * The results table on the case study page (hds#1148). Every number is read from the
 * repo when the site builds (lib/case-study.ts), so the page cannot claim more than
 * the code holds.
 */
export function CaseStudyFacts() {
  const f = caseStudyFacts(loadCaseStudySources());
  const rows: [string, string, string][] = [
    [
      'Components',
      `${f.coreComponents} core components, ${f.patterns} patterns`,
      'The public package',
    ],
    [
      'Design tokens',
      `${f.tokens} tokens in one source file`,
      'Every color, size, space, radius and motion value',
    ],
    [
      'Quality gates',
      `${f.gates} registered checks; ${f.hookGates} run on every commit or push`,
      'Each one names where it fires',
    ],
    [
      'Decisions',
      `${f.decisions} written decision records`,
      'Each one records the context and the choice',
    ],
    ['Releases', `${f.releases} versions to ${f.version}`, 'With a changelog entry per version'],
    [
      'Consumers',
      `${f.productApps} product apps on the components; ${f.tokenSites} sites on the tokens only`,
      'The owner’s own work',
    ],
  ];
  return (
    <div className="hds-docs-table">
      <table>
        <thead>
          <tr>
            <th>Measure</th>
            <th>Today</th>
            <th>What it covers</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([measure, today, covers]) => (
            <tr key={measure}>
              <td>{measure}</td>
              <td>{today}</td>
              <td>{covers}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
