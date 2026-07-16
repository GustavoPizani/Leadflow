import { HeaderSkeleton, TableSkeleton } from '@/components/skeletons';

export default function Loading() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <TableSkeleton rows={8} cols={7} />
    </div>
  );
}
