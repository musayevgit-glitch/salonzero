import { PublicShell, Skeleton } from '@salonomia/ui';

export default function HomeLoading() {
  return (
    <PublicShell>
      <div className="flex flex-col gap-8">
        <Skeleton className="h-20 w-full max-w-md" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    </PublicShell>
  );
}
