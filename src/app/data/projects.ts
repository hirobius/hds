import { PortfolioItem, ProjectData } from '../components/types';

// ─── Slug utilities ───────────────────────────────────────────────────────────

export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// ─── Asset path conventions ───────────────────────────────────────────────────
// Hero thumbnails:  /public/assets/<project>/<slide-id>.jpg
// L2 detail shots:  /public/assets/<project>/<slide-id>/<nn>.jpg
//
// Drop any image file and Vite serves it immediately — no rebuild needed.
// Match the filename exactly as listed in the src strings below.

// ─── Card 1: Xbox Design System ───────────────────────────────────────────────

const xdsItems: PortfolioItem[] = [
  {
    id: 1,
    type: 'image',
    src: '/assets/xds/xds-1.jpg',
    title: 'Figma Migration',
    description: 'Hundreds of Sketch components → ~50 core Figma components.',
    alt: 'XDS Figma Migration — before/after',
    width: 1600,
    height: 900,
    detailText:
      "Led the first large-scale Figma migration for one of the world's largest gaming platforms. Reduced the component surface area by 75%+ while increasing system coherence — establishing the Figma file architecture still in use today.",
    detailImages: [
      {
        src: '/assets/xds/xds-1/01.jpg',
        alt: 'Figma library structure',
        caption: 'Post-migration library',
        description:
          'The ~50 core component set organized by type — replacing hundreds of inconsistent Sketch artboards.',
      },
      {
        src: '/assets/xds/xds-1/02.jpg',
        alt: 'Component consolidation diagram',
        caption: 'Reduction logic',
        description:
          'How categories of Sketch components were audited, merged, or deprecated to reach the lean Figma library.',
      },
    ],
  },
  {
    id: 2,
    type: 'image',
    src: '/assets/xds/xds-2.jpg',
    title: 'Token Architecture',
    description: 'Three layers. Every color decision traces to a named token.',
    alt: 'XDS Token Architecture — 3-layer cascade',
    width: 1600,
    height: 900,
    detailText:
      'A three-layer token cascade governs every color in the system: System Aliases (sysGray100, sysGray26…) → Semantic Tokens (Content.Primary, Background.Container…) → Opacity Variants (sysGray100 @ 80%, 65%, 50%, 40%). No raw hex values in component specs.',
    detailImages: [
      {
        src: '/assets/xds/xds-2/01.jpg',
        alt: 'Token cascade diagram',
        caption: 'Three-tier cascade',
        description:
          'System Aliases → Semantic Tokens → Opacity Variants — each layer with a defined owner and update cadence.',
      },
      {
        src: '/assets/xds/xds-2/02.jpg',
        alt: 'Token swatch rows',
        caption: 'Swatch comparison',
        description:
          'Token name / swatch / hex documentation format used across the full XDS color system.',
      },
      {
        src: '/assets/xds/xds-2/03.jpg',
        alt: 'Dark and light token resolution',
        caption: 'Dark · Light theme split',
        description:
          'The same semantic tokens resolving to different values across dark and light themes.',
      },
    ],
  },
  {
    id: 3,
    type: 'image',
    src: '/assets/xds/xds-3.jpg',
    title: 'Typography System',
    description: 'Same token. Different distance.',
    alt: 'XDS Typography — Mobile / Desktop / TV type ramps',
    width: 1600,
    height: 900,
    detailText:
      'Three platform-specific type ramps — Mobile, Desktop, TV — sharing the same token names but resolving to radically different sizes. Display 1 is 40px on mobile, 48px on desktop, and 128px on TV. One spec. Three distances.',
    detailImages: [
      {
        src: '/assets/xds/xds-3/01.jpg',
        alt: 'Mobile type ramp',
        caption: 'Mobile ramp',
        description:
          'Display 1 (40px) through Body (14px) — the full 18-style ramp at mobile scale.',
      },
      {
        src: '/assets/xds/xds-3/02.jpg',
        alt: 'Desktop type ramp',
        caption: 'Desktop ramp',
        description:
          'Display 1 (48px) through Body (14px) — the same token names, different resolved sizes.',
      },
      {
        src: '/assets/xds/xds-3/03.jpg',
        alt: 'TV type ramp',
        caption: 'TV ramp (10-foot UI)',
        description:
          'Display 1 at 128px — Bahnschrift for the large scale, reading from across the room.',
      },
      {
        src: '/assets/xds/xds-3/04.jpg',
        alt: 'Typography governance rules',
        caption: 'Usage rules',
        description:
          '"Display 1: rarely used. Section 1/2/3: page titles only, never in components." Documented governance per style.',
      },
    ],
  },
  {
    id: 4,
    type: 'image',
    src: '/assets/xds/xds-4.jpg',
    title: 'User Accent Colors',
    description:
      "The system doesn't have one brand color. It has thirteen — and adapts to whichever one the player chose.",
    alt: 'XDS User Accent Color System — 13 colors',
    width: 1600,
    height: 900,
    detailText:
      'Xbox players choose their accent color — the design system adapts to all 13 options. Each color ships with AccentLight1, Accent, and AccentLight2 variants. ABXY controller button colors are semantic tokens: A=Green, B=Red, X=Blue, Y=Yellow. Only Xbox would have controller buttons as named tokens.',
    detailImages: [
      {
        src: '/assets/xds/xds-4/01.jpg',
        alt: '13-color accent grid',
        caption: '13 user accent colors',
        description:
          'Green (Xbox Green) Â· Red Â· Blue Â· Yellow Â· Orange Â· Indigo Â· Violet Â· Pink Â· Crimson Â· Teal Â· Steel Â· Slate Â· Gray — each with 3 variants.',
      },
      {
        src: '/assets/xds/xds-4/02.jpg',
        alt: 'ABXY controller tokens',
        caption: 'Controller button tokens',
        description:
          'A=Green Â· B=Red Â· X=Blue Â· Y=Yellow — semantic tokens for console-specific UI patterns.',
      },
      {
        src: '/assets/xds/xds-4/03.jpg',
        alt: 'Interaction state set',
        caption: 'Interaction states',
        description:
          'Rest Â· Hover Â· Press Â· Focus Â· Focus+Hover Â· Focus+Press Â· Inactive Â· Selected Â· Border — per accent color.',
      },
    ],
  },
  {
    id: 5,
    type: 'image',
    src: '/assets/xds/xds-5.jpg',
    title: 'Annotation System',
    description: 'Every property is a named contract.',
    alt: 'XDS Component Annotation — Button with token layer',
    width: 1600,
    height: 900,
    detailText:
      "Every component spec includes a token annotation layer — not just what the values are, but what they're named and why. The XDS Button annotation maps Typography, Fill, Padding, Border Radius, Border Color, and Border Width each to a specific named token. Annotations are the handoff.",
    detailImages: [
      {
        src: '/assets/xds/xds-5/01.jpg',
        alt: 'Button token annotation',
        caption: 'Button anatomy',
        description:
          'Typography (ButtonCTA) · Fill (sysGray100) · Padding (space.s/m) · Border Radius (borderRadius.s) · Border (Green.49, borderWidth.xs).',
      },
    ],
  },
  {
    id: 6,
    type: 'image',
    src: '/assets/xds/xds-6.jpg',
    title: 'Color & Accessibility',
    description: 'Three themes. Every component. Accessibility built in, not bolted on.',
    alt: 'XDS Color Documentation — Dark / Light / High Contrast',
    width: 1600,
    height: 900,
    detailText:
      'Full color documentation across Dark, Light, and High Contrast Dark themes — with LCH values, 4.5:1 contrast ratios verified, and every state variant documented. Accessibility was documented during component design, not after.',
    detailImages: [
      {
        src: '/assets/xds/xds-6/01.jpg',
        alt: 'Three-theme component comparison',
        caption: 'Dark Â· Light Â· High Contrast',
        description:
          'The same component at all three theme states — verified against WCAG contrast requirements.',
      },
      {
        src: '/assets/xds/xds-6/02.jpg',
        alt: 'Color documentation spread',
        caption: 'Color docs',
        description:
          'LCH values, contrast ratios, dark/light gradient documentation, and Game Pass brand color application.',
      },
    ],
  },
  {
    id: 7,
    type: 'image',
    src: '/assets/xds/xds-7.jpg',
    title: '8-Phase Ops Process',
    description: 'The invisible infrastructure. 8 phases, 8 roles, one release pipeline.',
    alt: 'XDS Design Ops — 8-phase component creation process',
    width: 1600,
    height: 900,
    detailText:
      'Most DS portfolios show components. This shows the operational infrastructure that decides which ones get built, by whom, in what order, and how they get released to partners. 8 phases from Data Collection to Official Release. 8 stakeholder roles coordinated. LOCKs governance to prevent partner divergence. ADO integration so design work is visible in engineering tooling.',
    detailImages: [
      {
        src: '/assets/xds/xds-7/01.jpg',
        alt: '8-phase ops diagram',
        caption: 'Phase diagram',
        description:
          'Data Collection → Research → Design → Review → Development → QA → Documentation → Official Release.',
      },
      {
        src: '/assets/xds/xds-7/02.jpg',
        alt: 'Role matrix per phase',
        caption: 'Role matrix',
        description:
          'Designer Â· Dev Â· PM Â· Researcher Â· A11y Â· Design Lead Â· Dev Lead Â· XDS Lead — who owns what, when.',
      },
      {
        src: '/assets/xds/xds-7/03.jpg',
        alt: 'LOCKs governance model',
        caption: 'LOCKs governance',
        description:
          'The lock/unlock model that controls which components partner teams can modify — and the implications of breaking a lock.',
      },
    ],
  },
  {
    id: 8,
    type: 'image',
    src: '/assets/xds/xds-8.jpg',
    title: 'Illustration System',
    description: 'Audit → Workshop → 55 assets. Shipped on the last day.',
    alt: 'XDS Illustration System — GEO assets and emotional states',
    width: 1600,
    height: 900,
    detailText:
      "A complete illustration system built in three stages: an audit of existing illustrations across 14 semantic categories, a collaborative opportunities workshop, and a final asset library shipped on the last day of the contract. 55+ assets. The arc — from audit to workshop to system — is documented in the Figma file's own canvas labels.",
    detailImages: [
      {
        src: '/assets/xds/xds-8/01.jpg',
        alt: 'Illustration asset grid',
        caption: 'Illustration library',
        description:
          'Conflict · Growth · Launch · Unstable · Success · Support · Unsecure · NetworkError · Login · Rejection · Information · Progress · Unclaimed.',
      },
      {
        src: '/assets/xds/xds-8/02.jpg',
        alt: 'GEO primitive assets',
        caption: 'GEO primitives',
        description:
          'Triangle Â· Torus Â· Knot Â· RingCylinder Â· Arch Â· Cone Â· Dodec Â· Ico Â· Tetra Â· Star Â· Pyra — three colorways each. Adrian made these.',
      },
      {
        src: '/assets/xds/xds-8/03.jpg',
        alt: 'Four-stage process strip',
        caption: 'The arc',
        description:
          '"Illustration Audit" → "Illustration Opportunities Workshop" → "Illustration System" → "illustration System (LAST dAY)"',
      },
    ],
  },
];

// ─── Card 2: Microsoft Game Dev ───────────────────────────────────────────────

const mgdItems: PortfolioItem[] = [
  {
    id: 1,
    type: 'image',
    src: '/assets/mgd/mgd-1.jpg',
    title: 'Shipped Site Archive',
    description: 'developer.microsoft.com — every page, every breakpoint.',
    alt: 'Microsoft Game Dev Website — shipped site screenshots',
    width: 1600,
    height: 900,
    detailText:
      '20+ pages shipped to developer.microsoft.com across 3 responsive breakpoints — Home, Develop (8 sub-pages), Distribute (4), Grow (3), Products, Resources, Events, Articles, Community. Photographed with design QA notes still visible in the Figma archive.',
    detailImages: [
      {
        src: '/assets/mgd/mgd-1/01.jpg',
        alt: 'Home page triptych',
        caption: 'Home Â· S / L / XXL',
        description:
          'The homepage at 390px, 960px, and 1440px — the same information hierarchy preserved at every breakpoint.',
      },
      {
        src: '/assets/mgd/mgd-1/02.jpg',
        alt: 'Develop section',
        caption: 'Develop section',
        description:
          '8 sub-pages of developer tooling and API documentation — the densest information surface in the site.',
      },
      {
        src: '/assets/mgd/mgd-1/03.jpg',
        alt: 'Site IA',
        caption: 'Site IA',
        description:
          'Create Â· Develop Â· Distribute Â· Grow Â· Products Â· Resources Â· Company — 7 top-level destinations, 20+ sub-pages.',
      },
    ],
  },
  {
    id: 2,
    type: 'image',
    src: '/assets/mgd/mgd-2.jpg',
    title: 'Breakpoint System',
    description: "AEM can't do 16→12→8 columns. So I engineered this instead.",
    alt: 'MGD 5-Breakpoint Grid System',
    width: 1600,
    height: 900,
    detailText:
      'AEM limitations prevented a standard 16→12→8 column grid. The solution: a custom 5-breakpoint system (sm/md/lg/xl/xxl) with a 16-column, 1200px max-width layout and documented composition rules. Self-labeled "Big Win" in the Figma file.',
    detailImages: [
      {
        src: '/assets/mgd/mgd-2/01.jpg',
        alt: '5-breakpoint spec diagram',
        caption: '5-breakpoint spec',
        description:
          'sm (375px) Â· md (750/768px) Â· lg (1440px) Â· xl (1920px) Â· xxl (2000px max) — each with documented column configurations.',
      },
      {
        src: '/assets/mgd/mgd-2/02.jpg',
        alt: 'Column variant documentation',
        caption: 'Column variants',
        description:
          "Full Width / 12col / 10col / 8col / 6col / 4col / 3col / 2col — with Dos/Don'ts and AEM constraint annotations.",
      },
    ],
  },
  {
    id: 3,
    type: 'image',
    src: '/assets/mgd/mgd-3.jpg',
    title: 'Article Template',
    description: 'One template. Three content types. Zero one-offs.',
    alt: 'MGD Editorial Article Template',
    width: 1600,
    height: 900,
    detailText:
      'A single editorial template structure serving Articles, Customer Success Stories, and Case Studies. Nav → Breadcrumbs → Hero (16:9 + video overlay + depth acrylic) → Meta (avatar + date) → Body → Footer. Same component structure, zero one-off layouts.',
    detailImages: [
      {
        src: '/assets/mgd/mgd-3/01.jpg',
        alt: 'Three article type comparison',
        caption: 'Article · Success Story · Case Study',
        description:
          'The same structural template rendering three distinct content types without layout divergence.',
      },
    ],
  },
  {
    id: 4,
    type: 'image',
    src: '/assets/mgd/mgd-4.jpg',
    title: 'Email System + MJML Handoff',
    description: 'Layer names are implementation contracts.',
    alt: 'MGD Email Template — MJML layer naming convention',
    width: 1600,
    height: 900,
    detailText:
      'Email templates where every Figma layer name maps directly to an MJML tag: mj-body · mj-section · mj-column · mj-image · mj-text. The layer panel is the implementation spec. Developers never need to guess the markup structure.',
    detailImages: [
      {
        src: '/assets/mgd/mgd-4/01.jpg',
        alt: 'Figma layer panel and rendered email',
        caption: 'Layer names = MJML tags',
        description:
          'mj-body / mj-section / mj-column / mj-image / mj-text — the Figma structure IS the implementation.',
      },
      {
        src: '/assets/mgd/mgd-4/02.jpg',
        alt: 'Email anatomy diagram',
        caption: 'Email anatomy',
        description:
          'Logo → Hero (16:9 + acrylic) → CTA → Divider → Features → Social (IG/LinkedIn/YouTube) → Footer.',
      },
      {
        src: '/assets/mgd/mgd-4/03.jpg',
        alt: 'Logo variant library',
        caption: 'Logo variant library',
        description:
          '10+ logo variants — Pure white on gradient Â· On black Â· On Hero Â· On White Â· Collaboration Â· ID@Xbox.',
      },
    ],
  },
  {
    id: 5,
    type: 'image',
    src: '/assets/mgd/mgd-5.jpg',
    title: 'Visual Language Rules',
    description: 'Decoration vs. Utility. Every graphic element earns its space.',
    alt: 'MGD Visual Language — Stamp and shape governance',
    width: 1600,
    height: 900,
    detailText:
      'A documented visual language governing stamps, shapes, and graphic elements — with explicit rules about grid alignment, color application, and mixing constraints. Stamps come from the edge. Colors are Pure Black or Pure White on photos. One support graphic per layout. The rules exist because someone asked "why?" and got an answer.',
    detailImages: [
      {
        src: '/assets/mgd/mgd-5/01.jpg',
        alt: 'Stamp governance rules',
        caption: 'Stamp rules',
        description:
          '"Stamps come from the edge and align to the grid. Color stamps on photos are Pure Black or Pure White."',
      },
      {
        src: '/assets/mgd/mgd-5/02.jpg',
        alt: 'Print assets',
        caption: 'Print Â· Tokyo 2024',
        description:
          'Door Signage Â· Desk Print Â· Thank You Note — the visual language extended to physical conference materials.',
      },
    ],
  },
  {
    id: 6,
    type: 'image',
    src: '/assets/mgd/mgd-6.jpg',
    title: 'GDC 2024 Banners',
    description: 'Conference-scale visual system. Three banners, one language.',
    alt: 'GDC 2024 Presentation Banners — PlayFab',
    width: 1600,
    height: 900,
    detailText:
      'Three 1920Ã—1080 conference banners for GDC 2024 — Unlocking PlayFab Economy Â· Azure PlayFab recap Â· PlayFab entity stats & leaderboards. Shared system: Hero-Purple #6d31fb + radial gradient pink + noise overlay + Segoe Sans Display.',
    detailImages: [
      {
        src: '/assets/mgd/mgd-6/01.jpg',
        alt: 'GDC 2024 banner set',
        caption: 'Three-banner system',
        description: 'One visual language across three distinct PlayFab presentations at GDC 2024.',
      },
    ],
  },
  {
    id: 7,
    type: 'image',
    src: '/assets/mgd/mgd-7.jpg',
    title: 'Industry Careers Page',
    description: '9 disciplines. 2+ years of iteration. XDS components in production.',
    alt: 'MGD Industry Careers Page — 9 disciplines',
    width: 1600,
    height: 900,
    detailText:
      'Designed and iterated the Industry Careers page for microsoftgamedev.com across 2+ years — August 2023 to August 2025. 9 disciplines (Animation Â· Art Â· Audio Â· Business Â· Design Â· LiveOps Â· Production Â· Programming Â· QA), XDS components in production context, and a research doc on the canvas from GamesIndustryCareers_Cribsheet_20221024.',
    detailImages: [
      {
        src: '/assets/mgd/mgd-7/01.jpg',
        alt: '9-discipline tab layout',
        caption: '9 disciplines',
        description:
          'Animation · Art · Audio · Business & Marketing · Design · LiveOps · Production · Programming · QA.',
      },
      {
        src: '/assets/mgd/mgd-7/02.jpg',
        alt: 'Before/after iteration',
        caption: 'Aug 2023 → Aug 2025',
        description:
          '2+ years of ownership visible in the two dated page versions in the Figma archive.',
      },
    ],
  },
  {
    id: 8,
    type: 'image',
    src: '/assets/mgd/mgd-8.jpg',
    title: 'GACC Accessibility Hub',
    description: 'Three paths. Designed around what you know, not what you do.',
    alt: 'GACC Resources Hub — 3-path IA model',
    width: 1600,
    height: 900,
    detailText:
      "The irony: an accessibility resources hub that wasn't itself accessible. An 8-participant HITS study found walls of text, broken search, and no entry point for beginners. The design response: a 3-path IA model based on self-perceived accessibility knowledge — not game dev experience.",
    detailImages: [
      {
        src: '/assets/mgd/mgd-8/01.jpg',
        alt: '3-path IA model',
        caption: 'Three paths',
        description:
          '"New to Accessibility?" Â· "Learn and Implement" Â· "Technical References" — paths based on knowledge, not role.',
      },
      {
        src: '/assets/mgd/mgd-8/02.jpg',
        alt: 'HITS study findings',
        caption: 'Research findings',
        description:
          '"Wall of text." "Search: completely worthless." "In this Article pane was hard to find." — 8 participants, documented verbatim.',
      },
      {
        src: '/assets/mgd/mgd-8/03.jpg',
        alt: 'Competitive teardown',
        caption: '20+ site teardown',
        description:
          'A competitive analysis of 20+ accessibility documentation sites — breadth of reference for a single IA decision.',
      },
    ],
  },
];

// ─── Card 3: Xbox Design Lab + XDD ────────────────────────────────────────────

const xdlItems: PortfolioItem[] = [
  {
    id: 1,
    type: 'image',
    src: '/assets/xdl/xdl-1.jpg',
    title: 'Xbox Design Lab V2',
    description: 'The controller configurator. Millions of players, one design system.',
    alt: 'Xbox Design Lab — controller customization UI',
    width: 1600,
    height: 900,
    detailText:
      'Lead Visual Designer on the V2 redesign of the Xbox Design Lab — the custom controller configurator used by millions of players. Responded to user testing on InVision prototypes, collaborated across PM, Marketing, Research, Motion, and Dev.',
    detailImages: [
      {
        src: '/assets/xdl/xdl-1/01.jpg',
        alt: 'Controller customization screens',
        caption: 'Configurator UI',
        description:
          'The color selection and preview surface — the product moment where the system becomes personal for every player.',
      },
      {
        src: '/assets/xdl/xdl-1/02.jpg',
        alt: '9-color palette grid',
        caption: '9-color palette',
        description:
          'Light Pink Â· Hot Pink Â· Purple Â· Yellow Â· Orange Â· Red Â· Teal Â· Blue Â· Navy — the controller color system.',
      },
      {
        src: '/assets/xdl/xdl-1/03.jpg',
        alt: 'CardStudy design variants',
        caption: 'CardStudy explorations',
        description:
          '7 card layout variants explored during the design process — the visible research trace.',
      },
    ],
  },
  {
    id: 2,
    type: 'image',
    src: '/assets/xdl/xdl-2.jpg',
    title: 'XDD Creative Brief',
    description: 'One umbrella brand. Three audiences. Zero visual confusion.',
    alt: 'XDD Creative Brief — Discovery / Digital / Dev',
    width: 1600,
    height: 900,
    detailText:
      'XDD is an umbrella brand for three Xbox developer events. The creative brief defined three audiences, three tones, and three visual directions — all under one coherent identity. Secondary objective: differentiate while staying unified.',
    detailImages: [
      {
        src: '/assets/xdl/xdl-2/01.jpg',
        alt: '3-column event comparison',
        caption: 'Three tracks',
        description:
          'Discovery Days (Friendly/Colorful) · Digital Days (Professional/Sleek) · Dev Days (Expert/Sharp).',
      },
      {
        src: '/assets/xdl/xdl-2/02.jpg',
        alt: 'Full brief text',
        caption: 'Primary + secondary objectives',
        description:
          '"Create clarity, demonstrate the spectrum, provide visual cues to differentiate." The brief, verbatim.',
      },
    ],
  },
  {
    id: 3,
    type: 'image',
    src: '/assets/xdl/xdl-3.jpg',
    title: 'Workshop Brainstorm',
    description: '50+ concepts. 3 tracks. One structured workshop.',
    alt: 'XDD Logo Workshop — sticky note ideation board',
    width: 1600,
    height: 900,
    detailText:
      'A color-coded ideation board: Discovery (blue stickies), Digital (yellow stickies), Dev (green stickies). 50+ concepts generated across the three tracks — Telescope Â· Lightbulb Â· Graph trending up Â· Circuit Â· Controller deconstructed. The density is the visual.',
    detailImages: [
      {
        src: '/assets/xdl/xdl-3/01.jpg',
        alt: 'Sticky note brainstorm board',
        caption: 'Raw ideation',
        description:
          "The full workshop canvas — density intentional. Don't clean it up. The volume of ideas is the story.",
      },
    ],
  },
  {
    id: 4,
    type: 'image',
    src: '/assets/xdl/xdl-4.jpg',
    title: 'AI Exploration',
    description: '49 AI-generated symbols. Design selected. Craft refined.',
    alt: 'XDD AI Vector Explorations — digital symbol grid',
    width: 1600,
    height: 900,
    detailText:
      'AI vector exploration as a structured design phase — not an experiment. Prompt: "a simple vector logo for a game development event called \'Dev Days\', white background, pencil sketch, japanese style, in the style of Massimo Vignelli. incorporate an extremely simple microchip." AI generated the raw material. Design made the selection.',
    detailImages: [
      {
        src: '/assets/xdl/xdl-4/01.jpg',
        alt: 'AI exploration grid',
        caption: 'digital1–digital49',
        description:
          '49 digital track symbols + 26 chip variants — AI-generated raw material curated by a designer, not replaced by one.',
      },
      {
        src: '/assets/xdl/xdl-4/02.jpg',
        alt: 'AI prompt screenshot',
        caption: 'The prompt',
        description:
          '"...japanese style, in the style of Massimo Vignelli. incorporate an extremely simple microchip with very few parts."',
      },
      {
        src: '/assets/xdl/xdl-4/03.jpg',
        alt: 'Accessibility constraint note',
        caption: 'Shape over color',
        description:
          '"Color alone is not enough or accessible." — drove the decision to give each track a distinct shape, not just a distinct color.',
      },
    ],
  },
  {
    id: 5,
    type: 'image',
    src: '/assets/xdl/xdl-5.jpg',
    title: 'Iteration Volume',
    description: "55 variants of one mark. That's how you know you found the right one.",
    alt: 'XDD digital10 symbol — 55+ variants',
    width: 1600,
    height: 900,
    detailText:
      'digital10 — a single winning symbol taken through 55+ variants. Systematically exhausting a direction is how you commit to it with confidence. Canvas revision notes preserve the decision trail: "fatter sparkle" Â· "rounder" Â· "implied dpad...but subtle" Â· "thinner stems".',
    detailImages: [
      {
        src: '/assets/xdl/xdl-5/01.jpg',
        alt: 'digital10 variant grid',
        caption: '55+ variants of one mark',
        description:
          'The progression visible across the grid — each variant a deliberate decision, not an accident.',
      },
      {
        src: '/assets/xdl/xdl-5/02.jpg',
        alt: 'Per-track symbol system',
        caption: 'Three track symbols',
        description:
          'Dev: chevron/D-pad Â· Digital: stair/step Â· Discovery: coin/badge — each shape chosen for conceptual fit, not aesthetics.',
      },
      {
        src: '/assets/xdl/xdl-5/03.jpg',
        alt: 'Choosen ones final selection',
        caption: '"Choosen ones"',
        description:
          'The narrowed final directions with 7 revision notes — the decision artifact that locked the direction.',
      },
    ],
  },
  {
    id: 6,
    type: 'image',
    src: '/assets/xdl/xdl-6.jpg',
    title: 'Final System + Approval',
    description: 'Brief → approved in three weeks.',
    alt: 'XDD Final Logo System — 3D surface renders and approval',
    width: 1600,
    height: 900,
    detailText:
      'The full XDD brand identity system: 3 tracks × 3 colorways × A/B variants = 18 logo configurations. 3D surface renders for all three tracks. All assets at 4096×4096px, print-ready. Stakeholder approval captured as a Figma reaction stamp on the canvas: "Love it!"',
    detailImages: [
      {
        src: '/assets/xdl/xdl-6/01.jpg',
        alt: '3D surface renders',
        caption: 'dev Â· digital Â· discovery surface renders',
        description:
          'dev4_basicsurface Â· digital4_basicsurface Â· discovery4_basicsurface — event-ready 3D assets for all three tracks.',
      },
      {
        src: '/assets/xdl/xdl-6/02.jpg',
        alt: 'Logo asset library',
        caption: '18-configuration system',
        description:
          'Dev Â· Digital Â· Discovery Ã— Purple/Orange/Magenta Â· White Â· Black — the full production asset set at 4096px.',
      },
      {
        src: '/assets/xdl/xdl-6/03.jpg',
        alt: 'Love it stakeholder stamp',
        caption: '"Love it!" — on canvas',
        description:
          'A Figma reaction stamp placed by a stakeholder directly on the design. Informal. Definitive. The approval artifact.',
      },
    ],
  },
];

// ─── Card 4: Hirobius Design System ───────────────────────────────────────────

const hdsItems: PortfolioItem[] = [
  {
    id: 1,
    type: 'image',
    src: '/assets/hds/hds-1.jpg',
    title: 'Token Pipeline',
    description: 'One JSON file. Every color, every size, every space on this site.',
    alt: 'Hirobius Token Pipeline — JSON to React to Vercel',
    width: 1600,
    height: 900,
    detailText:
      'hirobius.tokens.json (W3C DTCG 2025.10) → pnpm tokens → tokens.css + generated-tokens.ts → React components → Vercel. One source of truth. No design decisions live outside the pipeline.',
    detailImages: [
      {
        src: '/assets/hds/hds-1/01.jpg',
        alt: 'Token pipeline flow diagram',
        caption: 'The pipeline',
        description:
          'JSON source → compile → CSS vars + TS constants → components → production. Every step documented.',
      },
      {
        src: '/assets/hds/hds-1/02.jpg',
        alt: '3-tier token architecture',
        caption: 'Three-tier architecture',
        description:
          'primitive.* (raw values) → semantic.* (purpose aliases) → component.* (scoped tokens). Each layer with a defined owner.',
      },
      {
        src: '/assets/hds/hds-1/03.jpg',
        alt: 'Token consumption patterns',
        caption: 'Consumption patterns',
        description:
          'CSS: var(--semantic-color-surface-page) · JS: ct(isDark).content.primary · Typography: hds.typeStyles.heading1',
      },
    ],
  },
  {
    id: 2,
    type: 'image',
    src: '/assets/hds/hds-2.jpg',
    title: 'Color System',
    description: 'One blue. Thirteen neutrals. No warm tint. No exceptions.',
    alt: 'Hirobius Color System — neutral scale and blue accent',
    width: 1600,
    height: 900,
    detailText:
      '13 neutral steps from #000000 to #ffffff — all equal RGB channels, truly monochromatic, zero warm or cool tint. 10 blue steps anchored at #1E2FFF. One blue. The system is opinionated by design.',
    detailImages: [
      {
        src: '/assets/hds/hds-2/01.jpg',
        alt: 'Neutral and blue scale',
        caption: 'Color scales',
        description:
          '13 true monochromatic neutrals + 10 blue steps. Primitive values — the raw material for every semantic token.',
      },
      {
        src: '/assets/hds/hds-2/02.jpg',
        alt: 'Semantic color mapping',
        caption: 'Light Â· Dark resolution',
        description:
          'Every semantic token in both light and dark modes — the full mapping table from DESIGN-HANDOFF.md.',
      },
    ],
  },
  {
    id: 3,
    type: 'image',
    src: '/assets/hds/hds-3.jpg',
    title: 'Dark Mode (Live)',
    description: 'Pure CSS. One attribute. The entire system switches.',
    alt: 'Hirobius Dark Mode — pure CSS theme switching',
    width: 1600,
    height: 900,
    detailText:
      'ThemeContext toggles data-theme="dark" on <html>. Every color in the system resolves automatically via CSS variable overrides — no JavaScript re-renders, no class toggling, no media queries in component code. The toggle on this site is the demo.',
    detailImages: [
      {
        src: '/assets/hds/hds-3/01.jpg',
        alt: 'Light and dark mode split',
        caption: 'Light Â· Dark',
        description:
          'The same page — same markup, same components — in both theme states. Only one attribute changes.',
      },
    ],
  },
  {
    id: 4,
    type: 'image',
    src: '/assets/hds/hds-4.jpg',
    title: 'The Whole Designer',
    description: 'Same thinking. Different materials.',
    alt: 'Hirobius — DS pipeline, GEO 3D, physical fabrication',
    width: 1600,
    height: 900,
    detailText:
      "Token pipeline. 3D GEO primitives. Concrete planters cast from silicone molds. The same systems thinking applied to three different materials. Physical fabrication isn't a hobby — it's proof the mindset isn't software-specific.",
    detailImages: [
      {
        src: '/assets/hds/hds-4/01.jpg',
        alt: 'Clay sculpting and ZBrush',
        caption: 'Sculpting',
        description:
          'Clay characters and ZBrush digital sculpts from Dec 2022 — the 3D vocabulary that became the GEO asset system.',
      },
      {
        src: '/assets/hds/hds-4/02.jpg',
        alt: 'Blender renders',
        caption: 'Blender (2024)',
        description:
          'Blender viewport captures and renders — the GEO primitive production pipeline.',
      },
      {
        src: '/assets/hds/hds-4/03.jpg',
        alt: 'Physical planter fabrication',
        caption: 'Physical fabrication',
        description:
          'Mold-making, casting, finishing — concrete planters sold on Etsy and Faire under the Hirobius LLC brand.',
      },
    ],
  },
];

// ─── Card 5: Component Lab ────────────────────────────────────────────────────

const componentLabCaseItems: PortfolioItem[] = [
  {
    id: 1,
    type: 'image',
    src: '/assets/lab/interactive-demo.jpg',
    title: 'Interactive Demo',
    description: 'Live component playground with runtime controls.',
    alt: 'Interactive code',
    detailText:
      'A sandbox where prop changes, state transitions, and event sequences can be observed without editing source. Built to make stakeholder walkthroughs and accessibility reviews faster — the reviewer drives, not the designer.',
    detailImages: [
      {
        src: '/assets/lab/interactive-demo/01.jpg',
        alt: 'Component UI detail',
        caption: 'State controls',
        description:
          'Runtime prop controls mapped to every enumerated variant — no code edits required during a review session.',
      },
      {
        src: '/assets/lab/interactive-demo/02.jpg',
        alt: 'Playground overview',
        caption: 'Playground overview',
        description:
          'The full component surface in a single view — stakeholders see all states simultaneously without switching screens.',
      },
    ],
  },
  {
    id: 2,
    type: 'image',
    src: '/assets/lab/component-ui.jpg',
    title: 'Component UI',
    description: 'React design system built from atomic principles.',
    alt: 'React components',
    detailText:
      'Atomic design applied strictly — primitives, composites, and patterns kept in separate layers of the component tree. Variants are data-driven via design tokens, so visual changes propagate from a single source without touching component code.',
    detailImages: [
      {
        src: '/assets/lab/component-ui/01.jpg',
        alt: 'Design system detail',
        caption: 'Token architecture',
        description:
          'Every visual property traced back to a named token with a documented semantic meaning and a defined update owner.',
      },
      {
        src: '/assets/lab/component-ui/02.jpg',
        alt: 'Component grid',
        caption: 'Component inventory',
        description:
          'A living catalogue of components, their variants, and their documented composition relationships across the system.',
      },
    ],
  },
  {
    id: 3,
    type: 'image',
    src: '/assets/lab/dev-workspace.jpg',
    title: 'Dev Workspace',
    description: 'Toolchain enabling rapid component iteration.',
    alt: 'Web development',
    detailText:
      'The local development loop: Vite HMR, Storybook for isolated rendering, and a token watcher that hot-reloads CSS variables when the source JSON changes. Zero compile steps for visual iteration.',
    detailImages: [
      {
        src: '/assets/lab/dev-workspace/01.jpg',
        alt: 'Code editor',
        caption: 'Development environment',
        description:
          'Hot-module replacement on every save — feedback loop from design token to rendered component under 100ms.',
      },
      {
        src: '/assets/lab/dev-workspace/02.jpg',
        alt: 'Interface build',
        caption: 'Build output',
        description:
          'Production bundle with tree-shaken token imports — no unused variables reach the client.',
      },
    ],
  },
  {
    id: 4,
    type: 'image',
    src: '/assets/lab/code-animation.jpg',
    title: 'Code Animation',
    description: 'Motion design applied to UI state transitions.',
    alt: 'Creative coding',
    detailText:
      'Timing and easing are treated as design decisions, not implementation details. Each animation curve is documented in the token system alongside colour and spacing — so motion consistency is auditable the same way visual consistency is.',
    detailImages: [
      {
        src: '/assets/lab/code-animation/01.jpg',
        alt: 'Animation curves',
        caption: 'Easing reference',
        description:
          'All motion curves in one view — each is a named token used consistently across entry, exit, and state transitions.',
      },
      {
        src: '/assets/lab/code-animation/02.jpg',
        alt: 'Motion states',
        caption: 'State transitions',
        description:
          'The full animation lifecycle for a single component — from initial mount through every intermediate state change.',
      },
    ],
  },
];

// ─── Lab Experiments registry ─────────────────────────────────────────────────

type LabExperiment = {
  slug: string;
  title: string;
  description: string;
  year: string;
  accentColor: string;
};

const _labExperiments: LabExperiment[] = [
  {
    slug: 'triangle-3d',
    title: 'Triangle 3D',
    description:
      'A WebGL triangle torus rendered in real time with configurable geometry — facets, twist, tube radius, roll speed, and HSL lighting.',
    year: '2024',
    accentColor: '#F59E0B',
  },
  {
    slug: 'cascade-text',
    title: 'Cascade Text',
    description:
      'Kinetic typography component with per-character stagger animations for theatrical text entrance sequences.',
    year: '2024',
    accentColor: '#1E2FFF',
  },
  {
    slug: 'cinematic-link',
    title: 'Cinematic Link',
    description:
      'Navigation link with a smooth vertical-slide exit and animated underline reveal — a micro-interaction for editorial contexts.',
    year: '2024',
    accentColor: '#8B5CF6',
  },
  {
    slug: 'button-playground',
    title: 'Button Playground',
    description:
      'Interactive exploration of button variants, loading states, and micro-interaction feedback across a design token system.',
    year: '2024',
    accentColor: '#10B981',
  },
  {
    slug: 'interactive-demo',
    title: 'Interactive Playground',
    description:
      'A counter component with animated number transitions and runtime color palette selection, demonstrating stateful React patterns.',
    year: '2024',
    accentColor: '#EC4899',
  },
];

// ─── All projects ─────────────────────────────────────────────────────────────

export const projects: ProjectData[] = [
  {
    name: 'Xbox Design System',
    description:
      'Led the first Figma migration for one of the largest gaming platforms in the world. Reduced hundreds of Sketch components to ~50 core. Owned typography, tokens, color documentation, illustration, and the 8-phase ops process that governed it all.',
    year: '22–24',
    metrics: [
      { bold: '75%+', light: 'Component reduction' },
      { bold: '3', light: 'Platform type ramps' },
      { bold: '13', light: 'User accent colors' },
      { bold: '55+', light: 'Illustration assets' },
    ],
    items: xdsItems,
  },
  {
    name: 'Microsoft Game Dev',
    description:
      'Designed and documented the full Microsoft Game Dev website — 20+ pages shipped to developer.microsoft.com across 3 responsive breakpoints. Engineered a 5-breakpoint grid around AEM constraints, built reusable editorial templates, and extended the design system to email, conference, and print.',
    year: '23–24',
    metrics: [
      { bold: '20+', light: 'Live pages shipped' },
      { bold: '3', light: 'Responsive breakpoints' },
      { bold: '5', light: 'Breakpoint grid system' },
      { bold: '2+ yrs', light: 'Of iteration' },
    ],
    items: mgdItems,
  },
  {
    name: 'Xbox Design Lab + XDD',
    description:
      'Lead visual designer on the Xbox custom controller configurator. Years later, authored the creative brief and ran the workshop that produced the XDD event brand — 3 tracks, 49 AI explorations, 55+ refined variants, approved in three weeks.',
    year: '16–24',
    metrics: [
      { bold: '9', light: 'Controller colors' },
      { bold: '55+', light: 'Logo variants' },
      { bold: '3 wks', light: 'Brief → approved' },
      { bold: '49', light: 'AI explorations' },
    ],
    items: xdlItems,
  },
  {
    name: 'Hirobius Design System',
    description:
      'A personal design system built on the W3C DTCG token spec. One JSON file governs every color, size, and space on this portfolio. Clash Display + Satoshi + Geist Mono. Monochromatic neutrals. One blue. The site is the artifact.',
    year: '25–26',
    metrics: [
      { bold: 'W3C DTCG', light: '2025.10 spec' },
      { bold: '3-tier', light: 'Token architecture' },
      { bold: '13-step', light: 'Neutral scale' },
      { bold: 'Pure CSS', light: 'Dark mode' },
    ],
    items: hdsItems,
  },
  {
    name: 'Component Lab',
    description:
      'Live interactive demos built on the Hirobius Design System. No screenshots. No mockups. The components are real, the tokens are live, and everything you see is what ships.',
    year: '24–25',
    metrics: [
      { bold: 'Live', light: 'Interactive demos' },
      { bold: 'Token-driven', light: 'Components' },
      { bold: '<100ms', light: 'HMR loop' },
    ],
    items: [
      ...componentLabCaseItems,
      {
        id: 5,
        type: 'image',
        src: '/assets/lab/button-playground.jpg',
        title: 'Button Playground',
        description: 'Interactive button states',
        alt: 'Buttons',
      },
      {
        id: 6,
        type: 'image',
        src: '/assets/lab/triangle-3d.jpg',
        title: 'Triangle 3D',
        description: 'WebGL geometry',
        alt: 'Triangles',
      },
      {
        id: 7,
        type: 'image',
        src: '/assets/lab/cascade-text.jpg',
        title: 'Cascade Text',
        description: 'Kinetic typography',
        alt: 'Typography',
      },
      {
        id: 8,
        type: 'image',
        src: '/assets/lab/cinematic-link.jpg',
        title: 'Cinematic Link',
        description: 'Link hover effects',
        alt: 'Gradients',
      },
    ],
  },
];

function getProjectByName(name: string): ProjectData | undefined {
  return projects.find((project) => project.name === name);
}

export function getProjectItem(projectName: string, itemTitle: string): PortfolioItem | undefined {
  return getProjectByName(projectName)?.items.find((item) => item.title === itemTitle);
}
