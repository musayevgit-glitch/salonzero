import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders its label and responds to click', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Book now</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Book now' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is disabled and non-interactive while loading', () => {
    render(<Button loading>Submit</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
