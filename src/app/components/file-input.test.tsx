import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { FileInput } from './file-input';

afterEach(cleanup);

function makeFile(name = 'photo.png', type = 'image/png') {
  return new File(['content'], name, { type });
}

describe('FileInput', () => {
  it('renders the dropzone prompt', () => {
    render(<FileInput />);
    expect(screen.getByText('Click to upload or drag and drop')).not.toBeNull();
  });

  it('reflects accept and multiple on the native input', () => {
    const { container } = render(<FileInput accept="image/png" multiple />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.getAttribute('accept')).toBe('image/png');
    expect(input.multiple).toBe(true);
  });

  it('calls onFiles with the selected file on change', () => {
    const onFiles = vi.fn();
    const { container } = render(<FileInput onFiles={onFiles} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile();
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFiles).toHaveBeenCalledWith([file]);
  });

  it('disables the native input when disabled', () => {
    const { container } = render(<FileInput disabled />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });
});
