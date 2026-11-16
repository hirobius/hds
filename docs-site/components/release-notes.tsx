import type { ReactNode } from 'react';
import {
  inlineParts,
  type InlinePart,
  type NoteBlock,
  type ReleaseNotes,
} from '../lib/release-notes';

const GITHUB_COMMIT = 'https://github.com/hirobius/hds/commit/';

function Inline({ text }: { text: string }) {
  return <Parts parts={inlineParts(text)} />;
}

function Parts({ parts }: { parts: InlinePart[] }) {
  return (
    <>
      {parts.map((part, i): ReactNode => {
        if (part.type === 'code') return <code key={i}>{part.text}</code>;
        if (part.type === 'strong') {
          return (
            <strong key={i}>
              <Parts parts={part.parts} />
            </strong>
          );
        }
        if (part.type === 'em') {
          return (
            <em key={i}>
              <Parts parts={part.parts} />
            </em>
          );
        }
        if (part.type === 'link') {
          return (
            <a key={i} href={part.href}>
              {part.text}
            </a>
          );
        }
        return part.text;
      })}
    </>
  );
}

function Block({ block }: { block: NoteBlock }) {
  if (block.type === 'p') {
    return (
      <p>
        <Inline text={block.text} />
      </p>
    );
  }
  if (block.type === 'ul') {
    return (
      <ul className="hds-upgrade-list">
        {block.items.map((item, i) => (
          <li key={i}>
            <Inline text={item} />
          </li>
        ))}
      </ul>
    );
  }
  if (block.type === 'pre') {
    return (
      <pre>
        <code>{block.text}</code>
      </pre>
    );
  }
  return (
    <div className="hds-docs-table">
      <table>
        <thead>
          <tr>
            {block.head.map((cell, i) => (
              <th key={i}>
                <Inline text={cell} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, i) => (
                <td key={i}>
                  <Inline text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * One release's notes (/changelog/<version>), read from CHANGELOG.md when the
 * site builds. Server-rendered; no state.
 */
export function ReleaseNotesView({
  notes,
  date,
  newer,
  older,
  hasUpgradePage,
}: {
  notes: ReleaseNotes;
  /** The release date from the upgrade ledger; null when the release has none. */
  date: string | null;
  newer: string | null;
  older: string | null;
  /** True when /upgrade/<version> exists (the release has an upgrade ledger). */
  hasUpgradePage: boolean;
}) {
  const v = notes.version;
  return (
    <article className="hds-upgrade-page">
      <h1>Release {v}</h1>
      {date ? <p className="hds-upgrade-build">Released {date}</p> : null}
      {hasUpgradePage ? (
        <p>
          What to change in your app for this release: <a href={`/upgrade/${v}`}>upgrade to {v}</a>.
        </p>
      ) : null}
      {notes.groups.length === 0 ? <p>No release notes for this version.</p> : null}
      {notes.groups.map((group) => (
        <section key={group.title} aria-label={group.title}>
          <h2>
            {group.title} ({group.entries.length})
          </h2>
          <ul className="hds-upgrade-list">
            {group.entries.map((entry, i) => (
              <li key={entry.ref ?? i}>
                {entry.blocks.map((block, b) => (
                  <Block key={b} block={block} />
                ))}
                {entry.ref ? (
                  <p className="hds-upgrade-build">
                    <a href={`${GITHUB_COMMIT}${entry.ref}`}>Commit {entry.ref}</a>
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <nav aria-label="Other releases">
        <ul className="hds-upgrade-list">
          {newer ? (
            <li>
              <a href={`/changelog/${newer}`}>Newer: {newer}</a>
            </li>
          ) : null}
          {older ? (
            <li>
              <a href={`/changelog/${older}`}>Older: {older}</a>
            </li>
          ) : null}
          <li>
            <a href="/changelog">All releases</a>
          </li>
        </ul>
      </nav>
    </article>
  );
}

/** /changelog: every release, newest first, with how many changes each holds. */
export function ReleaseIndexView({
  releases,
  dates,
}: {
  releases: ReleaseNotes[];
  dates: Record<string, string>;
}) {
  return (
    <article className="hds-upgrade-page">
      <h1>Changelog</h1>
      <p>
        Every release of <code>@hirobius/design-system</code>, newest first. Each page is built from
        CHANGELOG.md when this site is built.
      </p>
      <ul className="hds-upgrade-list">
        {releases.map((r) => {
          const count = r.groups.reduce((n, g) => n + g.entries.length, 0);
          return (
            <li key={r.version}>
              <a href={`/changelog/${r.version}`}>{r.version}</a>
              {dates[r.version] ? ` · ${dates[r.version]}` : null} · {count}{' '}
              {count === 1 ? 'change' : 'changes'}
            </li>
          );
        })}
      </ul>
    </article>
  );
}
