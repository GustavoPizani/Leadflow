'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Shuffle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { saveRoulette } from '@/lib/actions/roulettes';

type LocalUser = { id: string; name: string; email: string };

type RouletteInitial = {
  id: string;
  name: string;
  isActive: boolean;
  validFrom: Date | null;
  validUntil: Date | null;
  memberIds: string[];
};

function toDatetimeLocal(d: Date | null): string {
  if (!d) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RouletteDialog({
  trigger,
  allUsers,
  roulette,
}: {
  trigger: React.ReactElement;
  allUsers: LocalUser[];
  roulette?: RouletteInitial;
}) {
  const router = useRouter();
  const isEdit = !!roulette;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(roulette?.name ?? '');
  const [isActive, setIsActive] = useState(roulette?.isActive ?? true);
  const [constante, setConstante] = useState(!roulette?.validFrom && !roulette?.validUntil);
  const [validFrom, setValidFrom] = useState(toDatetimeLocal(roulette?.validFrom ?? null));
  const [validUntil, setValidUntil] = useState(toDatetimeLocal(roulette?.validUntil ?? null));
  const [participantOrder, setParticipantOrder] = useState<LocalUser[]>(() =>
    allUsers.filter((u) => roulette?.memberIds.includes(u.id)),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetIfCreate() {
    if (isEdit) return;
    setName('');
    setIsActive(true);
    setConstante(true);
    setValidFrom('');
    setValidUntil('');
    setParticipantOrder([]);
    setError(null);
  }

  function toggleParticipant(user: LocalUser) {
    setParticipantOrder((prev) =>
      prev.some((p) => p.id === user.id) ? prev.filter((p) => p.id !== user.id) : [...prev, user],
    );
  }

  function shuffleParticipants() {
    setParticipantOrder((prev) => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  }

  function submit() {
    if (!name.trim()) {
      setError('Nome é obrigatório.');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await saveRoulette({
          id: roulette?.id,
          name,
          isActive,
          constante,
          validFrom: validFrom || null,
          validUntil: validUntil || null,
          memberIds: participantOrder.map((p) => p.id),
        });
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao salvar roleta.');
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next: boolean) => {
        setOpen(next);
        if (!next) resetIfCreate();
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[85vh] w-[95vw] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar roleta' : 'Nova roleta'}</DialogTitle>
          <DialogDescription>
            Defina o nome, o período de validade e quem participa do rodízio.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="roulette-name">Nome</Label>
            <Input id="roulette-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
            <div>
              <Label htmlFor="roulette-constante">Roleta constante (24h)</Label>
              <p className="text-xs text-muted-foreground">
                Desligue para definir um período de validade (data/hora de início e fim).
              </p>
            </div>
            <Switch id="roulette-constante" checked={constante} onCheckedChange={setConstante} />
          </div>

          {!constante && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Válida a partir de</Label>
                <Input type="datetime-local" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Válida até</Label>
                <Input type="datetime-local" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
              </div>
            </div>
          )}

          {isEdit && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="roulette-active">Roleta ativa</Label>
              <Switch id="roulette-active" checked={isActive} onCheckedChange={setIsActive} />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Corretores nesta roleta</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={shuffleParticipants}
                disabled={participantOrder.length < 2}
              >
                <Shuffle className="mr-1.5 h-3.5 w-3.5" />
                Embaralhar
              </Button>
            </div>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
              {allUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`participant_${user.id}`}
                    checked={participantOrder.some((p) => p.id === user.id)}
                    onChange={() => toggleParticipant(user)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <label htmlFor={`participant_${user.id}`} className="text-sm">
                    {user.name} <span className="text-muted-foreground">({user.email})</span>
                  </label>
                </div>
              ))}
              {allUsers.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum corretor cadastrado ainda — crie uma equipe em /admin/equipes primeiro.
                </p>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={submit} disabled={isPending}>
            {isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {isEdit ? 'Salvar alterações' : 'Criar roleta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
