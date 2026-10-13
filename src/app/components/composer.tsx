/**
 * Composer — prompt and capture box that grows with its text and folds long pastes into cards.
 * @category Inputs
 * @tier pattern
 * @usage Capture a prompt or a quick note where a long paste should not flood the field.
 * @whenNot A plain multi-line field with no submit action, or a form with several fields.
 * @useInstead Textarea a plain multi-line field
 * @doc-exempt: demo lives in docs-site/components/component-demos.tsx
 *
 * Built from Textarea, Button, Tag, Dialog and Kbd. A paste longer than
 * `pasteFoldThreshold` characters never enters the field: it becomes an
 * attachment card (a Tag) that opens a Dialog to edit or remove the text.
 * Cmd/Ctrl+Enter submits; plain Enter stays a newline. `text` and
 * `attachments` can each be controlled or uncontrolled; an uncontrolled
 * composer clears itself after a submit.
 */

import * as React from 'react';
import { cn } from '../../lib/utils';
import { Badge } from './badge';
import { Button } from './button';
import { Dialog } from './dialog';
import { Kbd } from './kbd';
import { Tag } from './tag';
import { Textarea } from './textarea';

// ── Types ──────────────────────────────────────────────────────────────────────

/** One attachment card. Cards with `text` open an editor; others are display only. */
export interface ComposerAttachment {
  /** Stable id used as the React key and to target edits. */
  id: string;
  /** Text shown on the card. */
  label: string;
  /** Editable body. Present on cards folded from a paste. */
  text?: string;
}

/** What `onSubmit` receives. */
export interface ComposerSubmission {
  text: string;
  attachments: ComposerAttachment[];
}

/** @public */
export interface ComposerProps {
  /** Controlled text. Omit for an uncontrolled composer. */
  value?: string;
  /** Initial text when `value` is not set. */
  defaultValue?: string;
  /** Called with the next text on every change. */
  onValueChange?: (value: string) => void;
  /** Controlled attachments (including folded pastes). Omit for uncontrolled. */
  attachments?: ComposerAttachment[];
  /** Initial attachments when `attachments` is not set. */
  defaultAttachments?: ComposerAttachment[];
  /** Called with the next attachment list when a paste folds or a card is edited or removed. */
  onAttachmentsChange?: (attachments: ComposerAttachment[]) => void;
  /** Called on Cmd/Ctrl+Enter or the send button, with the text and attachments. */
  onSubmit?: (submission: ComposerSubmission) => void;
  /** A paste longer than this many characters folds into an attachment card. Defaults to 500. */
  pasteFoldThreshold?: number;
  /** Placeholder shown while the field is empty. */
  placeholder?: string;
  /** Accessible name of the field. Defaults to "Message". */
  label?: string;
  /** Lock the whole composer. */
  disabled?: boolean;
  /** A submit is in flight: the send button shows busy and submitting is blocked. */
  pending?: boolean;
  /** Class hook for the outer wrapper. */
  className?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Controlled-or-uncontrolled state, so callers choose either. */
function useControllable<T>(
  controlled: T | undefined,
  initial: T,
  onChange?: (next: T) => void,
): [T, (next: T) => void] {
  const [inner, setInner] = React.useState<T>(initial);
  const isControlled = controlled !== undefined;
  const set = (next: T) => {
    if (!isControlled) setInner(next);
    onChange?.(next);
  };
  return [isControlled ? controlled : inner, set];
}

const NO_ATTACHMENTS: ComposerAttachment[] = [];

// ── Component ──────────────────────────────────────────────────────────────────

export const Composer = /* @__PURE__ */ React.forwardRef<HTMLTextAreaElement, ComposerProps>(
  function Composer(
    {
      value,
      defaultValue = '',
      onValueChange,
      attachments,
      defaultAttachments = NO_ATTACHMENTS,
      onAttachmentsChange,
      onSubmit,
      pasteFoldThreshold = 500,
      placeholder,
      label = 'Message',
      disabled = false,
      pending = false,
      className,
    },
    forwardedRef,
  ) {
    const [text, setText] = useControllable(value, defaultValue, onValueChange);
    const [cards, setCards] = useControllable(attachments, defaultAttachments, onAttachmentsChange);
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [draft, setDraft] = React.useState('');
    const fieldRef = React.useRef<HTMLTextAreaElement | null>(null);
    const foldCount = React.useRef(0);
    const locked = disabled || pending;
    const canSubmit = !locked && (text.trim() !== '' || cards.length > 0);

    const setRefs = (node: HTMLTextAreaElement | null) => {
      fieldRef.current = node;
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    };

    // Auto-grow: collapse, then fit the height to the content.
    React.useLayoutEffect(() => {
      const el = fieldRef.current;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }, [text]);

    const submit = () => {
      if (!canSubmit) return;
      onSubmit?.({ text, attachments: cards });
      if (value === undefined) setText('');
      if (attachments === undefined) setCards(NO_ATTACHMENTS);
    };

    const onPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const pasted = event.clipboardData.getData('text');
      if (locked || pasted.length <= pasteFoldThreshold) return;
      event.preventDefault();
      foldCount.current += 1;
      setCards([
        ...cards,
        {
          id: `paste-${foldCount.current}-${cards.length}`,
          label: `Pasted text · ${pasted.length} chars`,
          text: pasted,
        },
      ]);
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return;
      if (event.nativeEvent.isComposing) return;
      event.preventDefault();
      submit();
    };

    const editing = cards.find((card) => card.id === editingId);
    const openEditor = (card: ComposerAttachment) => {
      setDraft(card.text ?? '');
      setEditingId(card.id);
    };
    const closeEditor = () => setEditingId(null);

    return (
      <div className={cn('flex flex-col gap-2', className)}>
        {cards.length > 0 && (
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="Attachments">
            {cards.map((card) => (
              <li key={card.id}>
                {card.text === undefined ? (
                  <Badge>{card.label}</Badge>
                ) : (
                  <Tag
                    aria-pressed={undefined}
                    aria-haspopup="dialog"
                    aria-label={`${card.label}, edit`}
                    disabled={locked}
                    onClick={() => openEditor(card)}
                  >
                    {card.label}
                  </Tag>
                )}
              </li>
            ))}
          </ul>
        )}

        <Textarea
          ref={setRefs}
          aria-label={label}
          placeholder={placeholder}
          value={text}
          rows={1}
          resize="none"
          disabled={disabled}
          readOnly={pending}
          textareaClassName="max-h-[50dvh] overflow-y-auto"
          onChange={(event) => setText(event.target.value)}
          onPaste={onPaste}
          onKeyDown={onKeyDown}
        />

        <div className="flex items-center justify-end gap-2">
          <span className="hds-type-caption text-muted-foreground">
            <Kbd size="sm">⌘</Kbd> <Kbd size="sm">Enter</Kbd> to send
          </span>
          <Button
            variant="primary"
            loading={pending}
            disabled={!canSubmit && !pending}
            onClick={submit}
          >
            Send
          </Button>
        </div>

        <Dialog open={editing !== undefined} onOpenChange={(open) => !open && closeEditor()}>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Edit pasted text</Dialog.Title>
              <Dialog.Description>{editing?.label}</Dialog.Description>
            </Dialog.Header>
            <Textarea
              aria-label="Pasted text"
              rows={8}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <Dialog.Footer>
              <Button
                variant="tertiary"
                onClick={() => {
                  setCards(cards.filter((card) => card.id !== editingId));
                  closeEditor();
                }}
              >
                Remove
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setCards(
                    cards.map((card) =>
                      card.id === editingId
                        ? { ...card, text: draft, label: `Pasted text · ${draft.length} chars` }
                        : card,
                    ),
                  );
                  closeEditor();
                }}
              >
                Save
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog>
      </div>
    );
  },
);
