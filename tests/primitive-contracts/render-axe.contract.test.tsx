/**
 * Render + axe smoke for components that had no test of their own: each mounts
 * with realistic props, exposes its accessible role and name, and has no axe
 * violation (WCAG 2.0/2.1 A/AA + 2.2 AA; color-contrast runs in the docs-site
 * browser gate instead).
 *
 * @primitive Slider Field CreatableCombobox Callout Surface
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Slider } from '@/app/components/slider';
import { Field } from '@/app/components/field';
import { CreatableCombobox } from '@/app/components/combobox-creatable';
import { Callout } from '@/app/components/callout';
import { Surface } from '@/app/components/surface';
import { axeViolations } from '../helpers/axe';

afterEach(cleanup);

describe('render + axe', () => {
  it('the axe helper reports a real violation (so a green run means something)', async () => {
    const { container } = render(<img src="/x.png" />);
    expect((await axeViolations(container)).join()).toMatch(/image-alt/);
  });

  it('Slider is a labelled range input with its value', async () => {
    const { container } = render(
      <Slider label="Volume" min={0} max={10} value={4} onChange={() => {}} />,
    );
    const slider = screen.getByRole('slider', { name: /Volume/ });
    expect((slider as HTMLInputElement).value).toBe('4');
    expect(await axeViolations(container)).toEqual([]);
  });

  it('Field shows its label and value', async () => {
    const { container } = render(<Field label="Plan" value="Pro" />);
    expect(screen.getByText('Plan')).toBeTruthy();
    expect(screen.getByText('Pro')).toBeTruthy();
    expect(await axeViolations(container)).toEqual([]);
  });

  it('CreatableCombobox is a named combobox showing its chips', async () => {
    const { container } = render(
      <CreatableCombobox
        options={[
          { value: 'design', label: 'Design' },
          { value: 'code', label: 'Code' },
        ]}
        value={['design']}
        onChange={() => {}}
        onCreate={() => {}}
        placeholder="Add a tag"
        emptyMessage="No tags"
        ariaLabel="Tags"
        disabled={false}
      />,
    );
    expect(screen.getByRole('combobox', { name: 'Tags' })).toBeTruthy();
    expect(screen.getByText('Design')).toBeTruthy();
    expect(await axeViolations(container)).toEqual([]);
  });

  it('Callout renders its content', async () => {
    const { container } = render(<Callout>Tokens ship before components.</Callout>);
    expect(screen.getByText('Tokens ship before components.')).toBeTruthy();
    expect(await axeViolations(container)).toEqual([]);
  });

  it('Surface renders as the element it is given', async () => {
    const { container } = render(
      <Surface as="section" aria-label="Summary">
        Three open tasks
      </Surface>,
    );
    expect(screen.getByRole('region', { name: 'Summary' })).toBeTruthy();
    expect(await axeViolations(container)).toEqual([]);
  });
});
