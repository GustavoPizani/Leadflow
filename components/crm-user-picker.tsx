'use client';

import { useState, useTransition } from 'react';
import { searchCrmUsersAction } from '@/lib/actions/crm-users-search';
import { Input } from '@/components/ui/input';
import type { CrmUser } from '@/lib/crm-users';

export function CrmUserPicker({
  onSelect,
  placeholder = 'Buscar por nome ou e-mail...',
}: {
  onSelect: (user: CrmUser) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CrmUser[]>([]);
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
      const r = await searchCrmUsersAction(value);
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
              <span className="text-xs text-muted-foreground">
                {u.email} · {u.role}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
