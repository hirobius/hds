/**
 * Form + FormField stories — layout seam, field wiring, and validation demos.
 * @see src/app/components/form.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { Form, FormField } from '../app/components/form';
import { Button } from '../app/components/button';

// Named demo components are required for any story that uses state
// (hooks-in-arrow rule from story-shared.md).

function BasicFormDemo() {
  return (
    <div style={{ width: '360px' }}>
      <Form onSubmit={(e) => e.preventDefault()}>
        <FormField label="Full name" required>
          <input
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Adrian Milsap"
          />
        </FormField>
        <FormField label="Email" description="We'll never share your email.">
          <input
            type="email"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="adrian@hirobius.com"
          />
        </FormField>
        <Button type="submit" variant="primary">Submit</Button>
      </Form>
    </div>
  );
}

function WithErrorDemo() {
  return (
    <div style={{ width: '360px' }}>
      <Form onSubmit={(e) => e.preventDefault()}>
        <FormField
          label="Email"
          error="Please enter a valid email address."
          required
        >
          <input
            type="email"
            aria-invalid
            defaultValue="not-an-email"
            className="flex h-10 w-full rounded-md border border-destructive bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
          />
        </FormField>
        <Button type="submit" variant="primary">Save changes</Button>
      </Form>
    </div>
  );
}

function WithDescriptionDemo() {
  return (
    <div style={{ width: '360px' }}>
      <Form onSubmit={(e) => e.preventDefault()}>
        <FormField
          label="Username"
          description="Choose a unique handle — visible on your public profile."
          required
        >
          <input
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="adrianm"
          />
        </FormField>
        <FormField label="Bio" description="Max 160 characters.">
          <textarea
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            placeholder="Product designer building design systems at scale…"
          />
        </FormField>
        <Button type="submit" variant="secondary">Save profile</Button>
      </Form>
    </div>
  );
}

function ControlledDemo() {
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  return (
    <div style={{ width: '360px' }}>
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
      >
        <FormField
          label="Project name"
          required
          error={submitted && !name ? 'Project name is required.' : undefined}
        >
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSubmitted(false);
            }}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Hirobius Design System"
          />
        </FormField>
        <Button type="submit" variant="primary">Create project</Button>
        {submitted && name && (
          <p className="text-sm text-muted-foreground">Project "{name}" created.</p>
        )}
      </Form>
    </div>
  );
}

const meta = {
  title: 'Patterns/form',
  component: Form,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Validation-agnostic form layout seam. Form provides consistent vertical field rhythm; FormField wires a11y relationships (label, aria-invalid, aria-describedby) onto its single child control. Works with any validation library or none.',
      },
    },
  },
} satisfies Meta<typeof Form>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <BasicFormDemo />,
};

export const WithError: Story = {
  parameters: {
    docs: {
      description: {
        story: 'FormField with an error string — control gets aria-invalid and a destructive error message.',
      },
    },
  },
  render: () => <WithErrorDemo />,
};

export const WithDescription: Story = {
  parameters: {
    docs: {
      description: {
        story: 'FormField with description helper text linked via aria-describedby.',
      },
    },
  },
  render: () => <WithDescriptionDemo />,
};

export const Controlled: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Controlled form with inline validation on submit — demonstrates error appearing and clearing.',
      },
    },
  },
  render: () => <ControlledDemo />,
};
