import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { DestructiveSection } from './destructive-section';

beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
});

afterEach(cleanup);

function setup(onConfirm = vi.fn()) {
  render(
    <DestructiveSection
      title="Archive client"
      description="Hides the client from every list. Projects and invoices are kept."
      actionLabel="Archive client"
      confirmLabel="Yes, archive"
      confirmBody="Archived clients stop receiving updates."
      onConfirm={onConfirm}
    />,
  );
  return onConfirm;
}

describe('DestructiveSection', () => {
  it('shows the title and explanation as a labelled section', () => {
    setup();
    const region = screen.getByRole('region', { name: 'Archive client' });
    expect(within(region).getByText(/Hides the client/)).not.toBeNull();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('does not call onConfirm when the danger button is pressed; it opens the dialog', () => {
    const onConfirm = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Archive client' }));
    expect(onConfirm).not.toHaveBeenCalled();
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText('Archived clients stop receiving updates.')).not.toBeNull();
  });

  it('does not call onConfirm when the dialog is cancelled', () => {
    const onConfirm = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Archive client' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('calls onConfirm exactly once when the dialog confirm is pressed, then closes', () => {
    const onConfirm = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Archive client' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, archive' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('marks the danger button with the danger tone', () => {
    setup();
    const button = screen.getByRole('button', { name: 'Archive client' });
    expect(button.getAttribute('data-tone')).toBe('danger');
  });
});
