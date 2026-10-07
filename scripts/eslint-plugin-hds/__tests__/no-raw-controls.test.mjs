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
  ],
  invalid: [
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
