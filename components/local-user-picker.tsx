'use client';

import { useState, useTransition } from 'react';
import { searchLocalUsersAction } from '@/lib/actions/local-users-search';
import { Input } from '@/components/ui/input';
import type { LeadflowLocalUser } from '@prisma/client';

export function LocalUserPicker({
  onSelect,
  placeholder = 'Buscar corretor já cadastrado no Leadflow...',
}: {
  onSelect: (user: LeadflowLocalUser) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LeadflowLocalUser[]>([]);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    setQuery(value);
    setOpen(true);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    startTransition(async () => {
      const r = await searchLocalUsersAction(value);
      setResults(r);
    });
  }

  return (
    <div className="relative">
      <Input
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
      />
      {open && query.trim() && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover shadow-md">
          {isPending && <div className="p-2 text-sm text-muted-foreground">Buscando…</div>}
          {!isPending && results.length === 0 && (
            <div className="p-2 text-sm text-muted-foreground">Nenhum usuário encontrado.</div>
          )}
          {results.map((u) => (
            <button
              key={u.id}
              type="button"
              className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-accent"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelect(u);
                setQuery('');
                setResults([]);
                setOpen(false);
              }}
            >
              <span className="font-medium">{u.name}</span>
              <span className="text-xs text-muted-foreground">{u.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
