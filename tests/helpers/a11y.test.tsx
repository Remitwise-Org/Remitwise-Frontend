import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { expectNoAxeViolations } from './a11y';

describe('expectNoAxeViolations', () => {
  it('resolves_successfully_when_component_has_no_violations', async () => {
    const { container } = render(<button type="button">Click me</button>);
    await expect(expectNoAxeViolations(container)).resolves.not.toThrow();
  });

  it('rejects_with_error_when_component_has_violations', async () => {
    // Missing alt text on img causes an axe violation
    const { container } = render(<img src="test.png" />);
    await expect(expectNoAxeViolations(container)).rejects.toThrow();
  });
});
