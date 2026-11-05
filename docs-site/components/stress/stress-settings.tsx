'use client';

import { useState, type ComponentProps } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Divider,
  Input,
  Radio,
  Select,
  Sidebar,
  Stack,
  Text,
  Textarea,
  Toggle,
  useToast,
} from '@hirobius/design-system';
import { DestructiveSection, Form, FormActions, FormField } from '@hirobius/design-system/patterns';

/** GAP:settings-section: no titled field group, so a Sidebar puts the title on the rail. */
function Section({
  title,
  help,
  children,
}: {
  title: string;
  help: string;
  children: ComponentProps<typeof Stack>['children'];
}) {
  return (
    <Sidebar sideWidth="16rem" gap="spacious">
      <Stack gap="tight">
        <Text variant="title" as="h2">
          {title}
        </Text>
        <Text variant="caption" tone="secondary">
          {help}
        </Text>
      </Stack>
      <Stack gap="normal">{children}</Stack>
    </Sidebar>
  );
}

const PLANS = [
  { value: 'solo', label: 'Solo' },
  { value: 'studio', label: 'Studio' },
  { value: 'agency', label: 'Agency' },
];

/** Workspace settings: profile, plan, notifications, and deleting the workspace. */
export function StressSettings() {
  const { toast } = useToast();
  const [name, setName] = useState('Hirobius Studio');
  const [email, setEmail] = useState('');
  const [zone, setZone] = useState('europe-london');
  const [bio, setBio] = useState('');
  const [plan, setPlan] = useState('studio');
  const [digest, setDigest] = useState(true);
  const [mentions, setMentions] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const nameError = submitted && !name.trim() ? 'Give the workspace a name.' : undefined;
  const emailError =
    submitted && !/^\S+@\S+\.\S+$/.test(email)
      ? 'Enter an email with an @ and a domain.'
      : undefined;

  return (
    <Stack gap="spacious">
      {submitted && (nameError || emailError) && (
        <Alert tone="danger" title="Two fields need a look">
          Fix the highlighted fields, then save again.
        </Alert>
      )}
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
          if (name.trim() && /^\S+@\S+\.\S+$/.test(email))
            toast({ title: 'Settings saved', tone: 'success' });
        }}
      >
        <Stack gap="spacious">
          <Section title="Profile" help="Shown on proposals and invoices.">
            <FormField label="Workspace name" required error={nameError}>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField label="Billing email" required error={emailError}>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </FormField>
            <Select
              label="Time zone"
              value={zone}
              onChange={setZone}
              options={[
                { value: 'europe-london', label: 'London (GMT)' },
                { value: 'america-new-york', label: 'New York (EST)' },
                { value: 'asia-tokyo', label: 'Tokyo (JST)' },
              ]}
            />
            <Textarea
              label="Studio bio"
              helperText="Two or three sentences."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </Section>
          <Divider />
          <Section title="Plan" help="Changes apply from the next invoice.">
            {/* GAP:radio-group: hand-wired group, no arrow-key focus between options. */}
            <Stack gap="tight" role="radiogroup" aria-label="Plan">
              {PLANS.map((p) => (
                <Radio
                  key={p.value}
                  name="plan"
                  value={p.value}
                  label={p.label}
                  checked={plan === p.value}
                  onChange={() => setPlan(p.value)}
                />
              ))}
            </Stack>
          </Section>
          <Divider />
          <Section title="Notifications" help="Email only. Nothing is sent from this page.">
            <Toggle label="Weekly digest" checked={digest} onChange={setDigest} />
            {/* GAP:toggle-description: help text is not tied to the control. */}
            <Text variant="caption" tone="secondary">
              A Monday summary of open leads and drops.
            </Text>
            <Checkbox
              label="Email me when I am mentioned"
              checked={mentions}
              onChange={setMentions}
            />
          </Section>
          <FormActions
            secondary={
              <Button variant="secondary" type="reset" onClick={() => setSubmitted(false)}>
                Cancel
              </Button>
            }
            primary={
              <Button variant="primary" type="submit">
                Save settings
              </Button>
            }
          />
        </Stack>
      </Form>
      <DestructiveSection
        title="Delete workspace"
        description="Removes every project, lead and drop. This cannot be undone."
        level={2}
        actionLabel="Delete workspace"
        confirmLabel="Delete"
        confirmBody="Every project, lead and drop goes with it."
        onConfirm={() => toast({ title: 'Nothing deleted: this is a test page.' })}
      />
    </Stack>
  );
}
