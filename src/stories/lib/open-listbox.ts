/**
 * Opens the listbox of a Select or Combobox story from its play function.
 *
 * Every story renders its overlay closed, so the Storybook axe gate
 * (scripts/check-storybook-axe.mjs) only ever saw closed triggers and missed
 * the open listbox's failures (hds#407). The gate waits for a story's play
 * function before it scans, so a story that calls this is scanned open.
 *
 * Plain DOM, no extra dependency: it clicks the first combobox trigger (Radix
 * Select opens on a non-mouse click; Combobox toggles on click) and waits for a
 * listbox anywhere in the document, since overlays portal out of the story
 * root. It throws when none opens, so a story cannot pass as open while closed.
 * The jsdom story smoke gates never run play functions.
 */
export async function openListbox(
  root: HTMLElement,
  { timeoutMs = 3000 }: { timeoutMs?: number } = {},
): Promise<HTMLElement> {
  const trigger = root.querySelector<HTMLElement>('[role="combobox"]');
  if (!trigger) throw new Error('openListbox: no combobox trigger in the story');
  trigger.click();

  const doc = root.ownerDocument;
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const listbox = doc.querySelector<HTMLElement>('[role="listbox"]');
    if (listbox) return listbox;
    if (Date.now() > deadline) {
      throw new Error(`openListbox: no listbox opened within ${timeoutMs} ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, 16));
  }
}
