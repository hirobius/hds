// @vitest-environment node
import rule from '../rules/no-primitive-spacing.mjs';
import { makeRuleTester } from './test-helpers.mjs';

const ruleTester = makeRuleTester();

ruleTester.run('no-primitive-spacing', rule, {
  valid: [
    // Semantic vars and members
    'const x = <div style={{ padding: "var(--semantic-space-scale-md)" }} />;',
    'const x = <div style={{ padding: hds.semantic.space.scale.md }} />;',
    'const x = <div style={{ padding: hds.semantic.space.surface.padding }} />;',
    // Tailwind semantic keys and allowed zero / px
    'const x = <div className="p-0 m-0 p-px" />;',
    'const x = <div className="p-surface-padding gap-scale-md px-region-gutter" />;',
    'const x = <div className="inset-0 w-4 h-6 size-8 top-4" />;',
    'const x = <div className="md:hover:p-surface-padding" />;',
    // Box sx t-shirt keys
    "const x = <Box sx={{ p: 'md', gap: 'xs' }} />;",
    // Tailwind class strings outside className / cn are not check 3
    "const label = 'p-4';",
    "const x = foo('p-4');",
    // tailwind:false disables check 3 only
    { code: 'const x = <div className="p-4 gap-2" />;', options: [{ tailwind: false }] },
    { code: 'const x = cn("p-4");', options: [{ tailwind: false }] },
    { code: 'const x = <div className="p-px6" />;', options: [{ tailwind: false }] },
  ],
  invalid: [
    // 1. primitiveVar
    {
      code: "const x = 'var(--primitive-space-4)';",
      errors: [{ messageId: 'primitiveVar' }],
    },
    {
      code: 'const x = <div style={{ padding: "var(--primitive-space-px16)" }} />;',
      errors: [{ messageId: 'primitiveVar' }],
    },
    {
      code: 'const x = `margin: var(--primitive-space-8)`;',
      errors: [{ messageId: 'primitiveVar' }],
    },
    {
      code: 'const x = <div className="p-[var(--primitive-space-4)]" />;',
      errors: [{ messageId: 'primitiveVar' }],
    },
    {
      // still flagged with tailwind:false (check 1 is independent)
      code: "const x = 'var(--primitive-space-4)';",
      options: [{ tailwind: false }],
      errors: [{ messageId: 'primitiveVar' }],
    },
    // 2. primitiveMember
    {
      code: 'const x = <div style={{ padding: hds.space.px16 }} />;',
      errors: [{ messageId: 'primitiveMember' }],
    },
    {
      code: 'const x = tokens.space.px8;',
      errors: [{ messageId: 'primitiveMember' }],
    },
    // 3. primitiveTailwind
    {
      code: 'const x = <div className="p-4" />;',
      errors: [{ messageId: 'primitiveTailwind' }],
    },
    {
      code: 'const x = <div className="flex gap-2 md:px-6 hover:!-mt-4" />;',
      errors: [
        { messageId: 'primitiveTailwind' },
        { messageId: 'primitiveTailwind' },
        { messageId: 'primitiveTailwind' },
      ],
    },
    {
      code: 'const x = <div className="[&>svg]:gap-x-1.5 space-y-px12" />;',
      errors: [{ messageId: 'primitiveTailwind' }, { messageId: 'primitiveTailwind' }],
    },
    {
      code: 'const x = <div className={cn("flex", on && "p-4", [big ? "m-8" : "mx-2"], { "pt-3": a })} />;',
      errors: [
        { messageId: 'primitiveTailwind' },
        { messageId: 'primitiveTailwind' },
        { messageId: 'primitiveTailwind' },
        { messageId: 'primitiveTailwind' },
      ],
    },
    {
      code: 'const x = clsx("p-4");',
      errors: [{ messageId: 'primitiveTailwind' }],
    },
    {
      code: 'const v = cva("flex", { variants: { size: { sm: "px-2", lg: ["px-4"] } } });',
      errors: [{ messageId: 'primitiveTailwind' }, { messageId: 'primitiveTailwind' }],
    },
    {
      code: 'const x = <div className={`flex p-4 ${a}`} />;',
      errors: [{ messageId: 'primitiveTailwind' }],
    },
    // 4. deprecatedStep takes priority
    {
      code: "const x = 'var(--primitive-space-px6)';",
      errors: [{ messageId: 'deprecatedStep' }],
    },
    {
      code: "const x = 'var(--primitive-space-px10)';",
      errors: [{ messageId: 'deprecatedStep' }],
    },
    {
      code: 'const x = hds.space.px6;',
      errors: [{ messageId: 'deprecatedStep' }],
    },
    {
      code: 'const x = hds.space.px10;',
      errors: [{ messageId: 'deprecatedStep' }],
    },
    {
      code: 'const x = <div className="p-px6 gap-px10" />;',
      errors: [{ messageId: 'deprecatedStep' }, { messageId: 'deprecatedStep' }],
    },
  ],
});
