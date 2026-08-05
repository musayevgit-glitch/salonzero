import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders its text content so status is never color-only', () => {
    render(<Badge tone="success">Confirmed</Badge>);
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });
});
