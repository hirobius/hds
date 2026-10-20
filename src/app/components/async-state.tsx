/**
 * AsyncState - the four states a list or panel goes through while its data loads.
 * @category Feedback
 * @tier pattern
 * @usage Wrap content that loads asynchronously, so it shows skeleton rows while loading, an error with Retry when it fails, your own empty state, and then the content.
 * @whenNot Content that is always there, a task with measurable progress, or a full-page routed error.
 * @useInstead Skeleton one placeholder shape you place yourself
 * @useInstead Alert a message that is not tied to a load
 * @useInstead EmptyState a list that is known to be empty, with no load around it
 * @a11y component required a11y:async-state.busy-region The wrapper is a labelled region; only the skeleton block carries aria-busy, so the status note is never held back.
 * @a11y component required a11y:async-state.slow-note A long load adds a polite status note and never goes silent or spins forever.
 * @a11y component required a11y:async-state.error-announced The error is a danger alert, announced as soon as it appears.
 * @a11y component required a11y:async-state.retry-keyboard Retry is a native button, reachable and operable by keyboard; when it unmounts, focus moves to the region instead of falling to the page.
 * @a11y consumer required Give the region a label that names what is loading ("Open roles"), not "Loading".
 * @a11y consumer required Make `empty` say what to do next, for example an EmptyState with an action.
 */
// motion-ok: composition only. The Skeleton owns its shimmer (and zeroes it under
// prefers-reduced-motion), the Alert owns its entrance and the Button its press
// transition. The wrapper has no hover, press or open state of its own.

import * as React from 'react';
import { Alert } from './alert';
import { Button } from './button';
import { Skeleton } from './skeleton';
import { Stack } from './stack';
import { Text } from './text';

/** @public */
export type AsyncStatus = 'loading' | 'error' | 'empty' | 'ready';

/** @public */
export interface AsyncStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Which of the four states to show. */
  status: AsyncStatus;
  /** Accessible name of the region. Name what is loading ("Open roles"). Defaults to "Content". */
  label?: string;
  /** Loading: how many skeleton rows to show. Defaults to 3. */
  rows?: number;
  /** Loading: milliseconds before the "Still trying…" note replaces the loading line. Defaults to 10000. */
  slowAfterMs?: number;
  /** Loading: the line shown from the start, read out politely. Defaults to "Loading". */
  loadingLabel?: string;
  /** Loading: the line shown once the load runs long. Defaults to "Still trying…". */
  slowNote?: string;
  /** Error: what went wrong, in a plain sentence. Replaced by offline wording when the browser is offline. */
  error?: string;
  /** Error: heading of the alert. Defaults to "Something went wrong". */
  errorTitle?: string;
  /** Error: called when Retry is pressed. Without it no Retry button is shown. */
  onRetry?: () => void;
  /** Empty: shown when `status` is `empty`. */
  empty?: React.ReactNode;
  /** Ready: shown when `status` is `ready`. */
  children?: React.ReactNode;
}

/**
 * Placeholder rows shaped like a list item: a title line and a shorter meta line.
 * Decorative (the Skeleton is aria-hidden). This block alone is aria-busy; the
 * status line sits outside it so its polite updates are never held back.
 */
function SkeletonRows({ rows }: { rows: number }) {
  return (
    <Stack gap="normal" aria-busy="true" data-slot="skeleton">
      {Array.from({ length: Math.max(0, rows) }, (_, i) => (
        <div key={i} data-slot="row">
          <Stack gap="tight">
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" />
          </Stack>
        </div>
      ))}
    </Stack>
  );
}

/**
 * The loading view. Mounted only while loading, so its timer starts fresh each
 * time a load begins and is cleared when the load ends.
 */
function Loading({
  rows,
  slowAfterMs,
  loadingLabel,
  slowNote,
}: {
  rows: number;
  slowAfterMs: number;
  loadingLabel: string;
  slowNote: string;
}) {
  const [slow, setSlow] = React.useState(false);
  React.useEffect(() => {
    const timer = setTimeout(() => setSlow(true), slowAfterMs);
    return () => clearTimeout(timer);
  }, [slowAfterMs]);
  return (
    <Stack gap="normal">
      <Text as="span" variant="caption" tone="secondary" role="status" aria-live="polite">
        {slow ? slowNote : loadingLabel}
      </Text>
      <SkeletonRows rows={rows} />
    </Stack>
  );
}

function ErrorView({
  error,
  errorTitle,
  onRetry,
}: {
  error?: string;
  errorTitle: string;
  onRetry?: () => void;
}) {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  return (
    <Stack gap="tight" align="start">
      <Alert tone="danger" title={offline ? 'You’re offline' : errorTitle}>
        {offline ? 'Reconnect, then try again.' : error}
      </Alert>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} data-slot="retry">
          Retry
        </Button>
      )}
    </Stack>
  );
}

/**
 * One wrapper for the four states of async content: `loading` (skeleton rows plus
 * a polite status line that turns into "Still trying…" after `slowAfterMs`),
 * `error` (a danger `Alert` and a Retry `Button`, with offline wording when the
 * browser reports no connection), `empty` (your node) and `ready` (children).
 * The wrapper is a labelled region; while loading only the skeleton block is
 * aria-busy. After Retry, focus moves to the region (tabIndex -1) once the
 * button unmounts, so a keyboard user is not dropped on the page.
 */
export const AsyncState = /* @__PURE__ */ React.forwardRef<HTMLDivElement, AsyncStateProps>(
  function AsyncState(
    {
      status,
      label = 'Content',
      rows = 3,
      slowAfterMs = 10_000,
      loadingLabel = 'Loading',
      slowNote = 'Still trying…',
      error,
      errorTitle = 'Something went wrong',
      onRetry,
      empty,
      children,
      ...props
    },
    ref,
  ) {
    const regionRef = React.useRef<HTMLDivElement | null>(null);
    const setRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        regionRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );
    // Set when Retry is pressed; read after the next render, when the button
    // may have unmounted and taken focus with it.
    const retried = React.useRef(false);
    const handleRetry = React.useCallback(() => {
      retried.current = true;
      onRetry?.();
    }, [onRetry]);
    React.useLayoutEffect(() => {
      if (!retried.current) return;
      retried.current = false;
      const active = document.activeElement;
      // Only rescue focus that fell to the page; never pull it from elsewhere.
      if (active && active !== document.body) return;
      regionRef.current?.focus();
    }, [status]);
    return (
      <div
        ref={setRef}
        tabIndex={-1}
        data-hds-component="AsyncState"
        data-status={status}
        role="region"
        aria-label={label}
        {...props}
      >
        {status === 'loading' && (
          <Loading
            rows={rows}
            slowAfterMs={slowAfterMs}
            loadingLabel={loadingLabel}
            slowNote={slowNote}
          />
        )}
        {status === 'error' && (
          <ErrorView
            error={error}
            errorTitle={errorTitle}
            onRetry={onRetry ? handleRetry : undefined}
          />
        )}
        {status === 'empty' && empty}
        {status === 'ready' && children}
      </div>
    );
  },
);
