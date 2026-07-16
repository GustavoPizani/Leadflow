import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'blue',
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: 'blue' | 'emerald' | 'amber' | 'rose';
}) {
  const toneClasses: Record<string, string> = {
    blue: 'from-sky-500/25 to-blue-600/10 text-sky-300 ring-sky-400/20',
    emerald: 'from-emerald-500/25 to-teal-500/10 text-emerald-300 ring-emerald-400/20',
    amber: 'from-amber-500/25 to-orange-500/10 text-amber-300 ring-amber-400/20',
    rose: 'from-rose-500/25 to-red-500/10 text-rose-300 ring-rose-400/20',
  };

  return (
    <Card className="glow-brand">
      <CardContent className="flex items-center gap-4">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1',
            toneClasses[tone],
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-semibold leading-none">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
