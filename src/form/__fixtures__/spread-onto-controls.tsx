/**
 * Compile-only fixture (hds#676): the HdsFormField render props are spread onto
 * native controls exactly as docs/CONSUMING.md section 8.5 shows. Checked by
 * render-props-types.test.ts, which fails on any diagnostic here. Never imported.
 */
import { HdsFormField } from '../index';

export const Fields = () => (
  <>
    <HdsFormField name="email" label="Email">
      {(props) => <input type="email" {...props} />}
    </HdsFormField>
    <HdsFormField name="role" label="Role">
      {(props) => (
        <select {...props}>
          <option value="">Choose…</option>
        </select>
      )}
    </HdsFormField>
    <HdsFormField name="bio" label="Bio">
      {(props) => <textarea {...props} />}
    </HdsFormField>
  </>
);
