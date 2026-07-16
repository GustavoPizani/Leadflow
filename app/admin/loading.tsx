import { HeaderSkeleton, StatCardsSkeleton, TableSkeleton } from '@/components/skeletons';

export default function Loading() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <StatCardsSkeleton />
      <TableSkeleton rows={5} cols={4} />
    </div>
  );
}
