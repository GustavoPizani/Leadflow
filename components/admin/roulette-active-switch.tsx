'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import { toggleRouletteActive } from '@/lib/actions/roulettes';

export function RouletteActiveSwitch({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onChange() {
    const fd = new FormData();
    fd.set('id', id);
    fd.set('isActive', String(isActive));
    startTransition(async () => {
      await toggleRouletteActive(fd);
      router.refresh();
    });
  }

  return <Switch checked={isActive} onCheckedChange={onChange} disabled={isPending} />;
}
