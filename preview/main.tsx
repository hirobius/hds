import React, { useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
// Imported per-file rather than through src/index.ts: the barrel pulls
// command-palette, which needs the `virtual:hds-manifest` plugin from the main
// vite config. These are the same modules the barrel re-exports.
import { Button } from '../src/app/components/button';
import { Input } from '../src/app/components/input';
import { Textarea } from '../src/app/components/textarea';
import { HdsSelect } from '../src/app/components/select';
import { HdsCheckbox } from '../src/app/components/checkbox';
import { HdsRadio } from '../src/app/components/radio';
import { HdsToggle } from '../src/app/components/toggle';
import { SegmentedControl } from '../src/app/components/segmented-control';
import { Badge } from '../src/app/components/badge';
import { Card } from '../src/app/components/card';
import { Alert } from '../src/app/components/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../src/app/components/tabs';
import { Progress } from '../src/app/components/progress';
import { Avatar } from '../src/app/components/avatar';
import { Tag } from '../src/app/components/tag';
import { Divider } from '../src/app/components/divider';
import { Stack } from '../src/app/components/stack';
import { Surface } from '../src/app/components/surface';
import '../src/styles/index.css';
import './preview.css';

/* ── contrast helpers — the preview reports the same numbers the audit does ── */
const srgb = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]: number[]) =>
  0.2126 * srgb(r / 255) + 0.7152 * srgb(g / 255) + 0.0722 * srgb(b / 255);
function parseRgb(v: string) {
  const m = String(v).match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1]
    .split(/[,/\s]+/)
    .filter(Boolean)
    .map(Number);
  if (p.length < 3 || p.slice(0, 3).some(Number.isNaN)) return null;
  return { rgb: p.slice(0, 3), a: p.length > 3 ? p[3] : 1 };
}
function contrast(fg: string, bg: string) {
  const f = parseRgb(fg),
    b = parseRgb(bg);
  if (!f || !b || f.a === 0) return null;
  const c = f.rgb.map((x, i) => x * f.a + b.rgb[i] * (1 - f.a));
  const [hi, lo] = [lum(c), lum(b.rgb)].sort((x, y) => y - x);
  return Number(((hi + 0.05) / (lo + 0.05)).toFixed(2));
}

type Knobs = {
  theme: 'light' | 'dark';
  density: 'comfortable' | 'compact';
  brand: string;
  radius: number | null;
};

/* ── live measurement: reads the DOM, not the source ─────────────────────── */
function useMeasurements(hostRef: React.RefObject<HTMLElement>, knobs: Knobs) {
  const [m, setM] = useState<Record<string, string>>({});
  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => {
      const host = hostRef.current;
      if (!host) return;
      const cs = getComputedStyle(host);
      const pick = (sel: string) => host.querySelector(sel) as HTMLElement | null;
      const btn = pick('[data-probe="button"] button');
      const inp = pick('[data-probe="input"] input');
      const card = pick('[data-probe="card"] > *');
      const page =
        cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)'
          ? cs.backgroundColor
          : 'rgb(255,255,255)';
      const out: Record<string, string> = {
        '--role-radius': cs.getPropertyValue('--role-radius').trim() || '—',
        '--semantic-radius-action': cs.getPropertyValue('--semantic-radius-action').trim() || '—',
        'button radius': btn ? getComputedStyle(btn).borderRadius : '—',
        'input radius': inp ? getComputedStyle(inp).borderRadius : '—',
        'card radius': card ? getComputedStyle(card).borderRadius : '—',
        'button height': btn ? `${Math.round(btn.getBoundingClientRect().height)}px` : '—',
        'input height': inp ? `${Math.round(inp.getBoundingClientRect().height)}px` : '—',
        'body size/weight': `${cs.fontSize} / ${cs.fontWeight}`,
      };
      if (inp) {
        const ics = getComputedStyle(inp);
        const ratio = contrast(ics.borderTopColor, page);
        out['input border'] = ics.borderTopColor;
        out['border contrast'] =
          ratio === null ? '—' : `${ratio}:1${ratio < 3 ? '  ⚠ below 3:1' : '  ✓'}`;
      }
      setM(out);
    });
    return () => cancelAnimationFrame(id);
  }, [knobs.theme, knobs.density, knobs.brand, knobs.radius, hostRef]);
  return m;
}

const BRANDS = [
  { value: '', label: 'default' },
  { value: 'brutalist-demo', label: 'brutalist' },
  { value: 'concrete-creations', label: 'concrete' },
  { value: 'accent-lilac', label: 'lilac' },
];

function App() {
  const [k, setK] = useState<Knobs>({
    theme: 'light',
    density: 'comfortable',
    brand: '',
    radius: null,
  });
  const [check, setCheck] = useState(true);
  const [radio, setRadio] = useState(true);
  const [toggle, setToggle] = useState(true);
  const [seg, setSeg] = useState('list');
  const [sel, setSel] = useState('react');
  const hostRef = useRef<HTMLDivElement>(null);
  const m = useMeasurements(hostRef, k);

  // The knobs are attributes + one custom property. Nothing else.
  const hostStyle: React.CSSProperties =
    k.radius === null ? {} : ({ ['--role-radius' as any]: `${k.radius}px` } as React.CSSProperties);

  return (
    <div className="pv">
      <header className="pv-head">
        <div>
          <p className="pv-eyebrow">Hirobius Design System · live preview</p>
          <h1>Turn the knobs.</h1>
          <p className="pv-lede">
            Real components from <code>src/index.ts</code>, not a mockup. Every control below reacts
            to the four dials — and the readout is measured from the rendered DOM, so it is the same
            number a browser would report.
          </p>
        </div>
      </header>

      <div className="pv-rail">
        <label>
          theme
          <select
            value={k.theme}
            onChange={(e) => setK({ ...k, theme: e.target.value as Knobs['theme'] })}
          >
            <option value="light">light</option>
            <option value="dark">dark</option>
          </select>
        </label>
        <label>
          density
          <select
            value={k.density}
            onChange={(e) => setK({ ...k, density: e.target.value as Knobs['density'] })}
          >
            <option value="comfortable">comfortable</option>
            <option value="compact">compact</option>
          </select>
        </label>
        <label>
          brand
          <select value={k.brand} onChange={(e) => setK({ ...k, brand: e.target.value })}>
            {BRANDS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </label>
        <label className="pv-slider">
          radius
          <input
            type="range"
            min={0}
            max={20}
            step={1}
            value={k.radius ?? 8}
            onChange={(e) => setK({ ...k, radius: Number(e.target.value) })}
          />
          <span className="pv-val">{k.radius === null ? 'token' : `${k.radius}px`}</span>
          {k.radius !== null && (
            <button type="button" className="pv-reset" onClick={() => setK({ ...k, radius: null })}>
              reset
            </button>
          )}
        </label>
      </div>

      <div className="pv-body">
        <div
          ref={hostRef}
          data-hds
          data-theme={k.theme}
          data-density={k.density}
          {...(k.brand ? { 'data-brand': k.brand } : {})}
          style={hostStyle}
          className="pv-stage"
        >
          <Section title="Actions">
            <div data-probe="button" className="pv-row">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="tertiary">Tertiary</Button>
              <Button variant="primary" tone="danger">
                Danger
              </Button>
            </div>
          </Section>

          <Section title="Inputs">
            <div data-probe="input" className="pv-grid2">
              <Input label="Email address" placeholder="you@example.com" />
              <HdsSelect
                label="Framework"
                value={sel}
                onChange={setSel}
                options={[
                  { value: 'react', label: 'React' },
                  { value: 'astro', label: 'Astro' },
                ]}
              />
            </div>
            <Textarea label="Project brief" placeholder="Describe the work…" />
            <div className="pv-row">
              <HdsCheckbox label="Include archived" checked={check} onChange={setCheck} />
              <HdsRadio label="Dark mode" checked={radio} onChange={setRadio} />
              <HdsToggle label="Notifications" checked={toggle} onChange={setToggle} />
            </div>
            <SegmentedControl
              label="View"
              value={seg}
              onChange={setSeg}
              options={[
                { value: 'list', label: 'List' },
                { value: 'grid', label: 'Grid' },
                { value: 'board', label: 'Board' },
              ]}
            />
          </Section>

          <Section title="Display">
            <div data-probe="card">
              <Card>
                <Stack gap="tight">
                  <strong>Card</strong>
                  <span>Containers sit one radius step above actions.</span>
                </Stack>
              </Card>
            </div>
            <div className="pv-row">
              <Badge>Neutral</Badge>
              <Badge tone="info">Info</Badge>
              <Badge tone="success">Success</Badge>
              <Badge tone="danger">Danger</Badge>
              <Tag>Tag</Tag>
              <Avatar alt="Adrian" initials="AH" />
            </div>
            <Progress value={62} label="Build" />
            <Divider />
            <Surface>
              <span>Surface — the raised elevation role.</span>
            </Surface>
          </Section>

          <Section title="Feedback">
            <Alert tone="info" title="Info">
              One accent, used once.
            </Alert>
            <Alert tone="success" title="Success">
              Feedback hues are never decorative.
            </Alert>
            <Alert tone="warning" title="Warning">
              Depth is border or shadow, not both.
            </Alert>
            <Alert tone="danger" title="Error">
              Contrast is measured, not assumed.
            </Alert>
          </Section>

          <Section title="Navigation">
            <Tabs defaultValue="one">
              <TabsList>
                <TabsTrigger value="one">Overview</TabsTrigger>
                <TabsTrigger value="two">Tokens</TabsTrigger>
                <TabsTrigger value="three">Usage</TabsTrigger>
              </TabsList>
              <TabsContent value="one">Tabs carry the container radius.</TabsContent>
              <TabsContent value="two">Every value here is a token.</TabsContent>
              <TabsContent value="three">Nothing hardcoded.</TabsContent>
            </Tabs>
          </Section>
        </div>

        <aside className="pv-measure">
          <p className="pv-eyebrow">Measured from the DOM</p>
          <dl>
            {Object.entries(m).map(([kk, vv]) => (
              <React.Fragment key={kk}>
                <dt>{kk}</dt>
                <dd
                  className={
                    String(vv).includes('⚠') ? 'warn' : String(vv).includes('✓') ? 'ok' : ''
                  }
                >
                  {vv}
                </dd>
              </React.Fragment>
            ))}
          </dl>
          <p className="pv-foot">
            Set <code>brand</code> to <em>brutalist</em>: one token override (
            <code>role.radius: 0</code>) squares every control. That is the knob working.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="pv-sec">
      <h2>{title}</h2>
      <div className="pv-sec-body">{children}</div>
    </section>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
