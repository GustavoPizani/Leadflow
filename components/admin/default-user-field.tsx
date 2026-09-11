'use client';

import { useState } from 'react';
import { LocalUserPicker } from '@/components/local-user-picker';
import { Button } from '@/components/ui/button';
import type { LeadflowLocalUser } from '@prisma/client';

/** Campo de formulário nativo (participa do FormData via input hidden) que usa o LocalUserPicker para escolher o defaultUserId. */
export function DefaultUserField({ initial }: { initial?: { id: string; name: string; email: string } | null }) {
  const [selected, setSelected] = useState<LeadflowLocalUser | null>(
    initial
      ? {
          id: initial.id,
          name: initial.name,
          email: initial.email,
          role: 'CORRETOR',
          createdAt: new Date(),
        }
      : null,
  );

  return (
    <div>
      <input type="hidden" name="defaultUserId" value={selected?.id ?? ''} />
      {selected ? (
        <div className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm">
          <span>
            {selected.name} <span className="text-muted-foreground">({selected.email})</span>
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(null)}>
            Remover
          </Button>
        </div>
      ) : (
        <LocalUserPicker onSelect={setSelected} placeholder="Sem destinatário padrão (opcional)" />
      )}
    </div>
  );
}
