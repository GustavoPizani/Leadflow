'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LocalUserPicker } from '@/components/local-user-picker';
import { reassignLead } from '@/lib/actions/leads';
import { Button } from '@/components/ui/button';

export function ReassignLead({ leadId }: { leadId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (!open) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        Reatribuir
      </Button>
    );
  }

  return (
    <div className="w-64">
      <LocalUserPicker
        placeholder="Buscar novo responsável..."
        onSelect={(user) => {
          const fd = new FormData();
          fd.set('leadId', leadId);
          fd.set('userId', user.id);
          startTransition(async () => {
            await reassignLead(fd);
            setOpen(false);
            router.refresh();
          });
        }}
      />
      {isPending && <p className="mt-1 text-xs text-muted-foreground">Salvando…</p>}
    </div>
  );
}
