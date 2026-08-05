import type { ReactNode } from 'react';

export interface PermissionDeniedStateProps {
  action?: ReactNode;
}

// A hidden nav item is never the security control — this state is what a user sees when they reach a
// route the server has already denied; it does not itself perform any authorization decision.
export function PermissionDeniedState({ action }: PermissionDeniedStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-border p-10 text-center"
    >
      <p className="font-medium text-text-primary">You don&apos;t have access to this page</p>
      <p className="text-sm text-text-secondary">
        If you think this is a mistake, contact your salon administrator.
      </p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
