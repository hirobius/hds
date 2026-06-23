# HDS in a Rails app (ViewComponent / ERB)

How to consume Hirobius tokens in a Ruby on Rails app — **no React, no Tailwind
required**. Components are re-implemented as ViewComponents (or partials) styled
entirely by HDS CSS variables, so they inherit the design language, dark mode,
and tenant branding for free. (Roadmap **C10**.)

> **Why this works without friction:** the multi-format emitter
> (`scripts/tokens-sd`) produces a **preflight-free, variables-only**
> `tokens.vars.css` / `tokens.vars.scss`. Unlike the package's bundled
> `tokens.css` (a full Tailwind build incl. reset — see roadmap A2), the vars
> file injects **only** custom properties, so it won't fight Rails' own CSS
> baseline.

## 1. Get the token CSS into the asset pipeline

Generate the targets (`pnpm tokens:sd`) and copy the vars file into your Rails
app, or vendor it from the package:

```bash
# from the HDS repo
pnpm tokens:sd
cp scripts/tokens-sd/dist/tokens.vars.css path/to/rails-app/app/assets/stylesheets/hds-tokens.css
# (or tokens.vars.scss if you use dartsass-rails)
```

Wire it in:

```scss
// app/assets/stylesheets/application.scss  (dartsass-rails / cssbundling)
@use "hds-tokens";              // or: @import "hds-tokens";
```

```erb
<%# Propshaft / Sprockets: app/views/layouts/application.html.erb %>
<%= stylesheet_link_tag "hds-tokens", "data-turbo-track": "reload" %>
```

The `:root` block now exposes every HDS variable (`--semantic-accent-rest`,
`--semantic-color-surface-page`, `--primitive-space-4`, …).

## 2. Brand it (per-app or per-tenant)

Re-skin to your own brand with the documented override contract — see
[`CONSUMING.md` §6](../CONSUMING.md). One seed re-skins everything:

```scss
:root {
  --semantic-accent-rest:    oklch(0.548 0.14 165.2);   // your brand (jade)
  --semantic-accent-hover:   oklch(0.498 0.14 165.2);
  --semantic-color-surface-accent: var(--semantic-accent-rest);
  // …do NOT override --semantic-color-content-onAccent (stays system white)
}
```

For multi-tenant Rails, scope per request with a body attribute and let the
cascade do the rest:

```erb
<body data-tenant="<%= current_tenant.slug %>" data-theme="<%= current_theme %>">
```

## 3. A token-driven ViewComponent (worked example: Button)

```ruby
# app/components/hds/button_component.rb
module Hds
  class ButtonComponent < ViewComponent::Base
    def initialize(variant: :primary, size: :md)
      @variant = variant
      @size = size
    end

    def call
      content_tag :button, content, class: "hds-button hds-button--#{@variant} hds-button--#{@size}"
    end
  end
end
```

```erb
<%# app/components/hds/button_component.html.erb (if you prefer a template) %>
<button class="hds-button hds-button--<%= @variant %> hds-button--<%= @size %>">
  <%= content %>
</button>
```

```scss
// app/assets/stylesheets/components/_hds_button.scss — all values are HDS tokens
.hds-button {
  font-family: var(--semantic-typography-body-font-family);
  border: var(--primitive-borderWidth-xs) solid transparent;
  border-radius: var(--semantic-radius-action);
  cursor: pointer;
  transition: background-color var(--primitive-duration-short);

  &--md { padding: var(--primitive-space-2) var(--primitive-space-4); }
  &--sm { padding: var(--primitive-space-px6) var(--primitive-space-3); }

  &--primary {
    background: var(--semantic-color-surface-accent);
    color: var(--semantic-color-content-onAccent);
    &:hover { background: var(--semantic-accent-hover); }
  }
  &--secondary {
    background: var(--semantic-color-surface-raised);
    color: var(--semantic-color-content-primary);
    border-color: var(--semantic-color-border-default);
  }
}
```

```erb
<%= render Hds::ButtonComponent.new(variant: :primary).with_content("Get started") %>
```

Because every value is a token, the button re-skins automatically under
`data-theme="dark"` and any tenant/brand override — no Ruby changes.

## 4. If you'd rather reuse the React components

Two paths instead of re-implementing:

- **React islands** — mount HDS React components into ERB via
  [`vite_rails`](https://vite-ruby.netlify.app/) or
  [Inertia.js](https://inertiajs.com/). You still import HDS's React + its peers.
- **Web Components** (roadmap **C11**, not yet shipped) — the planned
  framework-agnostic custom-element build is the cleanest "drop `<hds-button>`
  into ERB" option, with no React in the Rails app.

## Caveats

- **Light/dark:** the vars file carries `:root` (light) + `[data-theme="dark"]`
  overrides; set `data-theme` on `<body>`/`<html>` to switch.
- **No JS behavior:** ViewComponents are presentational. Interactive behavior
  (dialog focus-trap, etc.) that HDS gets from Radix must be supplied by your
  own Stimulus controllers or a Web Component build (C11).
- **Token source:** until A2 ships a vars-only entry from the npm package, vendor
  `scripts/tokens-sd/dist/tokens.vars.css` (regenerate with `pnpm tokens:sd`).
