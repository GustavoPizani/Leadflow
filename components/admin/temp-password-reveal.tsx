'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function TempPasswordReveal({
  name,
  email,
  password,
  onDismiss,
}: {
  name: string;
  email: string;
  password: string;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="glow-brand space-y-2 rounded-xl border border-sky-400/30 bg-sky-500/10 p-4 text-sm">
      <p className="font-medium">
        Conta criada para {name} ({email})
      </p>
      <p className="text-muted-foreground">
        Senha temporária — compartilhe com a pessoa agora. Ela não será mostrada de novo.
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded-md border bg-background/60 px-2 py-1 font-mono text-sm">
          {password}
        </code>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText(password);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? 'Copiado!' : 'Copiar'}
        </Button>
      </div>
      <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
        Ok, já anotei
      </Button>
    </div>
  );
}
