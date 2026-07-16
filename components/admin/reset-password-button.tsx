'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { TempPasswordReveal } from './temp-password-reveal';
import { resetTeamMemberPassword } from '@/lib/actions/teams';

export function ResetPasswordButton({ userId, name, email }: { userId: string; name: string; email: string }) {
  const [isPending, startTransition] = useTransition();
  const [revealed, setRevealed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    if (!confirm(`Gerar uma nova senha temporária para ${name}?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        const { tempPassword } = await resetTeamMemberPassword(userId);
        setRevealed(tempPassword);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao redefinir senha.');
      }
    });
  }

  if (revealed) {
    return <TempPasswordReveal name={name} email={email} password={revealed} onDismiss={() => setRevealed(null)} />;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" size="sm" variant="ghost" onClick={onClick} disabled={isPending}>
        {isPending ? 'Gerando...' : 'Resetar senha'}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
