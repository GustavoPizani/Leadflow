import { HeaderSkeleton, TableSkeleton } from '@/components/skeletons';

export default function Loading() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <TableSkeleton rows={5} cols={6} />
    </div>
  );
}
