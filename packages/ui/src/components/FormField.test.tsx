import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormField } from './FormField';
import { Input } from './Input';

describe('FormField', () => {
  it('associates the error message with the field for screen readers', () => {
    render(
      <FormField label="Phone number" error="Enter a valid phone number">
        {(fieldProps) => <Input {...fieldProps} />}
      </FormField>,
    );

    const input = screen.getByLabelText('Phone number');
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(screen.getByText('Enter a valid phone number')).toHaveAttribute('id', describedBy);
  });
});
