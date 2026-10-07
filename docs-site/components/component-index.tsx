import Link from 'fumadocs-core/link';
import { source } from '../lib/source';
import { loadManifestSpecs } from '../lib/site-data';

/**
 * Index of every generated component page, grouped by manifest category. Built
 * from the page tree, so a new core component appears here with no edit.
 */
export function ComponentIndex() {
  const specs = loadManifestSpecs();
  const groups = new Map<string, { title: string; url: string; description?: string }[]>();
  for (const page of source.getPages()) {
    if (page.slugs[0] !== 'components') continue;
    const name = String((page.data as { component?: unknown }).component ?? page.data.title);
    const category = specs[name]?.category ?? 'Other';
    const list = groups.get(category) ?? [];
    list.push({ title: page.data.title, url: page.url, description: page.data.description });
    groups.set(category, list);
  }
  return (
    <div className="hds-component-index">
      {[...groups.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([category, items]) => (
          <section key={category}>
            <h3>{category}</h3>
            <ul>
              {items
                .sort((a, b) => a.title.localeCompare(b.title))
                .map((item) => (
                  <li key={item.url}>
                    <Link href={item.url}>{item.title}</Link>
                    {item.description ? <span> — {item.description}</span> : null}
                  </li>
                ))}
            </ul>
          </section>
        ))}
    </div>
  );
}
