'use client';

import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { getLeadForModal } from '@/lib/actions/leads';

export type LeadModalData = Awaited<ReturnType<typeof getLeadForModal>>;

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

function buildWhatsAppMessage(lead: LeadModalData) {
  const lines = [
    `Lead: ${lead.fullName ?? 'Sem nome'}`,
    lead.email ? `E-mail: ${lead.email}` : null,
    lead.phone ? `Telefone: ${lead.phone}` : null,
    `Origem: ${lead.formName ?? lead.source}`,
    lead.notes ? `Observação: ${lead.notes}` : null,
    ...Object.entries(lead.responses).map(([key, value]) => `${key}: ${value}`),
  ].filter((line): line is string => !!line);
  return lines.join('\n');
}

export function LeadDetailModal({
  lead,
  variant,
  open,
  onOpenChange,
}: {
  lead: LeadModalData | null;
  variant: 'simple' | 'full';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  function shareOnWhatsApp() {
    if (!lead) return;
    const text = buildWhatsAppMessage(lead);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-[95vw] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{lead?.fullName ?? 'Lead'}</DialogTitle>
          <DialogDescription>
            {variant === 'full' ? 'Dados e respostas do lead.' : 'Resumo da distribuição deste lead.'}
          </DialogDescription>
        </DialogHeader>

        {lead && (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={lead.status === 'ASSIGNED' ? 'default' : lead.status === 'ERROR' ? 'destructive' : 'secondary'}>
                {lead.status}
              </Badge>
              <Badge variant="outline">{lead.formName ?? lead.source}</Badge>
            </div>

            {variant === 'full' && (
              <div className="space-y-1 text-muted-foreground">
                {lead.email && <p>E-mail: {lead.email}</p>}
                {lead.phone && <p>Telefone: {lead.phone}</p>}
                {lead.notes && (
                  <p className="break-words">
                    <span className="text-foreground">Observação:</span> {lead.notes}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1 text-muted-foreground">
              <p>
                Corretor: {lead.assignedUserName ? `${lead.assignedUserName} (${lead.assignedUserEmail})` : '—'}
              </p>
              <p>Recebido em: {formatDate(lead.createdAt)}</p>
              <p>Atribuído em: {formatDate(lead.assignedAt)}</p>
            </div>

            {variant === 'full' && Object.keys(lead.responses).length > 0 && (
              <div className="space-y-1 rounded-md border p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Respostas do formulário
                </p>
                {Object.entries(lead.responses).map(([key, value]) => (
                  <p key={key} className="break-words">
                    <span className="text-muted-foreground">{key}:</span> {value}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {variant === 'full' && (
          <DialogFooter>
            <Button type="button" onClick={shareOnWhatsApp} disabled={!lead}>
              <MessageCircle className="mr-1.5 h-4 w-4" />
              Compartilhar no WhatsApp
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
