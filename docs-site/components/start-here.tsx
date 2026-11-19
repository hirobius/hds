import { startHereStats, tokenFlow } from '../lib/start-here';
import { loadStats, loadTokenFlowSources } from '../lib/site-data';

/** The token the Start here page follows. Its value, CSS lines, component and Figma name are read from the repo. */
const EXAMPLE_TOKEN = 'semantic.accent.hover';

/**
 * One token, end to end, as an ordered list of steps on a rail (no cards). Every value and file
 * name is read from the repo when the site builds (lib/start-here.ts), and the build fails if
 * the token stops flowing: the page cannot describe a pipeline the code no longer has.
 */
export function StartHereFlow() {
  const f = tokenFlow(loadTokenFlowSources(), EXAMPLE_TOKEN);
  const steps: { title: string; where: string; lines: string[]; body: string }[] = [
    {
      title: 'The source',
      where: 'hirobius.tokens.json',
      lines: [`${f.path}`, `Light  ${f.light}`, `Dark   ${f.dark}`],
      body: 'The one file that holds every value. The token points at a color in the palette, one for light and one for dark. Nothing else in the repo is edited by hand to change it.',
    },
    {
      title: 'The CSS',
      where: 'src/styles/tokens.generated.css',
      lines: [f.cssLight, f.cssDark],
      body: 'A build step (pnpm tokens) turns the source into CSS variables, one set per theme. A check fails if the generated file and the source disagree.',
    },
    {
      title: 'The React code',
      where: `src/app/components/${f.reactFile}`,
      lines: [`bg-[var(${f.cssVar})]`],
      body: 'A component asks for the variable and never holds a color of its own. Switch the theme or the brand and the component changes with no edit.',
    },
    {
      title: 'Figma',
      where: 'figma/model.json, figma/snapshot.json',
      lines: [f.figma],
      body: 'Sync runs one way, from code to Figma. pnpm figma:model builds a model of the variables from the source. A person applies it to the Figma library with the Sync plugin. pnpm figma:snapshot --ingest then records what the file holds, and pnpm check:figma-drift compares the model with that record. A hand edit in Figma shows up as drift, not as a change to the source.',
    },
  ];
  return (
    <ol className="hds-start-flow not-prose">
      {steps.map((s, i) => (
        <li key={s.title} className="hds-start-step">
          <p className="hds-start-step-title">
            <span className="hds-start-step-number">{i + 1}</span>
            {s.title}
          </p>
          <p className="hds-start-step-where">
            <code>{s.where}</code>
          </p>
          <pre className="hds-start-step-code">
            <code>{s.lines.join('\n')}</code>
          </pre>
          <p className="hds-start-step-body">{s.body}</p>
        </li>
      ))}
    </ol>
  );
}

/**
 * The live numbers, from public/hds-stats.json at build. Rows for fields the file does not
 * have yet are left out (lib/start-here.ts), so the page never shows a blank or a stale figure.
 */
export function StartHereStats() {
  const rows = startHereStats(loadStats());
  return (
    <dl className="hds-start-stats not-prose">
      {rows.map((r) => (
        <div key={r.id} className="hds-start-stat">
          <dt>{r.label}</dt>
          <dd>
            <span className="hds-start-stat-value">{r.value}</span>
            {r.detail ? <span className="hds-start-stat-detail">{r.detail}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
