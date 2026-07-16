import { Skeleton } from '@/components/ui/skeleton';
import { FormCardSkeleton } from '@/components/skeletons';

export function AccountSettingsLoading() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Skeleton className="h-7 w-40" />
      <FormCardSkeleton fields={2} />
      <FormCardSkeleton fields={2} />
      <FormCardSkeleton fields={1} />
    </div>
  );
}
