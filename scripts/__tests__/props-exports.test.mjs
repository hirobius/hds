/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * Tests for the props-export rule (scripts/lib/props-exports.mjs).
 *
 * WHY THIS EXISTS
 * ───────────────
 * `src/index.ts` is `export *` from every public component module, so a props
 * type is part of the published API iff the module exports it. 49 of them were
 * not exported — which means a consumer who writes the single most ordinary
 * thing in React,
 *
 *   const Wrapped = (props: AlertProps) => <Alert {...props} />;
 *
 * could not name the type, and had to reach for `React.ComponentProps<typeof
 * Alert>` or restate the shape by hand. `tsc` never complains: the component
 * still type-checks here, because here the type is in scope.
 *
 * THE RULE IS NOT "ANYTHING ENDING IN Props"
 * ──────────────────────────────────────────
 * That would export composition helpers that are deliberately private —
 * `TokenBaseProps` (an arm of a union), `NavNativeProps` (an
 * `Omit<AnchorHTMLAttributes…>` base), `WiredChildProps` (a cast target), and
 * the 33 `VariantProps<typeof xVariants>` cva aliases that `button.tsx`
 * establishes as internal:
 *
 *   type ButtonVariantProps = VariantProps<typeof buttonVariants>;  // private
 *   export interface ButtonProps ...                               // public
 *
 * The rule is *reachability*: a locally-declared type must be exported iff it
 * annotates the props of a component this module exports. Nothing else
 * changes, in either direction.
 */

import { describe, it, expect } from 'vitest';

import { violationsInSource } from '../lib/props-exports.mjs';

const names = (src) => violationsInSource(src, 'test.tsx').map((v) => v.type);

describe('violationsInSource — what the rule catches', () => {
  it('flags an unexported interface annotating an exported function component', () => {
    expect(
      names(`
        interface AlertProps { title: string }
        export function Alert({ title }: AlertProps) { return null; }
      `),
    ).toEqual(['AlertProps']);
  });

  it('flags an unexported type alias, not just an interface', () => {
    expect(
      names(`
        type InlineCodeProps = { children: React.ReactNode };
        export function InlineCode(props: InlineCodeProps) { return null; }
      `),
    ).toEqual(['InlineCodeProps']);
  });

  it('flags the props of an exported arrow component', () => {
    expect(
      names(`
        interface CenterProps { max?: string }
        export const Center = ({ max }: CenterProps) => null;
      `),
    ).toEqual(['CenterProps']);
  });

  it('flags the props of a forwardRef component, read off the second type argument', () => {
    expect(
      names(`
        interface InputProps { value: string }
        export const Input = React.forwardRef<HTMLInputElement, InputProps>((props, ref) => null);
      `),
    ).toEqual(['InputProps']);
  });

  it('flags the props of a React.FC-annotated component', () => {
    expect(
      names(`
        type PageProps = { title: string };
        export const Page: React.FC<PageProps> = () => null;
      `),
    ).toEqual(['PageProps']);
  });

  it('reports every offending component in a module, not just the first', () => {
    expect(
      names(`
        interface CardProps { a: string }
        interface CardHeaderProps { b: string }
        export function Card(p: CardProps) { return null; }
        export function CardHeader(p: CardHeaderProps) { return null; }
      `),
    ).toEqual(['CardProps', 'CardHeaderProps']);
  });
});

describe('violationsInSource — the export forms this codebase actually uses', () => {
  it('flags a component exported by a trailing `export { … }` statement', () => {
    // card.tsx declares CardHeader as a bare const and exports seven
    // sub-components together at the bottom. The props are just as public.
    expect(
      names(`
        interface CardHeaderProps { compact?: boolean }
        const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>((p, ref) => null);
        export { CardHeader };
      `),
    ).toEqual(['CardHeaderProps']);
  });

  it('follows Object.assign through to the inner component — the compound pattern', () => {
    // grid.tsx: `export const Grid = Object.assign(GridInner, { Item: GridItem })`.
    // Both GridProps and GridItemProps reach a consumer through `Grid`.
    expect(
      names(`
        interface GridProps { cols?: number }
        interface GridItemProps { span?: number }
        const GridItem = React.forwardRef<HTMLDivElement, GridItemProps>((p, ref) => null);
        const GridInner = React.forwardRef<HTMLDivElement, GridProps>((p, ref) => null);
        export const Grid = Object.assign(GridInner, { Item: GridItem });
      `),
    ).toEqual(['GridProps', 'GridItemProps']);
  });

  it('flags the props of an exported class component', () => {
    // error-boundary.tsx — the one class in the package.
    expect(
      names(`
        interface ErrorBoundaryProps { fallback?: React.ReactNode }
        interface ErrorBoundaryState { error: Error | null }
        export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
          render() { return null; }
        }
      `),
    ).toEqual(['ErrorBoundaryProps']);
  });

  it('does not treat the class STATE type as props — it is the second argument', () => {
    expect(
      names(`
        export interface ErrorBoundaryProps { fallback?: React.ReactNode }
        interface ErrorBoundaryState { error: Error | null }
        export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
          render() { return null; }
        }
      `),
    ).toEqual([]);
  });

  it('leaves an inner component private when nothing re-exports it', () => {
    // The Object.assign rule must not mark every local forwardRef as public.
    expect(
      names(`
        interface HiddenProps { a?: string }
        const Hidden = React.forwardRef<HTMLDivElement, HiddenProps>((p, ref) => null);
        export function Other() { return null; }
      `),
    ).toEqual([]);
  });
});

describe('violationsInSource — what the rule deliberately leaves alone', () => {
  it('passes an already-exported props type', () => {
    expect(
      names(`
        export interface ButtonProps { variant?: string }
        export function Button(p: ButtonProps) { return null; }
      `),
    ).toEqual([]);
  });

  it('leaves a cva VariantProps alias private — button.tsx sets that convention', () => {
    expect(
      names(`
        type ButtonVariantProps = VariantProps<typeof buttonVariants>;
        export interface ButtonProps extends ButtonVariantProps { asChild?: boolean }
        export function Button(p: ButtonProps) { return null; }
      `),
    ).toEqual([]);
  });

  it('leaves a base type private when only the exported type extends it', () => {
    // nav-item.tsx: NavNativeProps is an Omit<> base for NavProps. A consumer
    // reads the whole shape through NavProps; naming the base buys nothing.
    expect(
      names(`
        type NavNativeProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children'>;
        export interface NavProps extends NavNativeProps { active?: boolean }
        export function Nav(p: NavProps) { return null; }
      `),
    ).toEqual([]);
  });

  it('leaves a cast target private — form.tsx WiredChildProps annotates no component', () => {
    expect(
      names(`
        type WiredChildProps = { name?: string };
        export function Form({ children }) {
          const child = React.Children.only(children) as React.ReactElement<WiredChildProps>;
          return child;
        }
      `),
    ).toEqual([]);
  });

  it('leaves the props of an UNexported component private', () => {
    // An internal sub-component is not API, so neither is its props type.
    expect(
      names(`
        type TokenShellProps = { children: React.ReactNode };
        function TokenShell(p: TokenShellProps) { return null; }
        export function Token() { return TokenShell({ children: null }); }
      `),
    ).toEqual([]);
  });

  it('ignores an imported props type, which this module cannot export anyway', () => {
    expect(
      names(`
        import type { ButtonProps } from './button';
        export function LinkButton(p: ButtonProps) { return null; }
      `),
    ).toEqual([]);
  });

  it('ignores an inline object type — there is no name to export', () => {
    expect(names(`export function Box(p: { as?: string }) { return null; }`)).toEqual([]);
  });

  it('ignores a plain HTML attributes annotation from React', () => {
    expect(
      names(`export function Span(p: React.HTMLAttributes<HTMLSpanElement>) { return null; }`),
    ).toEqual([]);
  });
});

describe('violationsInSource — the reported violation', () => {
  it('names the file and the component, so the fix needs no search', () => {
    const [v] = violationsInSource(
      `interface AlertProps { t: string }\nexport function Alert(p: AlertProps) { return null; }`,
      'src/app/components/alert.tsx',
    );
    expect(v).toMatchObject({
      file: 'src/app/components/alert.tsx',
      component: 'Alert',
      type: 'AlertProps',
    });
    expect(v.line).toBeGreaterThan(0);
  });
});
