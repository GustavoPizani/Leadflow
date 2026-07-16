import { HeaderSkeleton, ListSkeleton } from '@/components/skeletons';

export default function Loading() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <ListSkeleton rows={2} />
      <ListSkeleton rows={4} />
    </div>
  );
}
