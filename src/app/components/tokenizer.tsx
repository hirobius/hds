/**
 * Tokenizer — free-text token/chip input where committed entries render as
 * removable Tag chips ahead of the live text field. Enter commits the typed
 * draft as a new token; Backspace on an empty draft removes the trailing one.
 * @category Inputs
 * @tier pattern
 * @public
 */
// motion-ok: interactive — focus-within ring via Tailwind transition-colors (gate accepts only hds.duration refs); mirrors input-group.tsx chrome

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Tag } from './tag';

// ── Types ──────────────────────────────────────────────────────────────────────

/** @public */
export interface TokenizerProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange'
> {
  /** Committed tokens rendered as chips. */
  value: string[];
  /** Called with the next token list whenever tokens are added or removed. */
  onChange: (next: string[]) => void;
  /** Placeholder shown in the trailing text field when empty. */
  placeholder?: string;
  /** Disable the field and all token interactions. */
  disabled?: boolean;
  /** Class hook for the outer wrapper. */
  className?: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

/** A bordered field of Tag chips followed by a text input for adding more. */
export const Tokenizer = React.forwardRef<HTMLInputElement, TokenizerProps>(function Tokenizer(
  { value, onChange, placeholder, disabled, className, id, 'aria-label': ariaLabel, ...rest },
  ref,
) {
  const [draft, setDraft] = React.useState('');

  function commitDraft() {
    const next = draft.trim();
    if (next === '') return;
    onChange([...value, next]);
    setDraft('');
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitDraft();
      return;
    }
    if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function handleRemove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1.5 min-h-10 w-full rounded-md border border-input bg-background px-2 py-1 text-sm transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background',
        disabled && 'cursor-not-allowed bg-muted opacity-70',
        className,
      )}
    >
      {value.map((token, index) => (
        <span key={`${token}-${index}`} className="inline-flex items-center gap-1">
          <Tag>{token}</Tag>
          <button
            type="button"
            onClick={() => handleRemove(index)}
            disabled={disabled}
            aria-label={`Remove ${token}`}
            className="inline-flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-3" aria-hidden="true" />
          </button>
        </span>
      ))}
      <input
        ref={ref}
        id={id}
        aria-label={ariaLabel}
        type="text"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? placeholder : undefined}
        disabled={disabled}
        className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        {...rest}
      />
    </div>
  );
});
