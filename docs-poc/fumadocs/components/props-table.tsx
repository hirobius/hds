interface Prop {
  name: string;
  type: string;
  default?: string;
  required?: boolean;
  description?: string;
}

/**
 * Renders a prop table straight from HDS's own generated
 * `src/app/data/component-api.json` (the same file the main HDS docs site
 * uses), so this stays in sync with the component's real TS interface
 * instead of being hand-maintained prose.
 */
export function PropsTable({ props }: { props: Prop[] }) {
  return (
    <table className="hds-props-table">
      <thead>
        <tr>
          <th>Prop</th>
          <th>Type</th>
          <th>Default</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        {props.map((prop) => (
          <tr key={prop.name}>
            <td>
              <code>
                {prop.name}
                {prop.required ? '' : '?'}
              </code>
            </td>
            <td>
              <code>{prop.type}</code>
            </td>
            <td>{prop.default ? <code>{prop.default}</code> : '—'}</td>
            <td>{prop.description || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
