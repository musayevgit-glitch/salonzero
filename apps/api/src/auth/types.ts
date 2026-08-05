// Minimum authenticated-user context (Phase 4). Role/tenant authorization is Phase 10 — this shape
// intentionally carries no salon-scoped data yet.
export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  isSuperadmin: boolean;
}

// Augmenting Express's own namespaced types is the standard (if lint-unfriendly) way to type
// req.user; both rules below are unavoidable for this specific, well-known pattern.
/* eslint-disable @typescript-eslint/no-namespace, @typescript-eslint/no-empty-object-type */
declare global {
  namespace Express {
    interface User extends AuthenticatedUser {}
  }
}
/* eslint-enable @typescript-eslint/no-namespace, @typescript-eslint/no-empty-object-type */
