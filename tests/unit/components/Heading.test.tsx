import React from 'react';
import { render, screen } from '@testing-library/react';
import { Section } from '../../../components/ui/Section';
import { Heading } from '../../../components/ui/Heading';
import '@testing-library/jest-dom';

describe('Heading and Section', () => {
  it('defaults to h1', () => {
    render(<Heading>Test Heading</Heading>);
    const heading = screen.getByRole('heading', { name: 'Test Heading' });
    expect(heading.tagName.toLowerCase()).toBe('h1');
  });

  it('increments to h2 when nested in a single Section', () => {
    render(
      <Section>
        <Heading>Test Heading</Heading>
      </Section>
    );
    const heading = screen.getByRole('heading', { name: 'Test Heading' });
    expect(heading.tagName.toLowerCase()).toBe('h2');
  });

  it('increments correctly with multiple nested Sections', () => {
    render(
      <Section>
        <Section>
          <Section>
            <Heading>Test Heading</Heading>
          </Section>
        </Section>
      </Section>
    );
    const heading = screen.getByRole('heading', { name: 'Test Heading' });
    expect(heading.tagName.toLowerCase()).toBe('h4');
  });

  it('caps at h6 for deeply nested Sections', () => {
    render(
      <Section>
        <Section>
          <Section>
            <Section>
              <Section>
                <Section>
                  <Section>
                    <Heading>Test Heading</Heading>
                  </Section>
                </Section>
              </Section>
            </Section>
          </Section>
        </Section>
      </Section>
    );
    const heading = screen.getByRole('heading', { name: 'Test Heading' });
    expect(heading.tagName.toLowerCase()).toBe('h6');
  });

  it('allows custom base level override via Heading prop', () => {
    render(
      <Section>
        <Heading level={4}>Test Heading</Heading>
      </Section>
    );
    const heading = screen.getByRole('heading', { name: 'Test Heading' });
    expect(heading.tagName.toLowerCase()).toBe('h4');
  });
});
