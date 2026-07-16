'use client';

import { useEffect, useState } from 'react';

export function WebhookUrl({ secret }: { secret: string }) {
  const [url, setUrl] = useState(`/api/leads/webhook/${secret}`);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/api/leads/webhook/${secret}`);
  }, [secret]);

  return (
    <button
      type="button"
      className="w-full truncate rounded-md border bg-muted px-2 py-1 text-left font-mono text-xs hover:bg-accent"
      title="Clique para copiar"
      onClick={() => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? 'Copiado!' : url}
    </button>
  );
}
