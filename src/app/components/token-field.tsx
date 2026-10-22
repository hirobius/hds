// motion-ok: token field — focus ring + transition via Tailwind utilities (gate accepts only hds.duration refs)
/**
 * TokenField — a multi-line text field whose tokens, such as `[Name]`, are atomic chips.
 * @category Inputs
 * @tier primitive
 * @usage Edit a template or message in which placeholders such as [Name] must stay whole: each one is a chip that is stepped over and deleted as one unit.
 * @whenNot Plain multi-line text with no placeholders, or a single line.
 * @useInstead Textarea multi-line text with no tokens
 * @useInstead Input a single line of text
 * @a11y component required a11y:token-field.textbox The field is a multi-line textbox named by its label.
 * @a11y component required a11y:token-field.chip-unit Each chip is announced as one unit, its label and the token noun, never letter by letter.
 * @a11y component required a11y:token-field.error-wiring An error sets aria-invalid, links the message with aria-describedby and announces it with role=alert.
 * @a11y component required a11y:token-field.keyboard Tab enters and leaves the field; Backspace, Delete and the arrows treat a chip as one character.
 * @a11y consumer required Pass a label, or an aria-label or aria-labelledby; a placeholder is not a name.
 *
 * The value stays a plain string. The field is a contenteditable textbox that
 * draws each match of `tokenPattern` as a chip; every edit that could split a
 * chip (Backspace or Delete beside one, the arrows, Enter, paste, drop) goes
 * through the pure model in token-field-model.ts. A ref handle inserts at the
 * caret and reads or sets the selection as string offsets (hds#826).
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=2209-141
 */
import * as React from 'react';
import { cn } from '../../lib/utils';
import { FORM_CONTROL_WIDTH } from './form-control';
import {
  DEFAULT_TOKEN_PATTERN,
  defaultTokenLabel,
  insertAt,
  removeTokenAt,
  snapOutOfToken,
  splitTokens,
  stepOver,
} from './token-field-model';

// ── Types ──────────────────────────────────────────────────────────────────────

/** A selection inside the field, as offsets into the value string. */
export interface TokenFieldSelection {
  start: number;
  end: number;
}

/** @public */
export interface TokenFieldHandle {
  /**
   * Insert text at `range`, else at the last selection, else at the end; then
   * focus the field with the caret after the inserted text.
   */
  insertAt(text: string, range?: TokenFieldSelection): void;
  /** The last selection inside the field, or null if it never had one. */
  getSelection(): TokenFieldSelection | null;
  /** Focus the field and select [start, end) (a caret when `end` is omitted). */
  setSelection(start: number, end?: number): void;
  /** Focus the field. */
  focus(): void;
}

/** @public */
export interface TokenFieldProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue' | 'children' | 'contentEditable'
> {
  /** The text, tokens included, as one plain string. */
  value: string;
  /** Called with the new string after every edit. */
  onChange: (value: string) => void;
  /** What counts as a token. Defaults to a short bracketed name on one line, such as `[Company]`. */
  tokenPattern?: RegExp;
  /** The chip text for a token. Defaults to the name inside the brackets. */
  getTokenLabel?: (token: string) => string;
  /** The word a screen reader says after a chip's label. Defaults to "variable". */
  tokenNoun?: string;
  /** Field label rendered above the field. */
  label?: string;
  /** Supporting helper text rendered below when not in error. */
  helperText?: string;
  /** Disable interaction. */
  disabled?: boolean;
  /** Mark the field as invalid (sets aria-invalid + destructive border). */
  error?: boolean;
  /** Error message rendered below the field when `error` is true. */
  errorMessage?: string;
  /** Shown while the value is empty. */
  placeholder?: string;
  /** Minimum height in lines. Defaults to 4, like Textarea. */
  rows?: number;
  /** Form field name: a hidden input carries the value in a native form submit. */
  name?: string;
  /** Mark the field as required for assistive tech. */
  required?: boolean;
  /** Class hook for the outer wrapper. */
  className?: string;
  /** Class hook for the editable field itself. */
  fieldClassName?: string;
}

// ── DOM model ──────────────────────────────────────────────────────────────────

// A chip reads like a neutral Tag, from the same semantic tokens Tag's own tokens alias.
const CHIP_CLASS =
  'mx-px inline-block whitespace-nowrap rounded-[var(--semantic-radius-control)] bg-[var(--semantic-color-surface-muted)] px-[var(--semantic-space-subgrid-gap)] text-[var(--semantic-color-content-primary)] cursor-default select-all';

type Labeller = { label: (token: string) => string; noun: string };

/** The value a node holds: text as is, a chip as its token, a typed line break as "\n". */
function serialize(node: Node): string {
  let out = '';
  node.childNodes.forEach((c) => {
    if (c.nodeType === Node.TEXT_NODE) out += (c.nodeValue ?? '').replace(/ /g, ' ');
    else if (c instanceof HTMLElement) {
      if (c.dataset['token']) out += c.dataset['token'];
      else if (c.tagName === 'BR') out += c.dataset['filler'] ? '' : '\n';
      else {
        // A browser-made block (autocorrect, a stray drop) starts a new line.
        if ((c.tagName === 'DIV' || c.tagName === 'P') && out && !out.endsWith('\n')) out += '\n';
        out += serialize(c);
      }
    }
  });
  return out;
}

function chip(token: string, l: Labeller): HTMLElement {
  const el = document.createElement('span');
  el.className = CHIP_CLASS;
  el.setAttribute('contenteditable', 'false');
  el.dataset['token'] = token;
  el.setAttribute('role', 'img');
  const text = l.label(token);
  el.setAttribute('aria-label', l.noun ? `${text} ${l.noun}` : text);
  el.textContent = text;
  return el;
}

function draw(el: HTMLElement, value: string, pattern: RegExp, l: Labeller) {
  el.replaceChildren();
  for (const s of splitTokens(value, pattern))
    el.append(s.kind === 'text' ? document.createTextNode(s.text) : chip(s.token, l));
  // A trailing line break only shows (and takes a caret) with something after it.
  if (value.endsWith('\n')) {
    const br = document.createElement('br');
    br.dataset['filler'] = '1';
    el.append(br);
  }
}

/** True when the DOM is exactly what `draw(value)` makes, so a typed `[Role]` becomes a chip. */
function isCanonical(el: HTMLElement, value: string, pattern: RegExp): boolean {
  const kids = [...el.childNodes].filter(
    (c) => !(c instanceof HTMLElement && c.tagName === 'BR' && c.dataset['filler']),
  );
  let i = 0;
  for (const s of splitTokens(value, pattern)) {
    if (s.kind === 'token') {
      const k = kids[i++];
      if (!(k instanceof HTMLElement) || k.dataset['token'] !== s.token) return false;
    } else {
      // A text run may be split over several text nodes.
      let text = '';
      while (i < kids.length && kids[i].nodeType === Node.TEXT_NODE) text += kids[i++].nodeValue;
      if (text !== s.text) return false;
    }
  }
  return i === kids.length;
}

function offsetOf(el: HTMLElement, node: Node, offset: number): number {
  const r = document.createRange();
  r.setStart(el, 0);
  r.setEnd(node, offset);
  const frag = document.createElement('div');
  frag.append(r.cloneContents());
  return serialize(frag).length;
}

function readSelection(el: HTMLElement): TokenFieldSelection | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const r = sel.getRangeAt(0);
  if (!el.contains(r.startContainer) || !el.contains(r.endContainer)) return null;
  return {
    start: offsetOf(el, r.startContainer, r.startOffset),
    end: offsetOf(el, r.endContainer, r.endOffset),
  };
}

/** The DOM point for a value offset; assumes `el` holds `draw(value)`. */
function pointAt(el: HTMLElement, offset: number): [Node, number] {
  let left = offset;
  for (let i = 0; i < el.childNodes.length; i++) {
    const c = el.childNodes[i];
    if (c.nodeType === Node.TEXT_NODE) {
      const len = c.nodeValue?.length ?? 0;
      if (left <= len) return [c, left];
      left -= len;
    } else if (c instanceof HTMLElement && c.dataset['token']) {
      if (left === 0) return [el, i];
      left -= c.dataset['token'].length;
      if (left < 0) return [el, i + 1];
    } else if (c instanceof HTMLElement && c.dataset['filler']) {
      return [el, i];
    }
  }
  return [el, el.childNodes.length];
}

function select(el: HTMLElement, start: number, end = start) {
  const sel = window.getSelection();
  if (!sel) return;
  const r = document.createRange();
  r.setStart(...pointAt(el, start));
  r.setEnd(...pointAt(el, end));
  sel.removeAllRanges();
  sel.addRange(r);
}

// ── History ────────────────────────────────────────────────────────────────────

// Native contenteditable undo breaks once the field redraws, so the field keeps
// its own: one entry per edit, with a run of typing kept as one entry.
const HISTORY_LIMIT = 100;
const TYPING_RUN_MS = 1000;
type Snapshot = { value: string; caret: number };

// ── Component ──────────────────────────────────────────────────────────────────

export const TokenField = /* @__PURE__ */ React.forwardRef<TokenFieldHandle, TokenFieldProps>(
  function TokenField(
    {
      value,
      onChange,
      tokenPattern = DEFAULT_TOKEN_PATTERN,
      getTokenLabel = defaultTokenLabel,
      tokenNoun = 'variable',
      id: providedId,
      label,
      helperText,
      error,
      errorMessage,
      disabled,
      placeholder,
      rows = 4,
      name,
      required,
      className,
      fieldClassName,
      style,
      onFocus,
      ...rest
    },
    ref,
  ) {
    const generatedId = React.useId();
    const id = providedId ?? generatedId;
    const el = React.useRef<HTMLDivElement>(null);
    const last = React.useRef<TokenFieldSelection | null>(null);
    const pending = React.useRef<number | null>(null);
    const past = React.useRef<Snapshot[]>([]);
    const future = React.useRef<Snapshot[]>([]);
    const lastTyped = React.useRef(0);
    // The latest props for the DOM helpers, so effects need not re-run on a new function identity.
    const model = React.useRef({
      pattern: tokenPattern,
      l: { label: getTokenLabel, noun: tokenNoun },
    });
    model.current = { pattern: tokenPattern, l: { label: getTokenLabel, noun: tokenNoun } };

    // Outside changes (an inserted token, another template) redraw; the field's own edits already match.
    React.useLayoutEffect(() => {
      const node = el.current;
      if (!node) return;
      const { pattern, l } = model.current;
      if (serialize(node) !== value || !isCanonical(node, value, pattern))
        draw(node, value, pattern, l);
      if (pending.current != null) {
        node.focus();
        select(node, pending.current);
        last.current = { start: pending.current, end: pending.current };
        pending.current = null;
      }
    }, [value, tokenPattern, tokenNoun]);

    React.useEffect(() => {
      const track = () => {
        const node = el.current;
        const s = node && readSelection(node);
        if (s) last.current = s;
      };
      document.addEventListener('selectionchange', track);
      return () => document.removeEventListener('selectionchange', track);
    }, []);

    const caretNow = () => {
      const node = el.current;
      return (node && readSelection(node)?.end) ?? last.current?.end ?? value.length;
    };

    const record = (typing = false) => {
      const now = Date.now();
      const run = typing && now - lastTyped.current < TYPING_RUN_MS;
      lastTyped.current = typing ? now : 0;
      if (run) return;
      past.current.push({ value, caret: caretNow() });
      if (past.current.length > HISTORY_LIMIT) past.current.shift();
      future.current = [];
    };

    const commit = (next: string, caret: number) => {
      const node = el.current;
      if (next === value) {
        if (node) {
          draw(node, next, model.current.pattern, model.current.l);
          node.focus();
          select(node, caret);
        }
        last.current = { start: caret, end: caret };
        return;
      }
      pending.current = caret;
      onChange(next);
    };

    const edit = (next: string, caret: number) => {
      record();
      commit(next, caret);
    };

    const travel = (
      from: React.MutableRefObject<Snapshot[]>,
      to: React.MutableRefObject<Snapshot[]>,
    ) => {
      const snap = from.current.pop();
      if (!snap) return;
      to.current.push({ value, caret: caretNow() });
      lastTyped.current = 0;
      commit(snap.value, snap.caret);
    };

    React.useImperativeHandle(ref, () => ({
      insertAt: (text, range) => {
        const r = range ?? last.current ?? { start: value.length, end: value.length };
        const next = insertAt(value, r.start, r.end, text);
        edit(next.value, next.caret);
      },
      getSelection: () => last.current,
      setSelection: (start, end = start) => {
        const node = el.current;
        if (!node) return;
        node.focus();
        select(node, start, end);
        last.current = { start, end };
      },
      focus: () => el.current?.focus(),
    }));

    // Read the DOM after the browser's own edit: redraw any chip it split or a typed token, then report.
    const syncFromDom = () => {
      const node = el.current;
      if (!node) return;
      const next = serialize(node);
      const { pattern, l } = model.current;
      if (!isCanonical(node, next, pattern)) {
        const s = readSelection(node);
        draw(node, next, pattern, l);
        if (s) select(node, snapOutOfToken(next, s.end, pattern));
      }
      if (next !== value) {
        // The DOM already holds the edit, so the snapshot is the value before it.
        const now = Date.now();
        if (now - lastTyped.current >= TYPING_RUN_MS) {
          past.current.push({ value, caret: last.current?.end ?? value.length });
          if (past.current.length > HISTORY_LIMIT) past.current.shift();
        }
        future.current = [];
        lastTyped.current = now;
        onChange(next);
      }
    };

    const onInput = (e: React.FormEvent<HTMLDivElement>) => {
      // Leave the DOM alone mid-composition (IME). Chromium sends the last input of a
      // composition still marked composing, so compositionend commits the text.
      if ((e.nativeEvent as InputEvent).isComposing) return;
      syncFromDom();
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      rest.onKeyDown?.(e);
      if (e.defaultPrevented) return;
      const node = el.current;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (mod && !e.altKey && (key === 'z' || (key === 'y' && e.ctrlKey))) {
        e.preventDefault();
        if (key === 'y' || e.shiftKey) travel(future, past);
        else travel(past, future);
        return;
      }
      const s = node && readSelection(node);
      if (!node || !s) return;
      const collapsed = s.start === s.end;
      const pattern = model.current.pattern;
      if (e.key === 'Enter') {
        e.preventDefault();
        const r = insertAt(value, s.start, s.end, '\n');
        edit(r.value, r.caret);
      } else if ((e.key === 'Backspace' || e.key === 'Delete') && collapsed) {
        const r = removeTokenAt(
          value,
          s.start,
          e.key === 'Backspace' ? 'back' : 'forward',
          pattern,
        );
        if (r) {
          e.preventDefault();
          edit(r.value, r.caret);
        }
      } else if (
        (e.key === 'ArrowLeft' || e.key === 'ArrowRight') &&
        collapsed &&
        !e.shiftKey &&
        !e.altKey &&
        !mod
      ) {
        const to = stepOver(value, s.start, e.key === 'ArrowLeft' ? 'back' : 'forward', pattern);
        if (to != null) {
          e.preventDefault();
          select(node, to);
          last.current = { start: to, end: to };
        }
      }
    };

    const insertPlain = (data: DataTransfer | null, at?: TokenFieldSelection | null) => {
      const text = (data?.getData('text/plain') ?? '').replace(/\r\n?/g, '\n');
      // Nothing to put in (an image, an empty clipboard): keep the selection as it is.
      if (!text) return;
      const node = el.current;
      const s = at ??
        (node && readSelection(node)) ??
        last.current ?? { start: value.length, end: value.length };
      const r = insertAt(value, s.start, s.end, text);
      edit(r.value, r.caret);
    };

    // The value offset under a drop point, or null where the browser can't say.
    const offsetAtPoint = (x: number, y: number): TokenFieldSelection | null => {
      const node = el.current;
      if (!node) return null;
      const doc = document as Document & {
        caretPositionFromPoint?: (
          x: number,
          y: number,
        ) => { offsetNode: Node; offset: number } | null;
        caretRangeFromPoint?: (x: number, y: number) => Range | null;
      };
      const pos = doc.caretPositionFromPoint?.(x, y);
      const range = pos ? null : doc.caretRangeFromPoint?.(x, y);
      const [container, offset] = pos
        ? [pos.offsetNode, pos.offset]
        : range
          ? [range.startContainer, range.startOffset]
          : [null, 0];
      if (!container || !node.contains(container)) return null;
      const at = snapOutOfToken(value, offsetOf(node, container, offset), model.current.pattern);
      return { start: at, end: at };
    };

    const hasError = Boolean(error);
    // FormField marks its control aria-invalid without an `error` prop: draw the same red border for it.
    const invalid = hasError || rest['aria-invalid'] === true || rest['aria-invalid'] === 'true';
    const labelId = label ? `${id}-label` : undefined;
    const errorTextId = hasError && errorMessage ? `${id}-error` : undefined;
    const helperTextId = helperText && !errorTextId ? `${id}-hint` : undefined;
    const describedBy =
      [rest['aria-describedby'], helperTextId, errorTextId].filter(Boolean).join(' ') || undefined;
    const state = disabled ? 'disabled' : hasError ? 'error' : 'default';

    return (
      <div className={cn('flex flex-col gap-scale-xs', FORM_CONTROL_WIDTH, className)}>
        {label && (
          // A contenteditable div is not labelable, so the label names it by id and focuses it on click.
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- named via aria-labelledby; the click is a pointer convenience, the field is in the tab order itself
          <label
            id={labelId}
            className="hds-type-ui text-foreground"
            onClick={() => el.current?.focus()}
          >
            {label}
          </label>
        )}
        <div
          {...rest}
          ref={el}
          id={id}
          role="textbox"
          aria-multiline="true"
          aria-labelledby={rest['aria-labelledby'] ?? labelId}
          aria-placeholder={placeholder}
          aria-describedby={describedBy}
          aria-errormessage={errorTextId}
          aria-invalid={invalid || undefined}
          aria-disabled={disabled || undefined}
          aria-required={required || undefined}
          data-hds-component="TokenField"
          data-state={state}
          data-placeholder={placeholder}
          data-empty={value ? undefined : ''}
          contentEditable={!disabled}
          suppressContentEditableWarning
          spellCheck
          tabIndex={disabled ? -1 : 0}
          className={cn(
            'block w-full overflow-y-auto whitespace-pre-wrap break-words rounded-md border bg-background px-fixed-xs py-scale-xs hds-type-ui text-foreground ring-offset-background transition-colors cursor-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[empty]:before:pointer-events-none data-[empty]:before:text-muted-foreground data-[empty]:before:content-[attr(data-placeholder)] data-[state=disabled]:cursor-not-allowed data-[state=disabled]:bg-muted data-[state=disabled]:text-[var(--semantic-color-content-disabled)]',
            invalid ? 'border-destructive focus-visible:ring-destructive' : 'border-input',
            fieldClassName,
          )}
          style={{ minHeight: `calc(${rows}lh + var(--semantic-space-scale-sm))`, ...style }}
          onFocus={onFocus}
          onInput={onInput}
          onKeyDown={onKeyDown}
          onPaste={(e) => {
            e.preventDefault();
            insertPlain(e.clipboardData);
          }}
          onDrop={(e) => {
            e.preventDefault();
            insertPlain(e.dataTransfer, offsetAtPoint(e.clientX, e.clientY));
          }}
          onCompositionEnd={syncFromDom}
        />
        {name && <input type="hidden" name={name} value={value} />}
        {helperTextId && (
          <span id={helperTextId} className="hds-type-caption text-muted-foreground">
            {helperText}
          </span>
        )}
        {hasError && errorMessage && (
          <span id={errorTextId} role="alert" className="hds-type-caption text-destructive">
            {errorMessage}
          </span>
        )}
      </div>
    );
  },
);
