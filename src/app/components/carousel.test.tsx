import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Carousel } from './carousel';

beforeAll(() => {
  // jsdom has no real scroll/layout engine — stub scrollBy so click handlers
  // that call it don't throw.
  Element.prototype.scrollBy = () => {};
});

afterEach(cleanup);

describe('Carousel', () => {
  it('renders each slide passed as children', () => {
    render(
      <Carousel>
        <div>Slide one</div>
        <div>Slide two</div>
        <div>Slide three</div>
      </Carousel>,
    );
    expect(screen.getByText('Slide one')).not.toBeNull();
    expect(screen.getByText('Slide two')).not.toBeNull();
    expect(screen.getByText('Slide three')).not.toBeNull();
  });

  it('marks the region with aria-roledescription carousel', () => {
    const { container } = render(
      <Carousel ariaLabel="Photos">
        <div>Slide one</div>
      </Carousel>,
    );
    const section = container.querySelector('section');
    expect(section).not.toBeNull();
    expect(section?.getAttribute('aria-roledescription')).toBe('carousel');
    expect(section?.getAttribute('aria-label')).toBe('Photos');
  });

  it('renders Prev and Next buttons with the correct aria-labels', () => {
    render(
      <Carousel>
        <div>Slide one</div>
      </Carousel>,
    );
    expect(screen.getByLabelText('Previous')).not.toBeNull();
    expect(screen.getByLabelText('Next')).not.toBeNull();
  });

  it('hides the controls when showControls is false', () => {
    render(
      <Carousel showControls={false}>
        <div>Slide one</div>
      </Carousel>,
    );
    expect(screen.queryByLabelText('Previous')).toBeNull();
    expect(screen.queryByLabelText('Next')).toBeNull();
  });
});
