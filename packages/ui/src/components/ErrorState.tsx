import type { ReactNode } from 'react';

export interface ErrorStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

// Message only — never renders raw error objects/stack traces (docs/architecture/error-handling.md).
export function ErrorState({ title, description, action }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-danger/30 bg-danger/5 p-10 text-center"
    >
      <p className="font-medium text-danger">{title}</p>
      {description ? <p className="text-sm text-text-secondary">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
