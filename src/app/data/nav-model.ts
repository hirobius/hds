/**
 * nav-model — typed access to the generated docs navigation model.
 *
 * Phase 1 of ADR-017. `nav-model.json` is produced by
 * `scripts/generate-nav-model.mjs` (run `pnpm nav:generate`) and is the single
 * derived source the sidebar, Cmd-K search, breadcrumb, and pager will read in
 * later phases. Nothing consumes it yet — this module just exposes it typed.
 *
 * `HdsPageMeta` is the contract a docs page will export in the next phase
 * (colocated `meta`); the generator will switch its source to those exports
 * while keeping this model's shape unchanged.
 */
import navModelData from './nav-model.json';

/** Per-page navigation metadata a docs page module exports (Phase 2 target). */
export interface HdsPageMeta {
  /** Canonical, root-relative route (no `/hds/` prefix). */
  path: string;
  /** Human label shown in the sidebar / search / breadcrumb. */
  title: string;
  /** Sidebar section heading this page groups under. */
  section: string;
  /** Sort order within the section. */
  order: number;
  /** Lifecycle status — drives a metadata slot, never a decorative badge. */
  status?: 'stable' | 'beta' | 'draft' | 'internal';
}

/** A single sidebar link in the derived model. */
export interface NavLink {
  path: string;
  label: string;
  /** Match this route exactly (not by prefix) for active state. */
  exact?: boolean;
  /** Render with sub-item indentation. */
  indent?: boolean;
}

/** A labelled group of sidebar links. */
export interface NavSection {
  label: string;
  items: NavLink[];
}

/** The full derived navigation model. */
export interface NavModel {
  /** Generator provenance marker. */
  $generated?: string;
  sections: NavSection[];
}

/** The generated docs navigation model (see `scripts/generate-nav-model.mjs`). */
export const navModel = navModelData as NavModel;
