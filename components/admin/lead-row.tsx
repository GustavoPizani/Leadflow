'use client';

import { useRouter } from 'next/navigation';
import { TableRow } from '@/components/ui/table';

/** Linha de tabela clicável — navega pra `?lead=<id>` (abre o modal via LeadDeepLink). */
export function LeadRow({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter();

  return (
    <TableRow className="cursor-pointer" onClick={() => router.push(href, { scroll: false })}>
      {children}
    </TableRow>
  );
}

/** Impede que cliques em botões/menus dentro da célula de ações também disparem o clique da linha. */
export function RowActionGuard({ children }: { children: React.ReactNode }) {
  return (
    <div className="contents" onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  );
}
