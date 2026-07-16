'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { addNewTeamMember, addExistingTeamMember } from '@/lib/actions/teams';
import { LocalUserPicker } from '@/components/local-user-picker';
import { TempPasswordReveal } from './temp-password-reveal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export function AddTeamMemberForm({ teamId }: { teamId: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ name: string; email: string; password: string } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const { member, tempPassword } = await addNewTeamMember({ teamId, name, email });
      setCreated({ name: member.name, email: member.email, password: tempPassword });
      setName('');
      setEmail('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar corretor.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      {created && (
        <TempPasswordReveal
          name={created.name}
          email={created.email}
          password={created.password}
          onDismiss={() => setCreated(null)}
        />
      )}

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor={`name-${teamId}`} className="text-xs">
            Novo corretor — nome
          </Label>
          <Input id={`name-${teamId}`} value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`email-${teamId}`} className="text-xs">
            E-mail
          </Label>
          <Input
            id={`email-${teamId}`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Criando…' : 'Cadastrar corretor'}
        </Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="space-y-1">
        <Label className="text-xs">Ou adicionar corretor já cadastrado no Leadflow</Label>
        <LocalUserPicker
          placeholder="Buscar corretor existente..."
          onSelect={(user) => {
            const fd = new FormData();
            fd.set('teamId', teamId);
            fd.set('userId', user.id);
            addExistingTeamMember(fd).then(() => router.refresh());
          }}
        />
      </div>
    </div>
  );
}
