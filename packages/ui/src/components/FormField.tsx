import { type ReactNode, useId } from 'react';
import { cn } from '../utils/cn';

export interface FormFieldProps {
  label: string;
  optional?: boolean;
  description?: string;
  error?: string;
  children: (fieldProps: {
    id: string;
    'aria-describedby'?: string;
    invalid: boolean;
  }) => ReactNode;
}

// Renders the label + description + error association required by the validation-contract and
// apple-inspired-luxury-web skills; consumers pass field props through to Input/Textarea/Select.
export function FormField({ label, optional, description, error, children }: FormFieldProps) {
  const id = useId();
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium text-text-primary">
          {label}
        </label>
        {optional ? <span className="text-xs text-text-secondary">Optional</span> : null}
      </div>
      {description ? (
        <p id={descriptionId} className="text-xs text-text-secondary">
          {description}
        </p>
      ) : null}
      {children({ id, 'aria-describedby': describedBy, invalid: Boolean(error) })}
      {error ? (
        <p id={errorId} role="alert" className={cn('text-xs text-danger')}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
