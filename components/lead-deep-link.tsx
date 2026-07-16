'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { getLeadForModal } from '@/lib/actions/leads';
import { LeadDetailModal, type LeadModalData } from './lead-detail-modal';

/**
 * Abre o modal de lead automaticamente quando a URL tem `?lead=<id>` — seja porque o usuário
 * clicou numa notificação push (o SW navega pra cá com esse parâmetro) ou clicou direto numa
 * linha da lista (que só precisa linkar pra `?lead=<id>`, sem lógica própria). Ao fechar, tira
 * o parâmetro da URL.
 */
export function LeadDeepLink({ variant }: { variant: 'simple' | 'full' }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const leadId = searchParams.get('lead');
  const [lead, setLead] = useState<LeadModalData | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!leadId) return;
    let cancelled = false;

    getLeadForModal(leadId)
      .then((data) => {
        if (cancelled) return;
        setLead(data);
        setOpen(true);
      })
      .catch(() => {
        if (!cancelled) setOpen(false);
      });

    return () => {
      cancelled = true;
    };
  }, [leadId]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) router.replace(pathname);
  }

  return <LeadDetailModal lead={lead} variant={variant} open={open} onOpenChange={handleOpenChange} />;
}
