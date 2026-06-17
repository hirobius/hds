/** @internal — utility-tier component; not part of @hirobius/design-system public API. */
// ─── Types ────────────────────────────────────────────────────────────────────

type ImageProp = {
  src: string; 
  alt?: string;
  caption?: string;
  /** Short descriptive sentence shown below the image in the lightbox */
  description?: string;
};

export type PortfolioItem = {
  id: number;
  /**
   * 'component' — src is treated as a panel key (e.g. 'hds-type-scale').
   * Rendered inline in the scroll strip; no lightbox interaction.
   */
  type: 'image' | 'video' | 'component';
  src: string;
  title: string;
  description: string;
  alt?: string;
  /** Explicit pixel dimensions — used as fallback sizing when the file doesn't exist yet */
  width?: number;
  height?: number;
  detailImages?: ImageProp[];
  detailText?: string;
};

export type ProjectData = {
  name: string;
  description: string;
  metrics: Array<{ bold: string; light: string }>;
  items: PortfolioItem[];
  year?: string;
};

type _HandleState = 'idle' | 'stretching' | 'snapping' | 'hidden';
