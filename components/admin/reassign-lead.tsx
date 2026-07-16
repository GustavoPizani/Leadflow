'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LocalUserPicker } from '@/components/local-user-picker';
import { reassignLead } from '@/lib/actions/leads';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';

export function ReassignLead({ leadId, leadName }: { leadId: string; leadName?: string | null }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" size="sm" variant="outline" />}>Reatribuir</DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Reatribuir lead</DialogTitle>
          <DialogDescription>
            {leadName ? `Escolha o novo responsável por "${leadName}".` : 'Escolha o novo responsável.'}
          </DialogDescription>
        </DialogHeader>

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
        {isPending && <p className="text-xs text-muted-foreground">Salvando…</p>}
      </DialogContent>
    </Dialog>
  );
}
