import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Tokenizer } from './tokenizer';

afterEach(cleanup);

describe('Tokenizer', () => {
  it('renders existing tokens', () => {
    render(<Tokenizer value={['react', 'design']} onChange={() => {}} aria-label="Tags" />);
    expect(screen.getByText('react')).not.toBeNull();
    expect(screen.getByText('design')).not.toBeNull();
  });

  it('commits the typed draft as a new token on Enter', () => {
    let value = ['react'];
    const handleChange = (next: string[]) => {
      value = next;
    };
    render(<Tokenizer value={value} onChange={handleChange} aria-label="Tags" />);
    const input = screen.getByLabelText('Tags') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'typescript' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(value).toEqual(['react', 'typescript']);
  });

  it('removes the last token on Backspace when the draft is empty', () => {
    let value = ['react', 'design'];
    const handleChange = (next: string[]) => {
      value = next;
    };
    render(<Tokenizer value={value} onChange={handleChange} aria-label="Tags" />);
    const input = screen.getByLabelText('Tags') as HTMLInputElement;
    fireEvent.keyDown(input, { key: 'Backspace' });
    expect(value).toEqual(['react']);
  });

  it('removes a token when its remove button is clicked', () => {
    let value = ['react', 'design'];
    const handleChange = (next: string[]) => {
      value = next;
    };
    render(<Tokenizer value={value} onChange={handleChange} aria-label="Tags" />);
    fireEvent.click(screen.getByLabelText('Remove react'));
    expect(value).toEqual(['design']);
  });

  it('signals the disabled state with a token colour, not reduced opacity', () => {
    const { container } = render(
      <Tokenizer value={['react']} onChange={() => {}} aria-label="Tags" disabled />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).not.toContain('opacity-70');
    expect(wrapper.className).toContain('text-muted-foreground');
  });
});
