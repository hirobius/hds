/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * The listbox-popup plumbing Combobox and its creatable arm
 * (combobox-creatable.tsx) share: open/query/active-row state and ids, the
 * keyboard-only scroll of the active row, the forwarded-ref merge, the
 * outside-interaction target, and the option check mark plus the
 * no-results / result-count footer. Local to the two Combobox files (hds#1009).
 */

import * as React from 'react';
import { Check } from 'lucide-react';
import { Icon } from './icon';

/** Open, query and active-row state of one listbox popup, with its ids. */
export function useComboboxList() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);
  const baseId = React.useId();
  const listId = `${baseId}-list`;
  // Ids come from the index: an option value may hold spaces or characters
  // that are invalid in an id / aria-activedescendant reference.
  const optionId = (i: number) => `${baseId}-opt-${i}`;

  // Keyboard moves bring the active option into view inside the max-h list.
  // Mouse hover also sets activeIndex but must not scroll, so only a key sets this.
  const scrollActiveIntoView = React.useRef(false);
  /** Move the active row from the keyboard; the row scrolls into view. */
  function moveActive(next: number) {
    if (next !== activeIndex) {
      scrollActiveIntoView.current = true;
      setActiveIndex(next);
    }
  }

  return {
    open,
    setOpen,
    query,
    setQuery,
    activeIndex,
    setActiveIndex,
    listId,
    optionId,
    moveActive,
    scrollActiveIntoView,
  };
}

/**
 * Scrolls the active row (by element id) into view after a keyboard move.
 * Pass `undefined` while the list is closed.
 */
export function useScrollActiveIntoView(
  pendingRef: React.MutableRefObject<boolean>,
  activeId: string | undefined,
) {
  React.useEffect(() => {
    if (!pendingRef.current) return;
    pendingRef.current = false;
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' });
  }, [pendingRef, activeId]);
}

/** Hands `node` to a forwarded ref, whether it is a callback or an object ref. */
function assignRef<T>(ref: React.ForwardedRef<T>, node: T | null) {
  if (typeof ref === 'function') ref(node);
  else if (ref) ref.current = node;
}

/** A local ref to the node that also feeds the caller's forwarded ref. */
export function useForwardedRef<T>(forwardedRef: React.ForwardedRef<T>) {
  const localRef = React.useRef<T | null>(null);
  const setRef = React.useCallback(
    (node: T | null) => {
      localRef.current = node;
      assignRef(forwardedRef, node);
    },
    [forwardedRef],
  );
  return [localRef, setRef] as const;
}

/** The node a Radix `onInteractOutside` event started on. */
export function outsideTarget(event: unknown): Node | null {
  const oe = (event as { detail?: { originalEvent?: Event } }).detail?.originalEvent;
  return (oe?.target ?? (event as Event).target) as Node | null;
}

/** The fixed-width check slot at the start of an option row. */
export function OptionCheck({ selected }: { selected: boolean }) {
  return (
    <span className="flex size-4 items-center justify-center">
      {selected ? <Icon icon={Check} size="small" color="currentColor" aria-hidden /> : null}
    </span>
  );
}

/** The no-results message and the polite result-count status after the listbox. */
export function ListboxFooter({
  empty,
  emptyMessage,
  status,
}: {
  empty: boolean;
  emptyMessage: string;
  status: string;
}) {
  return (
    <>
      {/* Beside the listbox, not in it: a listbox holding text but no
          option fails axe aria-required-children (hds#407). m-fixed-2xs stands in
          for the empty listbox's padding, so the box is unchanged. */}
      {empty ? (
        <p className="m-fixed-2xs px-scale-xs py-fixed-md text-center hds-type-ui text-muted-foreground">
          {emptyMessage}
        </p>
      ) : null}
      {/* Filtering changes the list without moving focus, so the match count is
          announced through a polite live region (WCAG 4.1.3). */}
      <div role="status" aria-live="polite" className="sr-only">
        {status}
      </div>
    </>
  );
}

/** "1 result" / "N results". */
export function resultCount(n: number): string {
  return `${n} ${n === 1 ? 'result' : 'results'}`;
}
