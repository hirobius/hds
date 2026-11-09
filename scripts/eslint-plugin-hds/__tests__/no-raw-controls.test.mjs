// @vitest-environment node
import rule from '../rules/no-raw-controls.mjs';
import { makeRuleTester } from './test-helpers.mjs';

const ruleTester = makeRuleTester();

ruleTester.run('no-raw-controls', rule, {
  valid: [
    'const x = <Button onClick={save}>Save</Button>;',
    'const x = <Textarea label="Notes" />;',
    'const x = <Form onSubmit={save}><Input label="Name" /></Form>;',
    // Member expressions and namespaced components are components, not raw elements.
    'const x = <AlertDialog.Action asChild><Button>Archive</Button></AlertDialog.Action>;',
    'const x = <div><span>text</span></div>;',
    // A <button> styled by static.css .hds-button is an HDS control (hds#1384).
    'const x = <button className="hds-button">Save</button>;',
    'const x = <button className="hds-button hds-button--primary" type="submit">Save</button>;',
    "const x = <button className={'hds-button hds-button--sm'}>Save</button>;",
    'const x = <button className={`hds-button ${size}`}>Save</button>;',
    "const x = <button className={cn('hds-button', active && 'is-active')}>Save</button>;",
    "const x = <button className={open ? 'hds-button hds-button--primary' : 'hds-button'}>Save</button>;",
  ],
  invalid: [
    // Only the exact `hds-button` class counts: a modifier or a look-alike does not.
    {
      code: 'const x = <button className="hds-button--primary">Save</button>;',
      errors: [{ messageId: 'rawControl', data: { element: 'button', component: 'Button' } }],
    },
    {
      code: 'const x = <button className="my-hds-button">Save</button>;',
      errors: [{ messageId: 'rawControl', data: { element: 'button', component: 'Button' } }],
    },
    {
      code: 'const x = <button className={styles.button}>Save</button>;',
      errors: [{ messageId: 'rawControl', data: { element: 'button', component: 'Button' } }],
    },
    // The class only makes a <button> an HDS control; an <input> stays raw.
    {
      code: 'const x = <input className="hds-button" type="submit" />;',
      errors: [{ messageId: 'rawControl', data: { element: 'input', component: 'Input' } }],
    },
    {
      code: 'const x = <button onClick={save}>Save</button>;',
      errors: [{ messageId: 'rawControl', data: { element: 'button', component: 'Button' } }],
    },
    {
      code: 'const x = <input type="text" />;',
      errors: [{ messageId: 'rawControl', data: { element: 'input', component: 'Input' } }],
    },
    {
      code: 'const x = <select><option>a</option></select>;',
      errors: [{ messageId: 'rawControl', data: { element: 'select', component: 'Select' } }],
    },
    {
      code: 'const x = <textarea />;',
      errors: [{ messageId: 'rawControl', data: { element: 'textarea', component: 'Textarea' } }],
    },
    {
      code: 'const x = <form onSubmit={save}><Input label="Name" /></form>;',
      errors: [{ messageId: 'rawControl', data: { element: 'form', component: 'Form' } }],
    },
  ],
});
