/**
 * Contract test: what a screen-reader reads from the overlay, listbox, table and
 * feedback primitives.
 *
 * Drives @guidepup/virtual-screen-reader over the jsdom accessibility tree: the
 * role, accessible name and state phrases it speaks, in order, and what a live
 * region announces. This is accessibility-tree reading, not NVDA or VoiceOver:
 * it catches a wrapper that drops a role, a name or aria state, not a quirk of
 * one real screen-reader.
 *
 * Surfaces open from the keyboard (user-event, as in keyboard.contract.test.tsx),
 * never through the reader's own act command, which refuses Select's
 * pointer-events: none span. Expected phrases are frozen from the first green run.
 *
 * jsdom polyfills (incl. CSS.escape, which the library needs to resolve
 * aria-labelledby) live in tests/setup/jsdom-polyfills.ts.
 *
 * @primitive Dialog Menu Select Combobox Table Alert
 */
import { useState } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { virtual } from '@guidepup/virtual-screen-reader';
import { Table, type TableColumn, type TableRow } from '@/app/components/table';
import { Alert } from '@/app/components/alert';
import {
  user,
  DialogFixture,
  MenuFixture,
  SelectFixture,
  ComboboxFixture,
} from './overlay-fixtures';

afterEach(async () => {
  await virtual.stop();
  cleanup();
});

/** Start reading the whole page: portalled overlays render outside the fixture root. */
const startReader = () => virtual.start({ container: document.body });

async function next(times: number) {
  for (let i = 0; i < times; i++) await virtual.next();
}

async function previous(times: number) {
  for (let i = 0; i < times; i++) await virtual.previous();
}

/** Focus a control and press a key on it, as a keyboard user would. */
async function press(control: HTMLElement, key: string) {
  control.focus();
  await user().keyboard(key);
}

// Same shape as src/app/components/table.test.tsx, with Name sorted ascending.
const ROWS: TableRow[] = [
  {
    key: 'a',
    cells: [
      { slot: 'label', content: 'Alpha' },
      { slot: 'value', content: '1' },
    ],
  },
  {
    key: 'b',
    cells: [
      { slot: 'label', content: 'Beta' },
      { slot: 'value', content: '2' },
    ],
  },
];
const SORTED_COLUMNS: TableColumn[] = [
  { key: 'name', label: 'Name', sortable: true, sortDirection: 'ascending' },
  { key: 'value', label: 'Value' },
];

function SaveFixture() {
  const [saved, setSaved] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setSaved(true)}>
        Save
      </button>
      {saved ? (
        <Alert tone="danger" title="Not saved">
          Your changes were not saved.
        </Alert>
      ) : null}
    </>
  );
}

describe('Dialog screen-reader contract', () => {
  it('reads the trigger, then the open dialog by its title and description', async () => {
    render(<DialogFixture />);
    await startReader();
    await press(screen.getByRole('button', { name: 'Open dialog' }), '{Enter}');
    await screen.findByRole('dialog');
    await next(4);

    const log = await virtual.spokenPhraseLog();
    expect(log).toContain('button, Open dialog, not expanded, has popup dialog');
    expect(log).toContain('dialog, Settings, Adjust things.');
    expect(log).toContain('button, Close');
    expect(log).toContain('end of dialog, Settings, Adjust things.');
  });
});

describe('Menu screen-reader contract', () => {
  it('reads the open menu by its trigger, then each item with position and set size', async () => {
    render(<MenuFixture />);
    await startReader();
    await press(screen.getByRole('button', { name: 'Actions' }), '{Enter}');
    await screen.findByRole('menu');
    await next(4);

    const log = await virtual.spokenPhraseLog();
    expect(log).toContain('button, Actions, not expanded, has popup menu');
    expect(log).toContain('menu, Actions, orientated vertically');
    expect(log).toContain('menuitem, Apple, position 1, set size 3');
    expect(log).toContain('menuitem, Banana, position 2, set size 3');
    expect(log).toContain('menuitem, Cherry, position 3, set size 3');
  });
});

describe('Select screen-reader contract', () => {
  it('reads the closed trigger as a collapsed combobox named by its label and value', async () => {
    render(<SelectFixture />);
    await startReader();
    await next(3);

    const log = await virtual.spokenPhraseLog();
    expect(log).toContain(
      'combobox, Fruit: Apple, has popup listbox, not expanded, no autocomplete',
    );
  });

  it('reads the open options with the selected one marked, position and set size', async () => {
    render(<SelectFixture />);
    await startReader();
    await press(screen.getByRole('combobox'), '{Enter}');
    await screen.findByRole('listbox');
    await next(4);

    const log = await virtual.spokenPhraseLog();
    expect(log).toContain('option, Apple, selected, position 1, set size 3');
    expect(log).toContain('option, Banana, not selected, position 2, set size 3');
    expect(log).toContain('option, Cherry, not selected, position 3, set size 3');
  });

  // With the label hidden, the trigger still carries the field label, not only
  // the value (hds#408).
  it('reads the closed trigger with the field label when the label is hidden', async () => {
    render(<SelectFixture showLabel={false} />);
    await startReader();
    await next(2);

    const log = await virtual.spokenPhraseLog();
    expect(log).toContain(
      'combobox, Fruit: Apple, has popup listbox, not expanded, no autocomplete',
    );
  });

  // Radix Select Content names nothing itself: select.tsx labels the listbox
  // with the field label (hds#398).
  it('names the open listbox by the field label', async () => {
    render(<SelectFixture />);
    await startReader();
    await press(screen.getByRole('combobox'), '{Enter}');
    await screen.findByRole('listbox');
    // Focus lands on the selected option: step past the end of the listbox, then back to its start.
    await next(4);
    await previous(5);

    const log = await virtual.spokenPhraseLog();
    expect(log).toContain('end of listbox, Fruit, orientated vertically');
    expect(log).toContain('listbox, Fruit, orientated vertically');
  });
});

describe('Combobox screen-reader contract', () => {
  it('reads the closed trigger as a collapsed combobox with a listbox popup', async () => {
    render(<ComboboxFixture />);
    await startReader();
    await next(2);

    const log = await virtual.spokenPhraseLog();
    expect(log).toContain('combobox, Fruit, has popup listbox, not expanded');
  });

  it('reads the open search field and named listbox, and the trigger as expanded', async () => {
    render(<ComboboxFixture />);
    await startReader();
    await press(screen.getByRole('combobox', { name: 'Fruit' }), '{Enter}');
    await screen.findByRole('listbox');
    await next(1);
    // The popover is non-modal, so the reader can step back out of it to the trigger.
    await previous(5);

    const log = await virtual.spokenPhraseLog();
    expect(log).toContain(
      'combobox, Search…, has popup listbox, expanded, active descendant Apple, autocomplete in list, 1 control',
    );
    expect(log).toContain('listbox, Fruit, orientated vertically');
    expect(log).toContain('combobox, Fruit, has popup listbox, expanded, 1 control');
  });

  // Each option's <li> is role="none", so the option's parent in the
  // accessibility tree is the listbox and the reader counts it among its
  // siblings, not alone in a list item (hds#407).
  it('reads each open option with its real position and set size', async () => {
    render(<ComboboxFixture />);
    await startReader();
    await press(screen.getByRole('combobox', { name: 'Fruit' }), '{Enter}');
    await screen.findByRole('listbox');
    await next(8);

    const log = await virtual.spokenPhraseLog();
    expect(log).toContain('option, Apple, not selected, position 1, set size 3');
    expect(log).toContain('option, Banana, not selected, position 2, set size 3');
    expect(log).toContain('option, Cherry, not selected, position 3, set size 3');
  });

  // The popover is Popover.Content, role="dialog": combobox.tsx names it with
  // the field label, so the reader does not enter an unnamed "dialog" (hds#399).
  it('names the open popover dialog by the field label', async () => {
    render(<ComboboxFixture />);
    await startReader();
    await press(screen.getByRole('combobox', { name: 'Fruit' }), '{Enter}');
    await screen.findByRole('listbox');
    await next(1);
    await previous(5);

    const log = await virtual.spokenPhraseLog();
    expect(log).toContain('dialog, Fruit');
  });
});

describe('Table screen-reader contract', () => {
  it('reads the sorted column header with its sort state, and its sort button', async () => {
    render(<Table columns={SORTED_COLUMNS} rows={ROWS} />);
    await startReader();
    await next(6);

    const log = await virtual.spokenPhraseLog();
    expect(log).toContain('region, Scrollable table content');
    expect(log).toContain('columnheader, Name, sorted in ascending order');
    expect(log).toContain('button, Name');
  });
});

describe('Alert screen-reader contract', () => {
  it('reads a rendered alert: the role, then its title and message', async () => {
    render(
      <Alert tone="danger" title="Not saved">
        Your changes were not saved.
      </Alert>,
    );
    await startReader();
    await next(4);

    const log = await virtual.spokenPhraseLog();
    const at = log.indexOf('alert');
    expect(at).toBeGreaterThan(-1);
    expect(log.slice(at, at + 4)).toEqual([
      'alert',
      'Not saved',
      'Your changes were not saved.',
      'end of alert',
    ]);
  });

  it('announces an alert that appears after the page loaded, assertively', async () => {
    render(<SaveFixture />);
    await startReader();
    await press(screen.getByRole('button', { name: 'Save' }), '{Enter}');
    await screen.findByRole('alert');

    expect(await virtual.spokenPhraseLog()).toContain('button, Save');
    // The virtual reader announces mutations inside a live region, not the
    // insertion of the role="alert" node itself (it walks up from the mutation
    // target, here the alert's non-live parent). What it announces are the
    // Alert's entrance-animation style writes on the role="alert" node, which
    // land a frame or more after the insert, so wait for them. The reader joins
    // title and body.
    await waitFor(async () =>
      expect(await virtual.spokenPhraseLog()).toContain(
        'assertive: Not savedYour changes were not saved.',
      ),
    );
  });
});
