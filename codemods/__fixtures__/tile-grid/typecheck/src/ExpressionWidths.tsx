import { TileGrid } from '@hirobius/design-system';

declare const n: number;
declare const c: boolean;
declare const d: boolean;
declare const k: string;
declare const w: string | undefined;
declare const theme: { tile?: string } | undefined;
declare const sizes: Record<string, string | undefined>;
declare function width(key: string): string | undefined;
declare function css(text: TemplateStringsArray): string | undefined;

// Never undefined, so TileGrid never fell back to 260px: written through as is.
export const Literal = () => (
  <TileGrid minTileWidth={'280px'}>
    <i />
  </TileGrid>
);
export const Parenthesized = () => (
  <TileGrid minTileWidth={("280px")}>
    <i />
  </TileGrid>
);
export const Template = () => (
  <TileGrid minTileWidth={`${n}px`}>
    <i />
  </TileGrid>
);
export const NestedTemplate = () => (
  <TileGrid minTileWidth={`${c ? `${n}px` : '1px'}`}>
    <i />
  </TileGrid>
);
export const LiteralBranches = () => (
  <TileGrid minTileWidth={c ? '200px' : '300px'}>
    <i />
  </TileGrid>
);
export const NestedLiteralBranches = () => (
  <TileGrid minTileWidth={c ? (d ? `${n}px` : '1px') : '300px'}>
    <i />
  </TileGrid>
);
export const Commented = () => (
  <TileGrid minTileWidth={/* wide */ '280px'}>
    <i />
  </TileGrid>
);
export const NullishFallbackToLiteral = () => (
  <TileGrid minTileWidth={w ?? '200px'}>
    <i />
  </TileGrid>
);
export const CastTest = () => (
  <TileGrid minTileWidth={w as unknown as boolean ? '200px' : '300px'}>
    <i />
  </TileGrid>
);

// Can be undefined, so the rewrite keeps TileGrid's 260px fallback.
export const Identifier = () => (
  <TileGrid minTileWidth={w}>
    <i />
  </TileGrid>
);
export const OptionalChain = () => (
  <TileGrid minTileWidth={theme?.tile}>
    <i />
  </TileGrid>
);
export const Call = () => (
  <TileGrid minTileWidth={width('tile')}>
    <i />
  </TileGrid>
);
export const ElementAccess = () => (
  <TileGrid minTileWidth={sizes[k]}>
    <i />
  </TileGrid>
);
export const NullishFallbackToName = () => (
  <TileGrid minTileWidth={w ?? theme?.tile}>
    <i />
  </TileGrid>
);
export const NullableBranch = () => (
  <TileGrid minTileWidth={c ? w : '300px'}>
    <i />
  </TileGrid>
);
export const UndefinedBranch = () => (
  <TileGrid minTileWidth={c ? undefined : '300px'}>
    <i />
  </TileGrid>
);
export const ComparedTest = () => (
  <TileGrid minTileWidth={n >= 4 ? w : '300px'}>
    <i />
  </TileGrid>
);
export const TaggedTemplate = () => (
  <TileGrid minTileWidth={css`1px`}>
    <i />
  </TileGrid>
);
