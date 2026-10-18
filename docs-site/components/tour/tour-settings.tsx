'use client';

import { useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Composer,
  Field,
  Input,
  Radio,
  Select,
  Slider,
  Stack,
  Textarea,
  Toggle,
  useToast,
} from '@hirobius/design-system';
import {
  DestructiveSection,
  ErrorPattern,
  Form,
  FormActions,
  FormField,
  FormFieldShell,
} from '@hirobius/design-system/patterns';

/** A settings form with every input type, a validation error, alerts, a toast and a destructive action. */
export function TourSettings({ version }: { version: string }) {
  const { toast } = useToast();
  const [name, setName] = useState('HDS Console');
  const [density, setDensity] = useState('comfortable');
  const [plan, setPlan] = useState('team');
  const [digest, setDigest] = useState(true);
  const [beta, setBeta] = useState(false);
  const [volume, setVolume] = useState(40);
  const [notes, setNotes] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const nameError = submitted && !name.trim() ? 'Give the console a name.' : undefined;

  return (
    <Stack gap="normal">
      <Alert tone="info" title="Heads up">
        Settings here are local to this page. Nothing is saved.
      </Alert>
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
          if (name.trim())
            toast({ title: 'Settings saved', description: `HDS ${version}`, tone: 'success' });
        }}
      >
        <FormField label="Console name" required error={nameError}>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <FormFieldShell
          controlId="tour-density"
          label="Density"
          description="Applies to the whole page."
        >
          <Select
            id="tour-density"
            label="Density"
            value={density}
            onChange={setDensity}
            options={[
              { value: 'comfortable', label: 'Comfortable' },
              { value: 'compact', label: 'Compact' },
            ]}
          />
        </FormFieldShell>
        <div role="radiogroup" aria-label="Plan">
          <Stack gap="tight">
            {['solo', 'team', 'enterprise'].map((p) => (
              <Radio
                key={p}
                name="plan"
                value={p}
                label={p}
                checked={plan === p}
                onChange={() => setPlan(p)}
              />
            ))}
          </Stack>
        </div>
        <Checkbox label="Email me the release digest" checked={digest} onChange={setDigest} />
        <Toggle label="Show beta components" checked={beta} onChange={setBeta} />
        <Slider label="Volume" min={0} max={100} value={volume} onChange={setVolume} />
        <Textarea
          label="Notes"
          helperText="Markdown is supported."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Field label="Package" value={`@hirobius/design-system@${version}`} mono />
        <FormActions
          secondary={
            <Button
              variant="secondary"
              type="reset"
              onClick={() => {
                setName('HDS Console');
                setSubmitted(false);
              }}
            >
              Reset
            </Button>
          }
          primary={
            <Button variant="primary" type="submit">
              Save changes
            </Button>
          }
        />
      </Form>
      <Alert tone="warning" title="Needs review">
        Compact density is still being tuned.
      </Alert>
      <Alert tone="danger" title="Sync failed">
        The last Figma sync did not finish.
      </Alert>
      <Composer
        label="Send feedback"
        placeholder="Tell us what to change"
        onSubmit={({ text }) => setSent(`${text.length} characters`)}
      />
      {sent && (
        <Alert tone="success" title="Feedback sent">
          {sent}
        </Alert>
      )}
      <DestructiveSection
        title="Reset console"
        level={3}
        description="Clears every setting on this page."
        actionLabel="Reset console"
        confirmLabel="Reset"
        confirmBody="This cannot be undone."
        onConfirm={() => setName('HDS Console')}
      />
    </Stack>
  );
}
