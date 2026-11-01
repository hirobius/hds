// @vitest-environment node
import rule from '../rules/no-nested-cards.mjs';
import { makeRuleTester } from './test-helpers.mjs';

const ruleTester = makeRuleTester();

ruleTester.run('no-nested-cards', rule, {
  valid: [
    // Sibling cards under a plain section with a type-led heading.
    'const x = <section><h2>Review new</h2><Stack><Card>A</Card><Card>B</Card></Stack></section>;',
    // Card parts are not cards.
    'const x = <Card><Card.Header>T</Card.Header><Card.Body>B</Card.Body></Card>;',
    // A card defined in its own component has no JSX ancestor here.
    'const Row = () => <Card>A</Card>; const L = () => <Stack><Row /></Stack>;',
    // Non-surface content inside a card.
    'const x = <Card><Stack><Badge /></Stack></Card>;',
    // An unrelated module's Card is not HDS's Card.
    "import { Card as C } from 'other-lib'; const x = <C><C>A</C></C>;",
  ],
  invalid: [
    {
      code: 'const x = <Card><Card>Inner</Card></Card>;',
      errors: [{ messageId: 'nested', data: { inner: 'Card', outer: 'Card' } }],
    },
    {
      // The #1046 instance: a section surface wrapping a card list.
      code: 'const x = <Surface><h2>Review new</h2>{jobs.map((j) => <Card key={j.id}>{j.title}</Card>)}</Surface>;',
      errors: [{ messageId: 'nested', data: { inner: 'Card', outer: 'Surface' } }],
    },
    {
      code: 'const x = <Card><Stack><Surface>Inset</Surface></Stack></Card>;',
      errors: [{ messageId: 'nested', data: { inner: 'Surface', outer: 'Card' } }],
    },
    {
      code: "import { Card as HdsCard, Surface as Panel } from '@hirobius/design-system'; const x = <Panel><HdsCard /></Panel>;",
      errors: [{ messageId: 'nested', data: { inner: 'HdsCard', outer: 'Panel' } }],
    },
    {
      // Consumer wrappers declared through options.
      code: 'const x = <PipelinePanel><CardList><ListCard /></CardList></PipelinePanel>;',
      options: [{ cards: ['ListCard'], surfaces: ['PipelinePanel'] }],
      errors: [{ messageId: 'nested', data: { inner: 'ListCard', outer: 'PipelinePanel' } }],
    },
    {
      // Only the nearest surface is reported, once per inner card.
      code: 'const x = <Surface><Card><Card /></Card></Surface>;',
      errors: [
        { messageId: 'nested', data: { inner: 'Card', outer: 'Surface' } },
        { messageId: 'nested', data: { inner: 'Card', outer: 'Card' } },
      ],
    },
  ],
});
