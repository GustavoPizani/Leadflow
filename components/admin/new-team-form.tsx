'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createTeamWithNewManager } from '@/lib/actions/teams';
import { TempPasswordReveal } from './temp-password-reveal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function NewTeamForm() {
  const router = useRouter();
  const [teamName, setTeamName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ name: string; email: string; password: string } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const { manager, tempPassword } = await createTeamWithNewManager({
        teamName,
        managerName,
        managerEmail,
      });
      setCreated({ name: manager.name, email: manager.email, password: tempPassword });
      setTeamName('');
      setManagerName('');
      setManagerEmail('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar equipe.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Nova equipe</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {created && (
          <TempPasswordReveal
            name={created.name}
            email={created.email}
            password={created.password}
            onDismiss={() => setCreated(null)}
          />
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-name">Nome da equipe</Label>
            <Input id="team-name" value={teamName} onChange={(e) => setTeamName(e.target.value)} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="manager-name">Nome do gestor</Label>
              <Input
                id="manager-name"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manager-email">E-mail do gestor</Label>
              <Input
                id="manager-email"
                type="email"
                value={managerEmail}
                onChange={(e) => setManagerEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Cria uma conta nova, exclusiva do Leadflow.</p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? 'Criando…' : 'Criar equipe'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
