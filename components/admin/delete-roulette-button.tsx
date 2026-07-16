'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { deleteRoulette } from '@/lib/actions/roulettes';

export function DeleteRouletteButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onClick() {
    if (!confirm(`Remover a roleta "${name}"?`)) return;
    const fd = new FormData();
    fd.set('id', id);
    startTransition(async () => {
      await deleteRoulette(fd);
      router.refresh();
    });
  }

  return (
    <Button type="button" variant="ghost" size="icon-sm" onClick={onClick} disabled={isPending}>
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}
