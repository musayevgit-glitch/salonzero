import { PublicShell, Skeleton } from '@salonomia/ui';

export default function SalonDetailLoading() {
  return (
    <PublicShell>
      <div className="flex flex-col gap-8">
        <Skeleton className="h-16 w-full max-w-lg" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </PublicShell>
  );
}
