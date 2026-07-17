'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

function buildLoginLink() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/login`;
}

function buildMessage(name: string, email: string, password: string) {
  return [
    `Olá ${name}! Seu acesso ao Leadflow foi criado.`,
    `Link: ${buildLoginLink()}`,
    `E-mail: ${email}`,
    `Senha: ${password}`,
    'Ao entrar, você vai precisar trocar essa senha.',
  ].join('\n');
}

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
  const message = buildMessage(name, email, password);

  function copyMessage() {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="glow-brand space-y-2 rounded-xl border border-sky-400/30 bg-sky-500/10 p-4 text-sm">
      <p className="font-medium">
        Conta criada para {name} ({email})
      </p>
      <p className="text-muted-foreground">
        Copie a mensagem abaixo e envie pra pessoa agora — a senha não será mostrada de novo.
      </p>
      <textarea
        readOnly
        value={message}
        rows={5}
        className="w-full resize-none rounded-md border bg-background/60 px-2 py-1.5 font-mono text-xs"
        onFocus={(e) => e.currentTarget.select()}
      />
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={copyMessage}>
          {copied ? 'Copiado!' : 'Copiar mensagem'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
          Ok, já anotei
        </Button>
      </div>
    </div>
  );
}
