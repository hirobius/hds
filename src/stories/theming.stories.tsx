/**
 * Multi-stack theming — makes the token-pipeline work visible in Storybook.
 *
 * Demonstrates single-seed brand theming (createBrandTheme): one hue+chroma seed
 * derives an AA-safe accent ramp, and live HDS components re-skin from it via the
 * CSS-var cascade (bg-primary → --role-primary → --semantic-color-surface-accent,
 * which the seed overrides). No foreground inversion; on-accent ink stays white.
 *
 * The same token layer also feeds the MUI (`hdsMuiThemeOptions`) and Tailwind
 * (`hdsTailwindPreset`) presets — see scripts/tokens-sd/presets.
 */
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { Button } from "../app/components/button";
// Story files are excluded from `pnpm typecheck` (tsconfig.typecheck.json) and
// transpiled by Storybook/Vite, so importing the pure .mjs helper is safe.
import { createBrandTheme } from "../../scripts/tokens-sd/brand.mjs";

type Args = { hue: number; chroma: number };

const SWATCHES: Array<[string, string]> = [
  ["rest", "--semantic-accent-rest"],
  ["hover", "--semantic-accent-hover"],
  ["pressed", "--semantic-accent-pressed"],
  ["subtle", "--semantic-accent-subtle"],
];

function Swatches({ vars }: { vars: Record<string, string> }) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      {SWATCHES.map(([label, key]) => (
        <div key={key} style={{ textAlign: "center", fontSize: 12 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 8,
              background: vars[key],
              border: "1px solid var(--semantic-color-border-default)",
            }}
          />
          <div style={{ marginTop: 4, color: "var(--semantic-color-content-secondary)" }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

function Badge({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 999,
        color: ok ? "#FFFFFF" : "#FFFFFF",
        background: ok ? "var(--semantic-color-feedback-success)" : "var(--semantic-color-feedback-error)",
      }}
    >
      {children}
    </span>
  );
}

function SeedPanel({ hue, chroma }: Args) {
  const t = createBrandTheme({ hue, chroma });
  const aa = t.report.whiteOnAccent >= 4.5;
  return (
    <section style={{ display: "grid", gap: 16, maxWidth: 720 }}>
      {/* Live re-skin: these HDS components inherit the seed vars via the cascade. */}
      <div
        style={{ ...(t.vars as React.CSSProperties), display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}
      >
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <a href="#" className="hds-link" style={{ fontSize: 14 }}>
          Accent link
        </a>
      </div>

      <Swatches vars={t.vars} />

      <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 13 }}>
        <Badge ok={aa}>{aa ? "AA ✓" : "AA ✗"}</Badge>
        <span style={{ color: "var(--semantic-color-content-secondary)" }}>
          white-on-accent {t.report.whiteOnAccent}:1 · accent-on-white {t.report.accentOnWhite}:1 · ink {t.report.ink} ·
          restL {t.report.restL} · rest {t.resolved.rest}
        </span>
      </div>

      <pre
        style={{
          background: "var(--semantic-color-surface-raised)",
          border: "1px solid var(--semantic-color-border-default)",
          borderRadius: 8,
          padding: 12,
          fontSize: 12,
          overflowX: "auto",
          margin: 0,
        }}
      >
        {t.css}
      </pre>
    </section>
  );
}

const meta = {
  title: "Foundations/Multi-stack theming",
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "One brand seed (hue + chroma) → an AA-safe accent ramp, derived from the white-on-accent contrast contract per hue. Live HDS components re-skin via the CSS-var cascade. The same tokens feed the MUI and Tailwind presets.",
      },
    },
  },
} satisfies Meta<Args>;

export default meta;

/** Interactive: drag hue/chroma and watch the components + contrast update. */
export const BrandSeed: StoryObj<Args> = {
  args: { hue: 165.2, chroma: 0.14 },
  argTypes: {
    hue: { control: { type: "range", min: 0, max: 360, step: 1 } },
    chroma: { control: { type: "range", min: 0, max: 0.37, step: 0.005 } },
  },
  render: (args) => <SeedPanel {...args} />,
};

/** A fixed gallery — every seed lands AA with no foreground inversion. */
export const PresetGallery: StoryObj = {
  render: () => {
    const seeds: Array<[string, Args]> = [
      ["Jade", { hue: 165.2, chroma: 0.14 }],
      ["Violet", { hue: 300, chroma: 0.13 }],
      ["Teal", { hue: 195, chroma: 0.1 }],
      ["Crimson", { hue: 20, chroma: 0.18 }],
    ];
    return (
      <div style={{ display: "grid", gap: 40 }}>
        {seeds.map(([name, seed]) => (
          <div key={name} style={{ display: "grid", gap: 12 }}>
            <h3 style={{ margin: 0 }}>{name}</h3>
            <SeedPanel {...seed} />
          </div>
        ))}
      </div>
    );
  },
};
