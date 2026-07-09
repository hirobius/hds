// GENERATED FILE — do not edit; mutate hirobius.tokens.json instead.
// Emitted by scripts/build-tokens.mjs.
//
// Tailwind theme extension bridging HDS role + semantic.shadow tokens to
// utility classes. tailwind.config.* imports this and spreads theme.extend.

/** @type {{ theme: { extend: import('tailwindcss').Config['theme']['extend'] } }} */
const config = {
  theme: {
    extend: {
          "colors": {
                "background": "var(--role-background)",
                "foreground": "var(--role-foreground)",
                "card": {
                      "DEFAULT": "var(--role-card)",
                      "foreground": "var(--role-card-foreground)"
                },
                "popover": {
                      "DEFAULT": "var(--role-popover)",
                      "foreground": "var(--role-popover-foreground)"
                },
                "primary": {
                      "DEFAULT": "var(--role-primary)",
                      "foreground": "var(--role-primary-foreground)"
                },
                "secondary": {
                      "DEFAULT": "var(--role-secondary)",
                      "foreground": "var(--role-secondary-foreground)"
                },
                "muted": {
                      "DEFAULT": "var(--role-muted)",
                      "foreground": "var(--role-muted-foreground)"
                },
                "accent": {
                      "DEFAULT": "var(--role-accent)",
                      "foreground": "var(--role-accent-foreground)"
                },
                "destructive": {
                      "DEFAULT": "var(--role-destructive)",
                      "foreground": "var(--role-destructive-foreground)"
                },
                "border": "var(--role-border)",
                "input": "var(--role-input)",
                "ring": "var(--role-ring)"
          },
          "borderRadius": {
                "lg": "var(--role-radius)",
                "md": "calc(var(--role-radius) - 2px)",
                "sm": "calc(var(--role-radius) - 4px)"
          },
          "boxShadow": {
                "subtle": "var(--semantic-shadow-subtle)",
                "floating": "var(--semantic-shadow-floating)",
                "overlay": "var(--semantic-shadow-overlay)"
          },
          "spacing": {
                "0": "var(--primitive-space-0)",
                "1": "var(--primitive-space-1)",
                "2": "var(--primitive-space-2)",
                "3": "var(--primitive-space-3)",
                "4": "var(--primitive-space-4)",
                "5": "var(--primitive-space-5)",
                "6": "var(--primitive-space-6)",
                "7": "var(--primitive-space-7)",
                "8": "var(--primitive-space-8)",
                "10": "var(--primitive-space-10)",
                "12": "var(--primitive-space-12)",
                "16": "var(--primitive-space-16)",
                "20": "var(--primitive-space-20)",
                "24": "var(--primitive-space-24)",
                "32": "var(--primitive-space-32)",
                "px1": "var(--primitive-space-px1)",
                "px2": "var(--primitive-space-px2)",
                "px6": "var(--primitive-space-px6)",
                "px10": "var(--primitive-space-px10)"
          },
          "screens": {
                "xs": "375px",
                "sm": "640px",
                "md": "768px",
                "lg": "1024px",
                "xl": "1280px"
          },
          "borderWidth": {
                "2": "var(--primitive-borderWidth-sm)",
                "4": "var(--primitive-borderWidth-md)",
                "DEFAULT": "var(--semantic-borderWidth-default)",
                "emphasis": "var(--semantic-borderWidth-emphasis)"
          },
          "fontSize": {
                "2xs": "var(--primitive-typography-size-2xs)",
                "xs": "var(--primitive-typography-size-xs)",
                "sm": "var(--primitive-typography-size-sm)",
                "base": "var(--primitive-typography-size-base)",
                "lg": "var(--primitive-typography-size-lg)",
                "xl": "var(--primitive-typography-size-xl)",
                "2xl": "var(--primitive-typography-size-2xl)",
                "3xl": "var(--primitive-typography-size-3xl)",
                "4xl": "var(--primitive-typography-size-4xl)",
                "5xl": "var(--primitive-typography-size-5xl)",
                "7xl": "var(--primitive-typography-size-7xl)"
          }
    },
  },
};

module.exports = config;
